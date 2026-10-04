import mongoose from "mongoose"
import Recipient from "@/models/Recipient"
import User from "@/models/User"
import { getPlanLimits, usagePeriodKey } from "@/lib/plan-limits"
import { renderCertificateEmail } from "@/lib/email"

/**
 * Certificate emails to recipients, sent on the organizer's behalf.
 *
 * Rules (keep cost and spam risk bounded however often an organizer clicks):
 * - "new": everyone with an email address who has not been emailed yet
 * - "reminder": only people who have not downloaded, at most MAX_PER_RECIPIENT emails in all,
 *   at least MIN_GAP_HOURS apart
 * - plan quota: EMAILS_PER_CERTIFICATE x the plan's certificate limit, per plan period
 * - daily cap per account
 *
 * Provider: ZeptoMail when ZEPTOMAIL_TOKEN is set (bulk-friendly, ~Rs 1.5 per 100 emails),
 * otherwise Brevo with a small daily cap so OTP and account emails keep their share of
 * Brevo's free quota.
 */
export const EMAILS_PER_CERTIFICATE = 3
export const MAX_PER_RECIPIENT = 3
export const MIN_GAP_HOURS = 24
export const BATCH_SIZE = 25

export type DeliveryMode = "new" | "reminder"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

export function emailProvider(): "zeptomail" | "brevo" | null {
  if (process.env.ZEPTOMAIL_TOKEN) return "zeptomail"
  if (process.env.BREVO_API_KEY) return "brevo"
  return null
}

export function dailyCap(): number {
  const fromEnv = Number(process.env.CERT_EMAIL_DAILY_CAP)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return emailProvider() === "zeptomail" ? 2000 : 100
}

const today = () => new Date().toISOString().slice(0, 10)

// --- Who can be emailed --------------------------------------------------------------------

export function recipientScope(eventId: string, typeId?: string | null): Record<string, unknown> {
  const scope: Record<string, unknown> = {
    eventId: new mongoose.Types.ObjectId(eventId),
    email: { $regex: /@/ }
  }
  if (typeId) scope.certificateTypeId = new mongoose.Types.ObjectId(typeId)
  return scope
}

export function eligibleFilter(mode: DeliveryMode, now = new Date()): Record<string, unknown> {
  if (mode === "new") {
    // A failed address waits until the organizer corrects it (editing the email resets this)
    return { $or: [{ emailCount: { $exists: false } }, { emailCount: 0 }], lastEmailStatus: { $ne: "failed" } }
  }
  return {
    downloadCount: { $in: [0, null] },
    emailCount: { $gte: 1, $lt: MAX_PER_RECIPIENT },
    // "sending" only remains if a send was cut off; treat it as sent after the gap
    lastEmailStatus: { $in: ["sent", "sending"] },
    lastEmailedAt: { $lte: new Date(now.getTime() - MIN_GAP_HOURS * 3600 * 1000) }
  }
}

// --- Account quota -------------------------------------------------------------------------

export async function emailQuota(userId: string): Promise<{
  used: number
  limit: number // -1 = no plan limit
  remaining: number // -1 = no plan limit
  todayUsed: number
  todayCap: number
}> {
  const user = await User.findById(userId).select("plan planExpiresAt emailUsage emailDay").lean<{
    plan?: string
    planExpiresAt?: Date
    emailUsage?: { key?: string; sent?: number }
    emailDay?: { day?: string; sent?: number }
  }>()
  const limits = await getPlanLimits(user?.plan || "free")
  const key = usagePeriodKey({ plan: user?.plan, planExpiresAt: user?.planExpiresAt })
  const used = user?.emailUsage?.key === key ? user.emailUsage.sent || 0 : 0
  const limit = limits.maxCertificates === -1 ? -1 : limits.maxCertificates * EMAILS_PER_CERTIFICATE
  const todayUsed = user?.emailDay?.day === today() ? user.emailDay.sent || 0 : 0
  return {
    used,
    limit,
    remaining: limit === -1 ? -1 : Math.max(0, limit - used),
    todayUsed,
    todayCap: dailyCap()
  }
}

async function recordSent(userId: string, count: number) {
  if (count <= 0) return
  const user = await User.findById(userId).select("plan planExpiresAt emailUsage emailDay")
  if (!user) return
  const key = usagePeriodKey(user)
  const day = today()
  const emailUsage = user.emailUsage?.key === key ? { key, sent: (user.emailUsage.sent || 0) + count } : { key, sent: count }
  const emailDay = user.emailDay?.day === day ? { day, sent: (user.emailDay.sent || 0) + count } : { day, sent: count }
  await User.updateOne({ _id: user._id }, { $set: { emailUsage, emailDay } })
}

// --- Sending -------------------------------------------------------------------------------

interface OutgoingEmail {
  to: string
  toName: string
  subject: string
  html: string
  fromName: string
  replyTo?: string
}

async function sendViaZeptoMail(mail: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  const raw = process.env.ZEPTOMAIL_TOKEN || ""
  const auth = raw.startsWith("Zoho-enczapikey") ? raw : `Zoho-enczapikey ${raw}`
  const from = process.env.ZEPTOMAIL_FROM_EMAIL || process.env.BREVO_FROM_EMAIL || "noreply@certistage.com"
  const url = process.env.ZEPTOMAIL_API_URL || "https://api.zeptomail.in/v1.1/email"
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        from: { address: from, name: mail.fromName },
        to: [{ email_address: { address: mail.to, name: mail.toName } }],
        ...(mail.replyTo ? { reply_to: [{ address: mail.replyTo }] } : {}),
        subject: mail.subject,
        htmlbody: mail.html
      })
    })
    if (res.ok) return { ok: true }
    const data = await res.json().catch(() => ({}))
    const detail = data?.error?.details?.[0]?.message || data?.error?.message || data?.message
    return { ok: false, error: detail || `ZeptoMail responded ${res.status}` }
  } catch (error: any) {
    return { ok: false, error: error?.message || "ZeptoMail request failed" }
  }
}

async function sendViaBrevo(mail: OutgoingEmail): Promise<{ ok: boolean; error?: string }> {
  const { brevoSender } = await import("@/lib/email-brevo")
  const sender = brevoSender()
  if (!sender || !process.env.BREVO_API_KEY) return { ok: false, error: "Brevo not configured" }
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": process.env.BREVO_API_KEY, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        sender: { email: sender.email, name: mail.fromName },
        to: [{ email: mail.to, name: mail.toName }],
        ...(mail.replyTo ? { replyTo: { email: mail.replyTo } } : {}),
        subject: mail.subject,
        htmlContent: mail.html,
        tags: ["certificate_delivery"]
      })
    })
    if (res.ok) return { ok: true }
    const data = await res.json().catch(() => ({}))
    return { ok: false, error: data?.message || `Brevo responded ${res.status}` }
  } catch (error: any) {
    return { ok: false, error: error?.message || "Brevo request failed" }
  }
}

function deliver(mail: OutgoingEmail) {
  return emailProvider() === "zeptomail" ? sendViaZeptoMail(mail) : sendViaBrevo(mail)
}

/** "Dr. Shah Eye Society via CertiStage", kept short and free of characters that break headers */
function senderName(issuer: string): string {
  const clean = issuer.replace(/["<>\r\n]/g, "").trim().slice(0, 60)
  return clean ? `${clean} via CertiStage` : "CertiStage"
}

export interface BatchContext {
  userId: string
  eventId: string
  typeId?: string | null
  eventName: string
  issuer: string
  replyTo?: string
  typeNames: Map<string, string>
}

/**
 * Sends one batch. Each recipient is claimed with an atomic update before sending, so two tabs
 * clicking at once cannot email the same person twice.
 */
export async function sendBatch(ctx: BatchContext, mode: DeliveryMode, max: number): Promise<{ sent: number; failed: number }> {
  const now = new Date()
  const filter = { ...recipientScope(ctx.eventId, ctx.typeId), ...eligibleFilter(mode, now) }
  const candidates = await Recipient.find(filter)
    .select("_id")
    .sort({ _id: 1 })
    .limit(Math.max(0, Math.min(max, BATCH_SIZE)))
    .lean<{ _id: mongoose.Types.ObjectId }[]>()

  let sent = 0
  let failed = 0
  const queue = [...candidates]
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const claimed = await Recipient.findOneAndUpdate(
        { _id: next._id, ...filter },
        { $inc: { emailCount: 1 }, $set: { lastEmailedAt: now, lastEmailStatus: "sending" } },
        { new: true }
      ).lean<{ _id: mongoose.Types.ObjectId; name: string; email: string; regNo?: string; certificateTypeId: mongoose.Types.ObjectId }>()
      if (!claimed) continue

      const typeId = String(claimed.certificateTypeId)
      const link = claimed.regNo
        ? `${APP_URL}/download?event=${ctx.eventId}&cert=${encodeURIComponent(claimed.regNo)}`
        : `${APP_URL}/download/${ctx.eventId}/${typeId}`
      const { subject, html } = renderCertificateEmail({
        recipientName: claimed.name,
        eventName: ctx.eventName,
        certificateName: ctx.typeNames.get(typeId) || "participation",
        issuer: ctx.issuer,
        link,
        reminder: mode === "reminder"
      })
      const result = await deliver({
        to: claimed.email.trim(),
        toName: claimed.name,
        subject,
        html,
        fromName: senderName(ctx.issuer),
        replyTo: ctx.replyTo
      })

      if (result.ok) {
        sent++
        await Recipient.updateOne({ _id: claimed._id }, { $set: { lastEmailStatus: "sent" }, $unset: { lastEmailError: 1 } })
      } else {
        failed++
        await Recipient.updateOne(
          { _id: claimed._id },
          { $inc: { emailCount: -1 }, $set: { lastEmailStatus: "failed", lastEmailError: String(result.error).slice(0, 300) } }
        )
      }
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker))
  await recordSent(ctx.userId, sent)
  return { sent, failed }
}

/** Counts for the "Email certificates" dialog */
export async function deliveryStats(eventId: string, typeId?: string | null) {
  const base = { eventId: new mongoose.Types.ObjectId(eventId), ...(typeId ? { certificateTypeId: new mongoose.Types.ObjectId(typeId) } : {}) }
  const scope = recipientScope(eventId, typeId)
  const [total, withEmail, notEmailed, reminder, emailed, failed] = await Promise.all([
    Recipient.countDocuments(base),
    Recipient.countDocuments(scope),
    Recipient.countDocuments({ ...scope, ...eligibleFilter("new") }),
    Recipient.countDocuments({ ...scope, ...eligibleFilter("reminder") }),
    Recipient.countDocuments({ ...scope, emailCount: { $gte: 1 } }),
    Recipient.countDocuments({ ...scope, lastEmailStatus: "failed" })
  ])
  return { total, withEmail, noEmail: total - withEmail, notEmailed, reminder, emailed, failed }
}
