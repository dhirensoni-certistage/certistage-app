import mongoose, { Schema, Document } from "mongoose"

export interface IEmailLog extends Document {
  to: string
  subject: string
  template: string
  htmlContent: string
  status: "initiated" | "sent" | "failed" | "read"
  errorMessage?: string
  metadata?: {
    userId?: string
    userName?: string
    type?: string
    [key: string]: any
  }
  sentAt?: Date
  readAt?: Date
  createdAt: Date
  updatedAt: Date
}

const EmailLogSchema = new Schema<IEmailLog>(
  {
    to: { type: String, required: true, index: true },
    subject: { type: String, required: true },
    template: { type: String, required: true, index: true },
    htmlContent: { type: String, required: true },
    status: {
      type: String,
      enum: ["initiated", "sent", "failed", "read"],
      default: "initiated",
      index: true
    },
    errorMessage: { type: String },
    metadata: { type: Schema.Types.Mixed },
    sentAt: { type: Date },
    readAt: { type: Date }
  },
  { timestamps: true }
)

// Indexes for faster queries
EmailLogSchema.index({ createdAt: -1 })
EmailLogSchema.index({ status: 1, createdAt: -1 })
EmailLogSchema.index({ template: 1, status: 1 })

export default mongoose.models.EmailLog || mongoose.model<IEmailLog>("EmailLog", EmailLogSchema)
