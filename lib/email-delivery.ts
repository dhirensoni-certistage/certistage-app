import mongoose from "mongoose"
import Recipient from "@/models/Recipient"
import User from "@/models/User"
import { getPlanLimits, usagePeriodKey } from "@/lib/plan-limits"
import { renderCertificateEmail } from "@/lib/email"
import EmailDelivery from "@/models/EmailDelivery"

/**
 * Certificate emails to recipients, sent on the organizer's behalf.
 *
 * Organizers may send as often as they like; what they spend is emails:
 * - plan emails: EMAILS_PER_CERTIFICATE x the plan's certificate limit, per plan period
 * - then add-on credits (User.emailCredits), which never expire
 * Who gets an email in one run:
 * - "new": people never emailed
 * - "pending": people who have not downloaded yet (emailed before or not)
 * - "all": everyone with an email address
 * Within one run nobody is emailed twice (Recipient.lastEmailRun), and an address that failed
 * is skipped until the organizer corrects it. Every attempt is written to the Email log.
 *
 * Provider: ZeptoMail when ZEPTOMAIL_TOKEN is set (~Rs 1.5 per 100 emails). Without it, Brevo,
 * capped per day so OTP and account emails keep their share of Brevo's free quota.
 */
export const EMAILS_PER_CERTIFICATE = 3
export const BATCH_SIZE = 25

export type DeliveryMode = "new" | "pending" | "all"
export const isDeliveryMode = (v: unknown): v is DeliveryMode => v === "new" || v === "pending" || v === "all"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

export function emailProvider(): "zeptomail" | "brevo" | null {
  if (process.env.ZEPTOMAIL_TOKEN) return "zeptomail"
  if (process.env.BREVO_API_KEY) return "brevo"
  return null
}

/** Per-account daily cap; only applies on the Brevo fallback unless CERT_EMAIL_DAILY_CAP is set */
export function dailyCap(): number | null {
  const fromEnv = Number(process.env.CERT_EMAIL_DAILY_CAP)
  if (Number.isFinite(fromEnv) && fromEnv > 0) return fromEnv
  return emailProvider() === "brevo" ? 100 : null
}

const today = () => new Date().toISOString().slice(0, 10)

// --- Who can be emailed --------------------------------------------------------------------

export function recipientScope(eventId: string, typeId?: string | null): Record<string, unknown> {
  const scope: Record<string, unknown> = {
    eventId: new mongoose.Types.ObjectId(eventId),
    email: { $regex: /@/ },
    // A failed address waits until the organizer corrects it (editing the email resets this)
    lastEmailStatus: { $ne: "failed" }
  }
  if (typeId) scope.certificateTypeId = new mongoose.Types.ObjectId(typeId)
  return scope
}

export function eligibleFilter(mode: DeliveryMode, runId?: string): Record<string, unknown> {
  const notThisRun = runId ? { lastEmailRun: { $ne: runId } } : {}
  if (mode === "new") return { $or: [{ emailCount: { $exists: false } }, { emailCount: 0 }], ...notThisRun }
  if (mode === "pending") return { downloadCount: { $in: [0, null] }, ...notThisRun }
  return notThisRun
}

// --- Account quota -------------------------------------------------------------------------

export interface EmailQuota {
  planUsed: number
  planLimit: number // -1 = no plan limit
  planRemaining: number // -1 = no plan limit
  credits: number // add-on emails left
  remaining: number // -1 = no limit
  todayUsed: number
  todayCap: number | null
}

export async function emailQuota(userId: string): Promise<EmailQuota> {
  const user = await User.findById(userId).select("plan planExpiresAt emailUsage emailDay emailCredits").lean<{
    plan?: string
    planExpiresAt?: Date
    emailUsage?: { key?: string; sent?: number }
    emailDay?: { day?: string; sent?: number }
    emailCredits?: number
  }>()
  const limits = await getPlanLimits(user?.plan || "free")
  const key = usagePeriodKey({ plan: user?.plan, planExpiresAt: user?.planExpiresAt })
  const planUsed = user?.emailUsage?.key === key ? user.emailUsage.sent || 0 : 0
  const planLimit = limits.maxCertificates === -1 ? -1 : limits.maxCertificates * EMAILS_PER_CERTIFICATE
  const planRemaining = planLimit === -1 ? -1 : Math.max(0, planLimit - planUsed)
  const credits = Math.max(0, user?.emailCredits || 0)
  return {
    planUsed,
    planLimit,
    planRemaining,
    credits,
    remaining: planRemaining === -1 ? -1 : planRemaining + credits,
    todayUsed: user?.emailDay?.day === today() ? user.emailDay.sent || 0 : 0,
    todayCap: dailyCap()
  }
}

/** Counts sent emails against the plan first, then against add-on credits */
async function recordSent(userId: string, count: number) {
  if (count <= 0) return
  const user = await User.findById(userId).select("plan planExpiresAt emailUsage emailDay emailCredits")
  if (!user) return
  const quota = await emailQuota(userId)
  const fromPlan = quota.planRemaining === -1 ? count : Math.min(count, quota.planRemaining)
  const fromCredits = count - fromPlan
  const key = usagePeriodKey(user)
  const day = today()
  const emailUsage = { key, sent: quota.planUsed + fromPlan }
  const emailDay = user.emailDay?.day === day ? { day, sent: (user.emailDay.sent || 0) + count } : { day, sent: count }
  await User.updateOne(
    { _id: user._id },
    { $set: { emailUsage, emailDay }, ...(fromCredits > 0 ? { $inc: { emailCredits: -fromCredits } } : {}) }
  )
}

// --- Sending -------------------------------------------------------------------------------

interface OutgoingEmail {
  to: string
  toName: string
  subject: string
  html: string
  fromName: string
  replyTo?: string
  reference: string // Email log id, echoed back by the provider's webhook
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
        htmlbody: mail.html,
        client_reference: mail.reference,
        // Opens and clicks are tracked by CertiStage itself (app/api/e)
        track_opens: false,
        track_clicks: false
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
        tags: ["certificate_delivery"],
        // Brevo returns this in webhook events as "X-Mailin-custom"
        headers: { "X-Mailin-custom": mail.reference }
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
  runId: string
  eventName: string
  issuer: string
  replyTo?: string
  typeNames: Map<string, string>
}

/**
 * Sends one batch. Each recipient is claimed with an atomic update before sending, so two tabs
 * clicking at once cannot email the same person twice in a run.
 */
export async function sendBatch(ctx: BatchContext, mode: DeliveryMode, max: number): Promise<{ sent: number; failed: number }> {
  const now = new Date()
  const filter = { ...recipientScope(ctx.eventId, ctx.typeId), ...eligibleFilter(mode, ctx.runId) }
  const candidates = await Recipient.find(filter)
    .select("_id")
    .sort({ _id: 1 })
    .limit(Math.max(0, Math.min(max, BATCH_SIZE)))
    .lean<{ _id: mongoose.Types.ObjectId }[]>()

  const provider = emailProvider() || ""
  let sent = 0
  let failed = 0
  const queue = [...candidates]
  const worker = async () => {
    for (let next = queue.shift(); next; next = queue.shift()) {
      const claimed = await Recipient.findOneAndUpdate(
        { _id: next._id, ...filter },
        { $inc: { emailCount: 1 }, $set: { lastEmailedAt: now, lastEmailStatus: "sending", lastEmailRun: ctx.runId } },
        { new: true }
      ).lean<{ _id: mongoose.Types.ObjectId; name: string; email: string; regNo?: string; emailCount: number; certificateTypeId: mongoose.Types.ObjectId }>()
      if (!claimed) continue

      const typeId = String(claimed.certificateTypeId)
      const link = claimed.regNo
        ? `${APP_URL}/download?event=${ctx.eventId}&cert=${encodeURIComponent(claimed.regNo)}`
        : `${APP_URL}/download/${ctx.eventId}/${typeId}`
      // Someone emailed before gets the reminder wording
      const reminder = claimed.emailCount > 1
      const to = claimed.email.trim()
      const log = await EmailDelivery.create({
        ownerId: ctx.userId,
        eventId: ctx.eventId,
        certificateTypeId: claimed.certificateTypeId,
        recipientId: claimed._id,
        runId: ctx.runId,
        to,
        recipientName: claimed.name,
        kind: reminder ? "reminder" : "certificate",
        link,
        status: "sending",
        provider
      })
      const id = String(log._id)
      const { subject, html } = renderCertificateEmail({
        recipientName: claimed.name,
        eventName: ctx.eventName,
        certificateName: ctx.typeNames.get(typeId) || "participation",
        issuer: ctx.issuer,
        link: `${APP_URL}/api/e/c/${id}`,
        linkedinUrl: `${APP_URL}/api/download/linkedin?r=${String(claimed._id)}`,
        reminder,
        openPixel: `${APP_URL}/api/e/o/${id}`
      })
      const result = await deliver({ to, toName: claimed.name, subject, html, fromName: senderName(ctx.issuer), replyTo: ctx.replyTo, reference: id })

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
      await EmailDelivery.updateOne({ _id: log._id }, { $set: { subject, sentAt: new Date() } })
      // A webhook may already have moved the status on; only settle "sending"
      await EmailDelivery.updateOne(
        { _id: log._id, status: "sending" },
        { $set: { status: result.ok ? "sent" : "failed", ...(result.ok ? {} : { error: String(result.error).slice(0, 300) }) } }
      )
    }
  }
  await Promise.all(Array.from({ length: 5 }, worker))
  await recordSent(ctx.userId, sent)
  return { sent, failed }
}

/** Counts for the "Email certificates" dialog; with a runId, also who is still due in that run */
export async function deliveryStats(eventId: string, typeId?: string | null, runId?: string) {
  const base = { eventId: new mongoose.Types.ObjectId(eventId), ...(typeId ? { certificateTypeId: new mongoose.Types.ObjectId(typeId) } : {}) }
  const withAddress = { ...base, email: { $regex: /@/ } }
  const scope = recipientScope(eventId, typeId)
  const [total, withEmail, notEmailed, pending, all, emailed, failed, pendingInRun, allInRun] = await Promise.all([
    Recipient.countDocuments(base),
    Recipient.countDocuments(withAddress),
    Recipient.countDocuments({ ...scope, ...eligibleFilter("new") }),
    Recipient.countDocuments({ ...scope, ...eligibleFilter("pending") }),
    Recipient.countDocuments(scope),
    Recipient.countDocuments({ ...withAddress, emailCount: { $gte: 1 } }),
    Recipient.countDocuments({ ...withAddress, lastEmailStatus: "failed" }),
    runId ? Recipient.countDocuments({ ...scope, ...eligibleFilter("pending", runId) }) : Promise.resolve(0),
    runId ? Recipient.countDocuments({ ...scope, ...eligibleFilter("all", runId) }) : Promise.resolve(0)
  ])
  return { total, withEmail, noEmail: total - withEmail, notEmailed, pending, all, emailed, failed, pendingInRun, allInRun }
}
