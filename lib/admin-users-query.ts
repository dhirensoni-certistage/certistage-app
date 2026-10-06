/** Shared filters for the admin user directory and CSV export. */
export function buildAdminUsersQuery(params: URLSearchParams, now = new Date()) {
  const query: Record<string, unknown> = {}
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    query.$or = ["name", "email", "organization"].map((field) => ({
      [field]: { $regex: literal, $options: "i" },
    }))
  }
  const plan = params.get("plan")
  if (plan && plan !== "all") {
    query.plan = plan === "free" ? { $in: ["free", null] } : plan
  }
  const status = params.get("status")
  if (status === "active") query.isActive = { $ne: false }
  if (status === "inactive") query.isActive = false

  // Calendar filters use IST, consistent with the admin's dates.
  const offset = 330 * 60 * 1000
  const local = new Date(now.getTime() + offset)
  const today = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - offset)
  const month = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset)
  const joined = params.get("joined")
  if (joined === "today") query.createdAt = { $gte: today }
  if (joined === "7days" || joined === "30days") {
    query.createdAt = { $gte: new Date(now.getTime() - Number(joined.replace("days", "")) * 86400000) }
  }
  if (joined === "thisMonth") query.createdAt = { $gte: month }
  if (joined === "lastMonth") {
    query.createdAt = {
      $gte: new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - offset),
      $lt: month,
    }
  }
  return query
}

export function parseUsersPagination(params: URLSearchParams) {
  const positiveInteger = (value: string | null, fallback: number, max: number) => {
    const number = Number(value)
    return Number.isSafeInteger(number) && number > 0 ? Math.min(number, max) : fallback
  }
  return {
    page: positiveInteger(params.get("page"), 1, 1000000),
    limit: positiveInteger(params.get("limit"), 10, 100),
  }
}
