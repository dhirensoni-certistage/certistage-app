/**
 * Add-ons sold on top of a plan (Plans page > Add-ons, and "Buy emails" wherever emails run out).
 * Shared by the browser and the server; prices are in paise.
 */
export interface EmailPack {
  id: string
  emails: number
  price: number
}

export const EMAIL_PACKS: EmailPack[] = [
  { id: "emails_2000", emails: 2000, price: 20000 },
  { id: "emails_10000", emails: 10000, price: 80000 },
  { id: "emails_50000", emails: 50000, price: 300000 },
]

export const findEmailPack = (id: unknown): EmailPack | undefined => EMAIL_PACKS.find((p) => p.id === id)

/**
 * Any number of emails can be bought, priced per email by volume (the packs above follow the
 * same rates): under 10,000 at 10 paise, from 10,000 at 8 paise, from 50,000 at 6 paise.
 */
export const CUSTOM_EMAILS = { min: 1000, max: 500000, step: 100 }
export const EMAIL_RATE_TIERS = [
  { from: 50000, paise: 6 },
  { from: 10000, paise: 8 },
  { from: 0, paise: 10 },
]

export const emailRate = (emails: number) => (EMAIL_RATE_TIERS.find((t) => emails >= t.from) || EMAIL_RATE_TIERS[EMAIL_RATE_TIERS.length - 1]).paise

/** Price in paise for a number of emails */
export const customEmailPrice = (emails: number) => emails * emailRate(emails)

/** A valid custom quantity, or null */
export function parseCustomEmails(value: unknown): number | null {
  const emails = Number(value)
  if (!Number.isInteger(emails) || emails < CUSTOM_EMAILS.min || emails > CUSTOM_EMAILS.max || emails % CUSTOM_EMAILS.step !== 0) return null
  return emails
}

/** When the next volume tier gives more emails for the same or less money, that offer */
export function betterTierOffer(emails: number): { emails: number; price: number } | null {
  const next = [...EMAIL_RATE_TIERS].reverse().find((t) => t.from > emails)
  if (!next) return null
  const price = customEmailPrice(next.from)
  return price <= customEmailPrice(emails) ? { emails: next.from, price } : null
}

export const emailPackName = (pack: { emails: number }) => `${pack.emails.toLocaleString("en-IN")} certificate emails`

export type AddonStatus = "live" | "beta" | "soon"

export const ADDONS: { id: string; title: string; description: string; status: AddonStatus; href?: string; cta?: string }[] = [
  {
    id: "emails",
    title: "Certificate emails",
    description: "Email every person their certificate and remind those who haven't downloaded. Used after your plan's emails run out, and never expire.",
    status: "beta",
  },
  {
    id: "whatsapp",
    title: "WhatsApp delivery",
    description: "Send each person their certificate PDF on WhatsApp.",
    status: "soon",
  },
  {
    id: "certificates",
    title: "Extra certificates",
    description: "Issue more certificates than your plan includes, without changing plan.",
    status: "soon",
  },
  {
    // Shipped as part of every annual plan rather than as a paid add-on (Settings > Download page branding)
    id: "branding",
    title: "Remove CertiStage branding",
    description: "Hide the \"Powered by CertiStage\" line on your download pages. Included with every annual plan; switch it off in Settings.",
    status: "live",
    href: "/client/settings",
    cta: "Open Settings",
  },
]
