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
