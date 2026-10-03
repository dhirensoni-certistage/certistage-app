import mongoose, { Schema, Document } from "mongoose"

/**
 * Recently deleted data. A delete in the client portal moves the original
 * document here instead of removing it; the organiser can restore it for
 * TRASH_RETENTION_DAYS, after which MongoDB's TTL index removes it.
 *
 * Items deleted together share a batchId (a bulk delete, or a certificate
 * type together with its recipients) and are restored together.
 */
export type TrashKind = "recipient" | "certificateType"

export interface ITrashItem extends Document {
  ownerId: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  kind: TrashKind
  batchId: string
  originalId: mongoose.Types.ObjectId
  doc: Record<string, unknown>
  label: string
  context: string
  deletedAt: Date
  expiresAt: Date
}

const TrashItemSchema = new Schema<ITrashItem>({
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  kind: { type: String, enum: ["recipient", "certificateType"], required: true },
  batchId: { type: String, required: true },
  originalId: { type: Schema.Types.ObjectId, required: true },
  doc: { type: Schema.Types.Mixed, required: true },
  label: { type: String, default: "" },
  context: { type: String, default: "" },
  deletedAt: { type: Date, required: true },
  expiresAt: { type: Date, required: true }
})

TrashItemSchema.index({ ownerId: 1, deletedAt: -1 })
TrashItemSchema.index({ batchId: 1 })
TrashItemSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.TrashItem || mongoose.model<ITrashItem>("TrashItem", TrashItemSchema)
