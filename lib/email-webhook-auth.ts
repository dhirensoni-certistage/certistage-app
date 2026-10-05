import { timingSafeEqual } from "crypto"

/**
 * Email provider webhooks are registered as https://www.certistage.com/api/webhooks/<provider>?key=<EMAIL_WEBHOOK_SECRET>
 * (ZeptoMail and Brevo both allow a custom webhook URL).
 */
export function webhookAuthorized(url: string): boolean {
  const secret = process.env.EMAIL_WEBHOOK_SECRET
  if (!secret) return false
  const key = new URL(url).searchParams.get("key") || ""
  const a = Buffer.from(key)
  const b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}
