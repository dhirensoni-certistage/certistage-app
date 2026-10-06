import mongoose, { type PipelineStage } from "mongoose"
import Payment from "@/models/Payment"
import User from "@/models/User"

const DAY = 86400000
const OFFSET = 330 * 60000

export function revenuePeriod(params: URLSearchParams, now = new Date()) {
  const range = params.get("range") || "all"
  const local = new Date(now.getTime() + OFFSET)
  const startMonth = (delta: number) => new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() + delta, 1) - OFFSET)
  let from: Date | null = null
  let to = now
  if (range === "30days" || range === "90days") from = new Date(now.getTime() - (range === "30days" ? 30 : 90) * DAY)
  else if (range === "thisMonth") from = startMonth(0)
  else if (range === "lastMonth") { from = startMonth(-1); to = startMonth(0) }
  else if (range === "thisYear") from = new Date(Date.UTC(local.getUTCFullYear(), 0, 1) - OFFSET)
  else if (range === "custom") {
    const parse = (text: string | null) => {
      if (!text || !/^\d{4}-\d{2}-\d{2}$/.test(text)) throw new Error("Invalid date range")
      const date = new Date(text + "T00:00:00+05:30")
      if (!Number.isFinite(date.getTime()) || new Date(date.getTime() + OFFSET).toISOString().slice(0, 10) !== text) throw new Error("Invalid date range")
      return date
    }
    from = parse(params.get("from")); to = new Date(parse(params.get("to")).getTime() + DAY)
    if (from >= to || from > now || to.getTime() - from.getTime() > 3660 * DAY) throw new Error("Invalid date range")
    to = new Date(Math.min(to.getTime(), now.getTime()))
  } else if (range !== "all") throw new Error("Invalid date range")
  const interval: "day" | "month" = from && to.getTime() - from.getTime() <= 90 * DAY ? "day" : "month"
  return { range, from, to, interval }
}

export function revenueDateQuery(params: URLSearchParams) {
  const period = revenuePeriod(params)
  return { createdAt: { ...(period.from ? { $gte: period.from } : {}), $lt: period.to } }
}

export function paymentDirectoryPipeline(params: URLSearchParams): PipelineStage[] {
  const query: Record<string, unknown> = revenueDateQuery(params)
  const status = params.get("status")
  if (status && status !== "all") {
    if (!["success", "pending", "failed", "refunded"].includes(status)) throw new Error("Invalid payment status")
    query.status = status
  }
  const plan = params.get("plan")
  if (plan && plan !== "all") query.plan = plan
  const kind = params.get("kind")
  if (kind === "addon") query.kind = "addon"
  else if (kind === "plan") query.kind = { $ne: "addon" }
  else if (kind && kind !== "all") throw new Error("Invalid payment type")
  const ids = params.get("ids")
  if (ids) {
    const values = ids.split(",")
    if (values.length > 100 || values.some(id => !/^[a-f0-9]{24}$/i.test(id))) throw new Error("Invalid payment selection")
    query._id = { $in: values.map(id => new mongoose.Types.ObjectId(id)) }
  }
  const pipeline: PipelineStage[] = [
    { $match: query },
    { $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }], as: "user" } },
    { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } },
  ]
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    pipeline.push({ $match: { $or: ["user.name", "user.email", "orderId", "paymentId", "invoiceNumber"].map(field => ({ [field]: { $regex: literal, $options: "i" } })) } })
  }
  return pipeline
}

export const paymentDirectoryProjection: PipelineStage = { $project: {
  _id: 1, plan: 1, status: 1, orderId: 1, paymentId: 1, invoiceNumber: 1, failureReason: 1, createdAt: 1, refundedAt: 1,
  user: { $ifNull: ["$user", { name: "Deleted customer", email: "" }] },
  kind: { $ifNull: ["$kind", "plan"] },
  currency: { $ifNull: ["$currency", "INR"] },
  amountPaise: "$amount",
  refundPaise: { $min: [{ $ifNull: ["$amount", 0] }, { $max: [0, { $ifNull: ["$refundAmount", { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] }] }] }] },
  addonEmails: 1, addonCertificates: 1,
} }

export function paymentDirectorySort(params: URLSearchParams): Record<string, 1 | -1> {
  const requested = params.get("sort") || "createdAt"
  const field = ["createdAt", "amount", "status", "user.name"].includes(requested) ? requested : "createdAt"
  const direction = params.get("direction") === "asc" ? 1 : -1
  return { [field]: direction, _id: direction }
}

export function paymentItemName(payment: { kind?: string; plan?: string; addonEmails?: number; addonCertificates?: number }, planNames: Map<string, string>) {
  if (payment.kind === "addon") {
    if (payment.addonCertificates) return `${payment.addonCertificates.toLocaleString("en-IN")} certificates`
    if (payment.addonEmails) return `${payment.addonEmails.toLocaleString("en-IN")} email credits`
    return "Add-on credits"
  }
  return planNames.get(payment.plan || "") || (payment.plan || "Unknown plan").replace(/_/g, " ")
}

export { Payment }
