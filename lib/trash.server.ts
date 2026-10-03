import mongoose from "mongoose"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import TrashItem from "@/models/TrashItem"
import { canUserAddRecipients, canUserCreateCertificateType } from "@/lib/plan-limits"

export const TRASH_RETENTION_DAYS = 30

const newBatchId = () => new mongoose.Types.ObjectId().toString()
const expiry = (from: Date) => new Date(from.getTime() + TRASH_RETENTION_DAYS * 86400000)

/** Move recipients matching `filter` to the trash. Returns how many moved. */
export async function trashRecipients(opts: {
  filter: Record<string, unknown>
  ownerId: string
  batchId?: string
  certTypeName?: string
}): Promise<{ batchId: string; count: number }> {
  const batchId = opts.batchId || newBatchId()
  const docs = await Recipient.find(opts.filter).lean()
  if (docs.length === 0) return { batchId, count: 0 }

  const now = new Date()
  const expiresAt = expiry(now)
  await TrashItem.insertMany(
    docs.map((d: any) => ({
      ownerId: opts.ownerId,
      eventId: d.eventId,
      kind: "recipient",
      batchId,
      originalId: d._id,
      doc: d,
      label: d.name || "",
      context: opts.certTypeName || "",
      deletedAt: now,
      expiresAt
    })),
    { ordered: false }
  )
  await Recipient.deleteMany({ _id: { $in: docs.map((d: any) => d._id) } })
  return { batchId, count: docs.length }
}

/** Move a certificate type and all of its recipients to the trash. */
export async function trashCertificateType(certType: any, ownerId: string): Promise<{ batchId: string; recipients: number }> {
  const batchId = newBatchId()
  const { count } = await trashRecipients({
    filter: { certificateTypeId: certType._id },
    ownerId,
    batchId,
    certTypeName: certType.name
  })
  const now = new Date()
  await TrashItem.create({
    ownerId,
    eventId: certType.eventId,
    kind: "certificateType",
    batchId,
    originalId: certType._id,
    doc: certType,
    label: certType.name,
    context: `${count} recipient${count === 1 ? "" : "s"}`,
    deletedAt: now,
    expiresAt: expiry(now)
  })
  await CertificateType.deleteOne({ _id: certType._id })
  return { batchId, recipients: count }
}

export interface TrashBatch {
  batchId: string
  kind: "recipient" | "certificateType"
  label: string
  count: number
  context: string
  eventId: string
  eventName: string
  deletedAt: string
  expiresAt: string
}

/** Deleted items for an organiser, one row per batch, newest first. */
export async function listTrash(ownerId: string, eventId?: string | null): Promise<TrashBatch[]> {
  const match: Record<string, unknown> = { ownerId: new mongoose.Types.ObjectId(ownerId) }
  if (eventId && mongoose.isValidObjectId(eventId)) match.eventId = new mongoose.Types.ObjectId(eventId)

  const rows = await TrashItem.aggregate([
    { $match: match },
    { $sort: { deletedAt: -1, label: 1 } },
    {
      $group: {
        _id: "$batchId",
        recipients: { $sum: { $cond: [{ $eq: ["$kind", "recipient"] }, 1, 0] } },
        typeLabel: { $max: { $cond: [{ $eq: ["$kind", "certificateType"] }, "$label", null] } },
        firstLabel: { $first: "$label" },
        context: { $first: "$context" },
        eventId: { $first: "$eventId" },
        deletedAt: { $max: "$deletedAt" },
        expiresAt: { $max: "$expiresAt" }
      }
    },
    { $sort: { deletedAt: -1 } },
    { $limit: 200 }
  ])

  const eventIds = Array.from(new Set(rows.map((r) => String(r.eventId))))
  const events = await Event.find({ _id: { $in: eventIds } }).select("name").lean()
  const eventName = new Map(events.map((e: any) => [String(e._id), e.name as string]))

  return rows.map((r) => {
    const isType = !!r.typeLabel
    return {
      batchId: r._id,
      kind: isType ? "certificateType" : "recipient",
      label: isType ? r.typeLabel : r.firstLabel,
      count: r.recipients,
      context: isType ? `${r.recipients} recipient${r.recipients === 1 ? "" : "s"}` : r.context,
      eventId: String(r.eventId),
      eventName: eventName.get(String(r.eventId)) || "",
      deletedAt: new Date(r.deletedAt).toISOString(),
      expiresAt: new Date(r.expiresAt).toISOString()
    }
  })
}

type RestoreResult =
  | { ok: true; certificateTypes: number; recipients: number }
  | { ok: false; status: number; error: string }

/** Put a deleted batch back exactly as it was. */
export async function restoreBatch(batchId: string, ownerId: string): Promise<RestoreResult> {
  const items = await TrashItem.find({ batchId, ownerId }).lean()
  if (items.length === 0) return { ok: false, status: 404, error: "These items are no longer in Recently deleted." }

  const typeItem = items.find((i: any) => i.kind === "certificateType") as any
  const recipientItems = items.filter((i: any) => i.kind === "recipient") as any[]

  // Plan limits apply to restored data like any other data
  if (typeItem) {
    const can = await canUserCreateCertificateType(ownerId, String(typeItem.eventId))
    if (!can.allowed) return { ok: false, status: 403, error: can.reason || "Certificate limit reached for your plan." }
  }
  if (recipientItems.length > 0) {
    const can = await canUserAddRecipients(ownerId, recipientItems.length)
    if (!can.allowed) return { ok: false, status: 403, error: can.reason || "Recipient limit reached for your plan." }

    // The certificate these recipients belong to must exist (or be restored in this batch)
    if (!typeItem) {
      const typeIds = Array.from(new Set(recipientItems.map((i) => String(i.doc.certificateTypeId))))
      const existing = await CertificateType.countDocuments({ _id: { $in: typeIds } })
      if (existing !== typeIds.length) {
        return { ok: false, status: 409, error: "The certificate these recipients belong to was deleted. Restore that certificate first." }
      }
    }
  }

  let certificateTypes = 0
  if (typeItem) {
    const exists = await CertificateType.exists({ _id: typeItem.originalId })
    if (!exists) {
      try {
        await CertificateType.collection.insertOne(typeItem.doc)
      } catch (err: any) {
        if (err?.code !== 11000) throw err
        // Short code was reused meanwhile; the dashboard assigns a fresh one lazily
        const { shortCode: _dropped, ...rest } = typeItem.doc
        await CertificateType.collection.insertOne(rest)
      }
      certificateTypes = 1
    }
  }

  let recipients = 0
  if (recipientItems.length > 0) {
    try {
      const res = await Recipient.collection.insertMany(recipientItems.map((i) => i.doc), { ordered: false })
      recipients = res.insertedCount
    } catch (err: any) {
      // Some ids already exist (restored twice); keep the ones that went in
      if (err?.code !== 11000 && !err?.writeErrors) throw err
      recipients = err?.result?.insertedCount ?? err?.insertedCount ?? 0
    }
  }

  await TrashItem.deleteMany({ batchId, ownerId })
  return { ok: true, certificateTypes, recipients }
}
