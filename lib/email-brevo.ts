// Brevo (formerly Sendinblue) transactional email over its HTTP API.
// No SDK: one fetch to https://api.brevo.com/v3/smtp/email, which works on
// Vercel and keeps the bundle small.
import type { EmailAttachment } from "./email"

export interface BrevoEmailOptions {
  to: string | string[]
  subject: string
  html: string
  cc?: string | string[]
  attachments?: EmailAttachment[]
  tags?: string[]
  replyTo?: string
}

/** One personalised message inside a batch send. */
export interface BrevoBatchMessage {
  to: string
  subject: string
  html: string
}

function parseAddress(value: string): { email: string; name?: string } {
  // "CertiStage <noreply@certistage.com>" or plain address
  const match = value.match(/^\s*"?([^"<]*)"?\s*<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim() || undefined, email: match[2].trim() }
  return { email: value.trim() }
}

export function brevoSender(): { email: string; name?: string } | null {
  const raw = process.env.BREVO_FROM_EMAIL || process.env.FROM_EMAIL
  if (!raw) return null
  const parsed = parseAddress(raw)
  if (process.env.BREVO_FROM_NAME) parsed.name = process.env.BREVO_FROM_NAME
  if (!parsed.name) parsed.name = "CertiStage"
  return parsed
}

export async function sendEmailViaBrevo(options: BrevoEmailOptions): Promise<{ success: boolean; error?: any; data?: any }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: "Brevo not configured" }
  const sender = brevoSender()
  if (!sender) return { success: false, error: "BREVO_FROM_EMAIL (or FROM_EMAIL) not configured" }

  const list = (v?: string | string[]) => (v ? (Array.isArray(v) ? v : [v]).map((email) => ({ email })) : undefined)
  const body: Record<string, unknown> = {
    sender,
    to: list(options.to),
    subject: options.subject,
    htmlContent: options.html
  }
  const cc = list(options.cc)
  if (cc?.length) body.cc = cc
  if (options.attachments?.length) {
    body.attachment = options.attachments.map((a) => ({ name: a.filename, content: a.content.toString("base64") }))
  }
  if (options.tags?.length) body.tags = options.tags
  if (options.replyTo) body.replyTo = parseAddress(options.replyTo)

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error("Brevo error:", res.status, data)
      return { success: false, error: data?.message || `Brevo responded ${res.status}` }
    }
    return { success: true, data: { messageId: data?.messageId } }
  } catch (error: any) {
    console.error("Brevo request failed:", error?.message || error)
    return { success: false, error: error?.message || "Brevo request failed" }
  }
}

/**
 * Batch send: one API call carries up to 1000 personalised messages
 * (Brevo "messageVersions"). Each version has its own recipient, subject and
 * HTML, so a certificate email to 500 people is a handful of requests rather
 * than 500. The whole call succeeds or fails together, which the caller
 * records per recipient.
 */
export async function sendBatchViaBrevo(
  messages: BrevoBatchMessage[],
  options: { tags?: string[]; replyTo?: string; senderName?: string } = {}
): Promise<{ success: boolean; error?: any; data?: any }> {
  const apiKey = process.env.BREVO_API_KEY
  if (!apiKey) return { success: false, error: "Brevo not configured" }
  const sender = brevoSender()
  if (!sender) return { success: false, error: "BREVO_FROM_EMAIL (or FROM_EMAIL) not configured" }
  if (!messages.length) return { success: true, data: { messageIds: [] } }
  if (messages.length > 1000) return { success: false, error: "Brevo accepts at most 1000 messages per batch" }

  const body: Record<string, unknown> = {
    sender: options.senderName ? { ...sender, name: options.senderName } : sender,
    // Brevo requires a top-level subject/htmlContent even when every version overrides them
    subject: messages[0].subject,
    htmlContent: messages[0].html,
    messageVersions: messages.map((m) => ({ to: [{ email: m.to }], subject: m.subject, htmlContent: m.html }))
  }
  if (options.tags?.length) body.tags = options.tags
  if (options.replyTo) body.replyTo = parseAddress(options.replyTo)

  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": apiKey, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body)
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      console.error("Brevo batch error:", res.status, data)
      return { success: false, error: data?.message || `Brevo responded ${res.status}` }
    }
    return { success: true, data: { messageIds: data?.messageIds || [] } }
  } catch (error: any) {
    console.error("Brevo batch request failed:", error?.message || error)
    return { success: false, error: error?.message || "Brevo request failed" }
  }
}
