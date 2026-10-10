const DAY = 86400000
const OFFSET = 330 * 60000
export function analyticsPeriod(params: URLSearchParams, now = new Date()) {
  const range = params.get("range") || "30days"
  const local = new Date(now.getTime() + OFFSET)
  const month = (delta: number) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + delta, 1) - OFFSET)
  let from: Date | null = null; let to = now
  if (range === "7days" || range === "30days" || range === "90days") from = new Date(now.getTime() - Number(range.replace("days", "")) * DAY)
  else if (range === "thisMonth") from = month(0)
  else if (range === "lastMonth") { from = month(-1); to = month(0) }
  else if (range === "custom") {
    const parse = (value: string | null) => {
      if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw Error("Enter valid start and end dates")
      const date = new Date(value + "T00:00:00+05:30")
      if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + OFFSET).toISOString().slice(0, 10) !== value) throw Error("Enter valid start and end dates")
      return date
    }
    from = parse(params.get("from")); to = new Date(parse(params.get("to")).getTime() + DAY)
    if (from >= to || from > now || to.getTime() - from.getTime() > 3660 * DAY) throw Error("Choose a valid date range within 10 years")
    to = new Date(Math.min(to.getTime(), now.getTime()))
  } else if (range !== "all") throw Error("Invalid date range")
  return { range, from, to }
}
export function analyticsBuckets(from: Date, to: Date, interval: "day" | "month") {
  const local = new Date(from.getTime() + OFFSET)
  let cursor = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), interval === "month" ? 1 : local.getUTCDate())
  const result: string[] = []
  while (cursor < to.getTime() + OFFSET && result.length < 3700) {
    result.push(new Date(cursor).toISOString().slice(0, interval === "month" ? 7 : 10))
    if (interval === "day") cursor += DAY
    else { const date = new Date(cursor); cursor = Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 1) }
  }
  return result
}
export interface AnalyticsData {
  period: { range: string; from: string | null; to: string; interval: "day" | "month" }
  summary: { users: number; events: number; recipients: number; downloaded: number; notDownloaded: number; downloadRate: number; emailed: number }
  series: { date: string; recipients: number; users: number; events: number }[]
  topUsers: { user: { _id?: string; name?: string; email?: string }; recipientsCount: number; eventsCount: number }[]
  topEvents: { event: { _id: string; name: string }; owner: { name?: string; email?: string }; recipientsCount: number; downloaded: number }[]
  growthLoop: { linkedinRecipients: number; whatsappShares: number; ctaClicks: number }
  asOf: string
}
