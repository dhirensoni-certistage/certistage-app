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

export const emailPackName = (pack: { emails: number }) => `${pack.emails.toLocaleString("en-IN")} certificate emails`

export type AddonStatus = "live" | "beta" | "soon"

export const ADDONS: { id: string; title: string; description: string; status: AddonStatus }[] = [
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
    id: "branding",
    title: "Remove CertiStage branding",
    description: "Hide the \"Powered by CertiStage\" line on your download pages.",
    status: "soon",
  },
]
