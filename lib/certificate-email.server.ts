// Certificate emails: an organiser sends every recipient (who has an email) a
// link to their own certificate, with "Add to LinkedIn profile" in the mail.
//
// Delivery is optional. The pull model (search your name, download) stays the
// default; this exists for organisers whose Excel has usable email addresses.
//
// Sending runs in batches so it fits a serverless request: the browser calls
// POST /api/client/recipients/email repeatedly until `remaining` is 0. With
// Brevo configured a batch is one API call (messageVersions); with SendGrid or
// SMTP it is one send per recipient.
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"
import CertificateType from "@/models/CertificateType"
import Event from "@/models/Event"
import User from "@/models/User"
import EmailLog from "@/models/EmailLog"
import { sendEmail, certificateEmail } from "@/lib/email"
import { sendBatchViaBrevo, type BrevoBatchMessage } from "@/lib/email-brevo"
import { individualCertificateUrl } from "@/lib/linkedin"

export const CERTIFICATE_EMAIL_BATCH = 50
export const CERTIFICATE_EMAIL_TEMPLATE = "certificate"

export type CertificateEmailMode = "unsent" | "all" | "selected"

export interface CertificateEmailScope {
  eventId: string
  certificateTypeId?: string | null
  mode: CertificateEmailMode
  recipientIds?: string[]
  /** Start of this send run: recipients already tried after this moment are skipped */
  since?: Date
}

export interface CertificateEmailCounts {
  total: number
  withEmail: number
  noEmail: number
  sent: number
  failed: number
  unsent: number
}

const EMAIL_SHAPE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function baseQuery(scope: Pick<CertificateEmailScope, "eventId" | "certificateTypeId">): Record<string, unknown> {
  const q: Record<string, unknown> = { eventId: new mongoose.Types.ObjectId(scope.eventId) }
  if (scope.certificateTypeId) q.certificateTypeId = new mongoose.Types.ObjectId(scope.certificateTypeId)
  return q
}

function scopeQuery(scope: CertificateEmailScope): Record<string, unknown> {
  const q = baseQuery(scope)
  q.email = { $nin: [null, ""] }
  if (scope.mode === "selected") {
    q._id = { $in: (scope.recipientIds || []).filter((id) => mongoose.isValidObjectId(id)).map((id) => new mongoose.Types.ObjectId(id)) }
  } else if (scope.mode === "unsent") {
    q.emailStatus = { $ne: "sent" }
  }
  if (scope.since) {
    q.$or = [{ emailAttemptAt: { $exists: false } }, { emailAttemptAt: null }, { emailAttemptAt: { $lt: scope.since } }]
  }
  return q
}

export async function countCertificateEmails(scope: Pick<CertificateEmailScope, "eventId" | "certificateTypeId">): Promise<CertificateEmailCounts> {
  await connectDB()
  const base = baseQuery(scope)
  const withEmailQuery = { ...base, email: { $nin: [null, ""] } }
  const [total, withEmail, sent, failed] = await Promise.all([
    Recipient.countDocuments(base),
    Recipient.countDocuments(withEmailQuery),
    Recipient.countDocuments({ ...withEmailQuery, emailStatus: "sent" }),
    Recipient.countDocuments({ ...withEmailQuery, emailStatus: "failed" })
  ])
  return { total, withEmail, noEmail: total - withEmail, sent, failed, unsent: withEmail - sent }
}

export interface CertificateEmailBatchResult {
  processed: number
  sent: number
  failed: number
  remaining: number
  /** Set when the whole batch failed for one reason (provider down, not configured) */
  error?: string
}

interface LeanRecipient {
  _id: mongoose.Types.ObjectId
  name: string
  email?: string
  regNo?: string
  certificateTypeId: mongoose.Types.ObjectId
}

/** Send one batch for the scope and record the outcome on each recipient. */
export async function sendCertificateEmailBatch(
  scope: CertificateEmailScope,
  options: { origin: string; userId: string; batchSize?: number }
): Promise<CertificateEmailBatchResult> {
  await connectDB()
  const batchSize = Math.min(Math.max(options.batchSize || CERTIFICATE_EMAIL_BATCH, 1), 200)
  const origin = (process.env.NEXT_PUBLIC_APP_URL || options.origin).replace(/\/$/, "")

  const event = await Event.findById(scope.eventId).select("name ownerId").lean<{ name: string; ownerId: mongoose.Types.ObjectId }>()
  if (!event) return { processed: 0, sent: 0, failed: 0, remaining: 0, error: "Event not found" }
  const owner = await User.findById(event.ownerId).select("name email organization").lean<{ name?: string; email?: string; organization?: string }>()
  const organisationName = owner?.organization?.trim() || owner?.name?.trim() || event.name
  const replyTo = owner?.email && EMAIL_SHAPE.test(owner.email) ? `${organisationName} <${owner.email}>` : undefined

  const types = await CertificateType.find({ eventId: scope.eventId }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }[]>()
  const typeNames = new Map(types.map((t) => [String(t._id), t.name]))

  const query = scopeQuery(scope)
  const matching = await Recipient.countDocuments(query)
  const recipients = await Recipient.find(query).sort({ createdAt: 1, _id: 1 }).limit(batchSize).select("name email regNo certificateTypeId").lean<LeanRecipient[]>()
  const remaining = Math.max(matching - recipients.length, 0)
  if (recipients.length === 0) return { processed: 0, sent: 0, failed: 0, remaining: 0 }

  const now = new Date()
  const results = new Map<string, { ok: boolean; error?: string }>()
  const messages: Array<BrevoBatchMessage & { id: string }> = []

  for (const r of recipients) {
    const id = String(r._id)
    const email = String(r.email || "").trim()
    if (!EMAIL_SHAPE.test(email)) {
      results.set(id, { ok: false, error: "Invalid email address" })
      continue
    }
    const typeId = String(r.certificateTypeId)
    const downloadUrl = r.regNo
      ? individualCertificateUrl(origin, scope.eventId, r.regNo)
      : `${origin}/download/${scope.eventId}/${typeId}`
    const mail = certificateEmail({
      recipientName: r.name,
      organisationName,
      eventName: event.name,
      certificateName: typeNames.get(typeId) || "Certificate",
      downloadUrl,
      linkedinUrl: `${origin}/api/download/linkedin?r=${id}`,
      regNo: r.regNo
    })
    messages.push({ id, to: email, subject: mail.subject, html: mail.html })
  }

  let batchError: string | undefined
  if (messages.length > 0) {
    if (process.env.BREVO_API_KEY) {
      const result = await sendBatchViaBrevo(messages, {
        tags: [CERTIFICATE_EMAIL_TEMPLATE],
        replyTo,
        senderName: `${organisationName} via CertiStage`
      })
      for (const m of messages) results.set(m.id, result.success ? { ok: true } : { ok: false, error: String(result.error || "Send failed") })
      if (!result.success) batchError = String(result.error || "Send failed")
      // One log line per batch rather than one per recipient: the HTML is the same shape for everyone
      await EmailLog.create({
        to: messages.length === 1 ? messages[0].to : `${messages.length} recipients`,
        subject: messages[0].subject,
        template: CERTIFICATE_EMAIL_TEMPLATE,
        htmlContent: messages[0].html,
        status: result.success ? "sent" : "failed",
        errorMessage: result.success ? undefined : batchError,
        sentAt: result.success ? now : undefined,
        metadata: { provider: "brevo", eventId: scope.eventId, eventName: event.name, userId: options.userId, count: messages.length, recipients: messages.map((m) => m.to).slice(0, 200) }
      }).catch((e) => console.error("Failed to log certificate email batch:", e))
    } else {
      for (const m of messages) {
        const result = await sendEmail({
          to: m.to,
          subject: m.subject,
          html: m.html,
          template: CERTIFICATE_EMAIL_TEMPLATE,
          replyTo,
          metadata: { eventId: scope.eventId, eventName: event.name, userId: options.userId, recipientId: m.id }
        })
        results.set(m.id, result.success ? { ok: true } : { ok: false, error: String(result.error || "Send failed") })
      }
    }
  }

  const ops = recipients.map((r) => {
    const id = String(r._id)
    const res = results.get(id) || { ok: false, error: "Not sent" }
    return {
      updateOne: {
        filter: { _id: r._id },
        update: res.ok
          ? { $set: { emailStatus: "sent", emailSentAt: now, emailAttemptAt: now, emailError: "" }, $inc: { emailCount: 1 } }
          : { $set: { emailStatus: "failed", emailAttemptAt: now, emailError: res.error } }
      }
    }
  })
  await Recipient.bulkWrite(ops, { ordered: false })

  const sent = [...results.values()].filter((v) => v.ok).length
  const failed = recipients.length - sent
  return { processed: recipients.length, sent, failed, remaining, error: batchError }
}
