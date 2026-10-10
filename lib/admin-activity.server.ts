import { type PipelineStage } from "mongoose"
import User from "@/models/User"
import Event from "@/models/Event"
import Payment from "@/models/Payment"
import Recipient from "@/models/Recipient"
import { emailLogsQuery } from "@/lib/admin-email-logs.server"
import { ACTIVITY_TYPES } from "@/lib/admin-activity"
const actor: (PipelineStage.Lookup | PipelineStage.Unwind)[] = [{ $lookup: { from: User.collection.name, localField: "userId", foreignField: "_id", pipeline: [{ $project: { name: 1, email: 1 } }], as: "actor" } }, { $unwind: { path: "$actor", preserveNullAndEmptyArrays: true } }]
export function activityPipeline(params: URLSearchParams): PipelineStage[] {
  const pipeline: PipelineStage[] = [
    { $project: { _id: { $concat: ["signup-", { $toString: "$_id" }] }, sourceId: { $toString: "$_id" }, type: { $literal: "signup" }, userId: "$_id", userName: "$name", userEmail: "$email", createdAt: 1 } },
    { $unionWith: { coll: Payment.collection.name, pipeline: [...actor, { $project: { _id: { $concat: ["payment-", { $toString: "$_id" }] }, sourceId: { $toString: "$_id" }, type: { $literal: "payment" }, userId: "$actor._id", userName: "$actor.name", userEmail: "$actor.email", createdAt: 1, metadata: { amount: "$amount", currency: "$currency", status: "$status", plan: "$plan", kind: "$kind", orderId: "$orderId", addonEmails: "$addonEmails", addonCertificates: "$addonCertificates" } } }] } },
    { $unionWith: { coll: Event.collection.name, pipeline: [{ $set: { userId: "$ownerId" } }, ...actor, { $project: { _id: { $concat: ["event-", { $toString: "$_id" }] }, sourceId: { $toString: "$_id" }, type: { $literal: "event_created" }, userId: "$actor._id", userName: "$actor.name", userEmail: "$actor.email", eventId: "$_id", eventName: "$name", createdAt: 1 } }] } },
    { $unionWith: { coll: Recipient.collection.name, pipeline: [{ $match: { downloadCount: { $gt: 0 }, lastDownloadAt: { $type: "date" } } }, { $project: { _id: { $concat: ["download-", { $toString: "$_id" }] }, sourceId: { $toString: "$_id" }, type: { $literal: "download" }, userName: "$name", userEmail: "$email", eventId: "$eventId", createdAt: "$lastDownloadAt", metadata: { downloadCount: "$downloadCount" } } }] } },
  ]
  const query: Record<string, unknown> = {}
  const dates = emailLogsQuery(new URLSearchParams({ dateRange: params.get("dateRange") || "all" }))
  if (dates.createdAt) query.createdAt = dates.createdAt
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) { const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); query.$or = ["userName", "userEmail", "eventName", "metadata.orderId"].map(field => ({ [field]: { $regex: literal, $options: "i" } })) }
  if (Object.keys(query).length) pipeline.push({ $match: query })
  return pipeline
}
export function activityTypeMatch(params: URLSearchParams): PipelineStage.Match[] {
  const type = params.get("type")
  return ACTIVITY_TYPES.includes(type as typeof ACTIVITY_TYPES[number]) ? [{ $match: { type } }] : []
}
export function activitySort(params: URLSearchParams): Record<string, 1 | -1> { return { createdAt: params.get("sort") === "oldest" ? 1 : -1, _id: 1 } }
export { User }
