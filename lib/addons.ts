/**
 * Add-ons sold on top of a plan (Plans page > Add-ons, and "Buy emails" wherever emails run out).
 * Shared by the browser and the server; prices are in paise.
 */
export interface EmailPack {
  id: string
  emails: number
  price: number
}

// Defaults; Admin > Plans > Add-on packs overrides quantities and prices (Settings key "addon_config")
export const EMAIL_PACKS: EmailPack[] = [
  { id: "emails_2000", emails: 2000, price: 20000 },
  { id: "emails_10000", emails: 10000, price: 80000 },
  { id: "emails_50000", emails: 50000, price: 300000 },
]

export const findEmailPack = (id: unknown, packs: EmailPack[] = EMAIL_PACKS): EmailPack | undefined => packs.find((p) => p.id === id)

/**
 * Any number of emails can be bought, priced per email by volume (the packs above follow the
 * same rates): under 10,000 at 10 paise, from 10,000 at 8 paise, from 50,000 at 6 paise.
 */
export const CUSTOM_EMAILS = { min: 1000, max: 500000, step: 100 }
export interface EmailRateTier {
  from: number // applies from this many emails
  paise: number // per email
}

// Defaults; Admin > Plans > Add-on packs overrides them (highest "from" wins, sorted here)
export const EMAIL_RATE_TIERS: EmailRateTier[] = [
  { from: 50000, paise: 6 },
  { from: 10000, paise: 8 },
  { from: 0, paise: 10 },
]

const sortedTiers = (tiers: EmailRateTier[]) => [...tiers].sort((a, b) => b.from - a.from)

export const emailRate = (emails: number, tiers: EmailRateTier[] = EMAIL_RATE_TIERS) => {
  const sorted = sortedTiers(tiers)
  return (sorted.find((t) => emails >= t.from) || sorted[sorted.length - 1]).paise
}

/** Price in paise for a number of emails */
export const customEmailPrice = (emails: number, tiers: EmailRateTier[] = EMAIL_RATE_TIERS) => emails * emailRate(emails, tiers)

/** A valid custom quantity, or null */
export function parseCustomEmails(value: unknown): number | null {
  const emails = Number(value)
  if (!Number.isInteger(emails) || emails < CUSTOM_EMAILS.min || emails > CUSTOM_EMAILS.max || emails % CUSTOM_EMAILS.step !== 0) return null
  return emails
}

/** When the next volume tier gives more emails for the same or less money, that offer */
export function betterTierOffer(emails: number, tiers: EmailRateTier[] = EMAIL_RATE_TIERS): { emails: number; price: number } | null {
  const next = sortedTiers(tiers).reverse().find((t) => t.from > emails)
  if (!next) return null
  const price = customEmailPrice(next.from, tiers)
  return price <= customEmailPrice(emails, tiers) ? { emails: next.from, price } : null
}

export const emailPackName = (pack: { emails: number }) => `${pack.emails.toLocaleString("en-IN")} certificate emails`

/**
 * Extra certificates on top of the plan's quota, for the event that turns out bigger than
 * planned. Used only after the plan's certificates for the period are gone; never expire.
 * Priced above the annual plans' per-certificate rate on purpose: a pack is for a one-off
 * overflow, the next plan up is still the better deal for recurring volume.
 */
export interface CertPack {
  id: string
  certificates: number
  price: number
}

export const CERT_PACKS: CertPack[] = [
  { id: "certs_500", certificates: 500, price: 99900 },
  { id: "certs_1000", certificates: 1000, price: 179900 },
  { id: "certs_5000", certificates: 5000, price: 699900 },
]

export const findCertPack = (id: unknown, packs: CertPack[] = CERT_PACKS): CertPack | undefined => packs.find((p) => p.id === id)

/** Pack quantities and prices as saved by the admin, merged over the defaults above */
export interface AddonConfig {
  emailPacks: EmailPack[]
  certPacks: CertPack[]
  /** Per-email rates for custom quantities, by volume */
  emailRateTiers: EmailRateTier[]
}

const positiveInt = (v: unknown, fallback: number) => {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? n : fallback
}

export function mergeAddonConfig(value: unknown): AddonConfig {
  const raw = (value && typeof value === "object" ? value : {}) as { emailPacks?: unknown; certPacks?: unknown; emailRateTiers?: unknown }
  const emailPacks = EMAIL_PACKS.map((def) => {
    const o = Array.isArray(raw.emailPacks) ? raw.emailPacks.find((p: any) => p?.id === def.id) : null
    return { id: def.id, emails: positiveInt(o?.emails, def.emails), price: positiveInt(o?.price, def.price) }
  })
  const certPacks = CERT_PACKS.map((def) => {
    const o = Array.isArray(raw.certPacks) ? raw.certPacks.find((p: any) => p?.id === def.id) : null
    return { id: def.id, certificates: positiveInt(o?.certificates, def.certificates), price: positiveInt(o?.price, def.price) }
  })
  // Same three tiers as the defaults, each with its own threshold and rate; the first always starts at 0
  const emailRateTiers = sortedTiers(EMAIL_RATE_TIERS).reverse().map((def, i) => {
    const o = Array.isArray(raw.emailRateTiers) ? sortedTiers(raw.emailRateTiers.filter((t: any) => t && Number.isFinite(Number(t.from)))).reverse()[i] : null
    const from = i === 0 ? 0 : Math.max(1, Math.round(Number(o?.from ?? def.from)))
    const paise = Number(o?.paise)
    return { from, paise: Number.isFinite(paise) && paise > 0 ? Math.round(paise * 100) / 100 : def.paise }
  })
  return { emailPacks, certPacks, emailRateTiers: sortedTiers(emailRateTiers) }
}

export const certPackName = (pack: { certificates: number }) => `${pack.certificates.toLocaleString("en-IN")} extra certificates`

/** Receipt / history line for any add-on payment */
export const addonItemName = (p: { addonEmails?: number | null; addonCertificates?: number | null }) =>
  p.addonCertificates ? certPackName({ certificates: p.addonCertificates }) : emailPackName({ emails: p.addonEmails || 0 })

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
    description: "Issue more certificates than your plan includes, without changing plan. One-time packs that never expire.",
    status: "live",
    href: "/client/addons#certificates",
    cta: "See packs",
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
