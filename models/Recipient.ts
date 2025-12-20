import mongoose, { Schema, Document } from "mongoose"

export interface IRecipient extends Document {
  name: string
  email?: string
  mobile?: string
  regNo?: string
  certificateTypeId: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  downloadCount: number
  lastDownloadAt?: Date
  customFields?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

const RecipientSchema = new Schema<IRecipient>(
  {
    name: { type: String, required: true },
    email: { type: String, default: "" },
    mobile: { type: String, default: "" },
    regNo: { type: String },
    certificateTypeId: { type: Schema.Types.ObjectId, ref: "CertificateType", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    downloadCount: { type: Number, default: 0 },
    lastDownloadAt: { type: Date },
    customFields: { type: Map, of: String }
  },
  { timestamps: true }
)

// Indexes for faster queries
RecipientSchema.index({ eventId: 1 })
RecipientSchema.index({ certificateTypeId: 1 })
RecipientSchema.index({ eventId: 1, certificateTypeId: 1 })
RecipientSchema.index({ email: 1, eventId: 1 })
RecipientSchema.index({ mobile: 1, eventId: 1 })
RecipientSchema.index({ regNo: 1, eventId: 1 })
RecipientSchema.index({ name: 1, eventId: 1 })

export default mongoose.models.Recipient || mongoose.model<IRecipient>("Recipient", RecipientSchema)
