export const ACTIVITY_TYPES = ["signup", "payment", "event_created", "download"] as const
export type ActivityType = typeof ACTIVITY_TYPES[number]
export const ACTIVITY_LABELS: Record<ActivityType, string> = { signup: "Signup", payment: "Payment", event_created: "Event created", download: "Latest download" }
export interface ActivityItem {
  _id: string; sourceId: string; type: ActivityType; userId?: string; eventId?: string
  userName?: string; userEmail?: string; eventName?: string; createdAt: string
  metadata?: { amount?: number; currency?: string; status?: string; plan?: string; kind?: string; orderId?: string; downloadCount?: number; addonEmails?: number; addonCertificates?: number }
}
export function activityDescription(item: ActivityItem) {
  const name = item.userName || "Unknown account"
  if (item.type === "signup") return `${name} registered an account`
  if (item.type === "event_created") return `${name} created ${item.eventName || "an event"}`
  if (item.type === "download") return `${name} downloaded a certificate`
  const currency = item.metadata?.currency || "INR"
  const amount = new Intl.NumberFormat("en-IN", { style: "currency", currency: /^[A-Z]{3}$/.test(currency) ? currency : "INR", minimumFractionDigits: 2 }).format((item.metadata?.amount || 0) / 100)
  return `${name} · ${amount} ${item.metadata?.kind === "addon" ? "add-on" : (item.metadata?.plan || "plan")} order`
}
