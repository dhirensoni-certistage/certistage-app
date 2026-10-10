import { EMAIL_STATUSES } from "@/lib/admin-email-logs"
export function emailLogsQuery(params: URLSearchParams, now = new Date(), includeStatus = true) {
  const query: Record<string, unknown> = {}
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) { const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); query.$or = ["to", "subject"].map(field => ({ [field]: { $regex: literal, $options: "i" } })) }
  const status = params.get("status")
  if (includeStatus && EMAIL_STATUSES.includes(status as typeof EMAIL_STATUSES[number])) query.status = status
  const template = params.get("template")
  if (template && template !== "all") query.template = template.slice(0, 100)
  const range = params.get("dateRange")
  const offset = 330 * 60000; const local = new Date(now.getTime() + offset)
  if (range === "today") query.createdAt = { $gte: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset) }
  if (range === "week" || range === "month") query.createdAt = { $gte: new Date(now.getTime() - (range === "week" ? 7 : 30) * 86400000) }
  return query
}
