import mongoose, { Schema, Document } from "mongoose"

export interface IRecipient extends Document {
  prefix?: string
  firstName: string
  lastName?: string
  name: string // Computed: prefix + firstName + lastName
  email?: string
  mobile?: string
  regNo?: string
  certificateTypeId: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  downloadCount: number
  lastDownloadAt?: Date
  linkedinClicks: number // times "Add to LinkedIn profile" was opened
  lastLinkedinClickAt?: Date
  whatsappShares: number // times "Share on WhatsApp" was opened from the download page
  // Certificate email (organiser-triggered, see lib/certificate-email.server.ts)
  emailStatus?: "sent" | "failed"
  emailSentAt?: Date
  emailAttemptAt?: Date // last try, successful or not; lets a send run skip what it already tried
  emailError?: string
  emailCount: number // how many certificate emails were sent to this person
  customFields?: Record<string, string>
  createdAt: Date
  updatedAt: Date
}

const RecipientSchema = new Schema<IRecipient>(
  {
    prefix: { type: String, default: "" },
    firstName: { type: String, required: true },
    lastName: { type: String, default: "" },
    name: { type: String, required: true }, // Full name for display/search
    email: { type: String, default: "" },
    mobile: { type: String, default: "" },
    regNo: { type: String },
    certificateTypeId: { type: Schema.Types.ObjectId, ref: "CertificateType", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    downloadCount: { type: Number, default: 0 },
    lastDownloadAt: { type: Date },
    linkedinClicks: { type: Number, default: 0 },
    lastLinkedinClickAt: { type: Date },
    whatsappShares: { type: Number, default: 0 },
    emailStatus: { type: String, enum: ["sent", "failed"] },
    emailSentAt: { type: Date },
    emailAttemptAt: { type: Date },
    emailError: { type: String },
    emailCount: { type: Number, default: 0 },
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
RecipientSchema.index({ eventId: 1, emailStatus: 1 })

export default mongoose.models.Recipient || mongoose.model<IRecipient>("Recipient", RecipientSchema)
