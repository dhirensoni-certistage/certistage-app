import type { PipelineStage } from "mongoose"
import mongoose from "mongoose"
import Event from "@/models/Event"
import User from "@/models/User"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { buildAdminUsersQuery } from "@/lib/admin-users-query"

export function eventDirectoryPipeline(params: URLSearchParams): PipelineStage[] {
  const filters = new URLSearchParams()
  if (params.get("status")) filters.set("status", params.get("status")!)
  if (params.get("created")) filters.set("joined", params.get("created")!)
  const query = buildAdminUsersQuery(filters)
  const ownerId = params.get("ownerId")
  if (ownerId && /^[a-f0-9]{24}$/i.test(ownerId)) query.ownerId = new mongoose.Types.ObjectId(ownerId)
  const pipeline: PipelineStage[] = [
    { $match: query },
    { $lookup: {
      from: User.collection.name, localField: "ownerId", foreignField: "_id",
      pipeline: [{ $project: { _id: 1, name: 1, email: 1 } }], as: "owner",
    } },
    { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
  ]
  const search = (params.get("search") || "").trim().slice(0, 200)
  if (search) {
    const literal = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
    pipeline.push({ $match: { $or: ["name", "owner.name", "owner.email"].map(field => ({
      [field]: { $regex: literal, $options: "i" },
    })) } })
  }
  const ids = params.get("ids")
  if (ids) {
    const values = ids.split(",")
    if (values.length > 100 || values.some(id => !/^[a-f0-9]{24}$/i.test(id))) throw new Error("Invalid event selection")
    pipeline.push({ $match: { _id: { $in: values.map(id => new mongoose.Types.ObjectId(id)) } } })
  }
  return pipeline
}

export function eventCountsPipeline(): PipelineStage[] {
  return [
    { $lookup: {
      from: CertificateType.collection.name, localField: "_id", foreignField: "eventId",
      pipeline: [{ $count: "count" }], as: "typeCount",
    } },
    { $lookup: {
      from: Recipient.collection.name, localField: "_id", foreignField: "eventId",
      pipeline: [{ $count: "count" }], as: "recipientCount",
    } },
    { $set: {
      certificateTypesCount: { $ifNull: [{ $arrayElemAt: ["$typeCount.count", 0] }, 0] },
      recipientsCount: { $ifNull: [{ $arrayElemAt: ["$recipientCount.count", 0] }, 0] },
    } },
  ]
}

export const eventDirectoryProjection: PipelineStage = { $project: {
  _id: 1, name: 1, description: 1, createdAt: 1,
  isActive: { $ifNull: ["$isActive", true] },
  owner: { $ifNull: ["$owner", null] },
  certificateTypesCount: 1, recipientsCount: 1,
} }

export function eventDirectorySort(params: URLSearchParams): Record<string, 1 | -1> {
  const fields = new Set(["name", "owner.name", "certificateTypesCount", "recipientsCount", "isActive", "createdAt"])
  const requested = params.get("sort") || "createdAt"
  const field = fields.has(requested) ? requested : "createdAt"
  const direction = params.get("direction") === "asc" ? 1 : -1
  return { [field]: direction, _id: direction }
}

export { Event }
