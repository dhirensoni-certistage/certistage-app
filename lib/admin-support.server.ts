import { TICKET_STATUSES } from "@/lib/admin-support"
import { emailLogsQuery } from "@/lib/admin-email-logs.server"
export function supportQuery(params: URLSearchParams, includeStatus = true) {
  const query: Record<string, unknown> = {}
  const status = params.get("status") || "open"
  if (includeStatus && TICKET_STATUSES.includes(status as typeof TICKET_STATUSES[number])) query.status = status
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) { const re = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); query.$or = ["number", "subject", "name", "email", "organization"].map(field => ({ [field]: { $regex: re, $options: "i" } })) }
  const plan = params.get("plan"); if (plan && plan !== "all") query.plan = plan.slice(0, 100)
  const dates = emailLogsQuery(new URLSearchParams({ dateRange: params.get("dateRange") || "all" }))
  if (dates.createdAt) query.createdAt = dates.createdAt
  if (params.get("response") === "awaiting") {
    query.lastReplyBy = { $ne: "admin" }
    if (!includeStatus || !query.status) query.status = { $ne: "closed" }
    else if (query.status === "closed") query._id = { $exists: false }
  }
  return query
}
