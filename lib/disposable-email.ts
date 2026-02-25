const DISPOSABLE_EMAIL_DOMAINS = new Set<string>([
  "10minutemail.com",
  "10minutemail.net",
  "20minutemail.com",
  "dispostable.com",
  "dropmail.me",
  "emailondeck.com",
  "fakeinbox.com",
  "fakemail.net",
  "getairmail.com",
  "getnada.com",
  "guerrillamail.com",
  "guerrillamail.net",
  "inboxkitten.com",
  "maildrop.cc",
  "mailinator.com",
  "mailnesia.com",
  "mintemail.com",
  "moakt.com",
  "sharklasers.com",
  "tempmail.com",
  "tempmail.email",
  "tempmailo.com",
  "temp-mail.io",
  "temp-mail.org",
  "throwawaymail.com",
  "trashmail.com",
  "yopmail.com"
])

export function getEmailDomain(email: string): string {
  const normalized = String(email || "").trim().toLowerCase()
  const parts = normalized.split("@")
  return parts.length === 2 ? parts[1] : ""
}

export function isDisposableEmail(email: string): boolean {
  const domain = getEmailDomain(email)
  if (!domain) return false

  if (DISPOSABLE_EMAIL_DOMAINS.has(domain)) return true

  // Catch obvious disposable provider subdomains
  return (
    domain.endsWith(".mailinator.com") ||
    domain.endsWith(".yopmail.com") ||
    domain.endsWith(".guerrillamail.com")
  )
}

