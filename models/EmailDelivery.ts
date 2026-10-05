import mongoose, { Schema, Document } from "mongoose"

export type DeliveryStatus = "sending" | "sent" | "delivered" | "failed" | "bounced" | "complained"

/**
 * One certificate email sent (or attempted) to a recipient; shown in the organizer's Email log.
 * Opens and clicks come from CertiStage's own pixel and link redirect (app/api/e), deliveries,
 * bounces and spam reports from the provider's webhook (app/api/webhooks).
 */
export interface IEmailDelivery extends Document {
  ownerId: mongoose.Types.ObjectId
  eventId: mongoose.Types.ObjectId
  certificateTypeId: mongoose.Types.ObjectId
  recipientId: mongoose.Types.ObjectId
  runId: string // one click of "Send" in the dialog
  to: string
  recipientName: string
  kind: "certificate" | "reminder"
  subject: string
  link: string // where the email's button leads
  status: DeliveryStatus
  error?: string
  provider: string
  sentAt?: Date
  deliveredAt?: Date
  openedAt?: Date
  openCount: number
  clickedAt?: Date
  clickCount: number
  bouncedAt?: Date
  bounceType?: "hard" | "soft"
  complainedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const EmailDeliverySchema = new Schema<IEmailDelivery>(
  {
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
    certificateTypeId: { type: Schema.Types.ObjectId, ref: "CertificateType", required: true },
    recipientId: { type: Schema.Types.ObjectId, ref: "Recipient", required: true },
    runId: { type: String, required: true },
    to: { type: String, required: true },
    recipientName: { type: String, default: "" },
    kind: { type: String, enum: ["certificate", "reminder"], required: true },
    subject: { type: String, default: "" },
    link: { type: String, default: "" },
    status: { type: String, enum: ["sending", "sent", "delivered", "failed", "bounced", "complained"], required: true },
    error: { type: String },
    provider: { type: String, default: "" },
    sentAt: { type: Date },
    deliveredAt: { type: Date },
    openedAt: { type: Date },
    openCount: { type: Number, default: 0 },
    clickedAt: { type: Date },
    clickCount: { type: Number, default: 0 },
    bouncedAt: { type: Date },
    bounceType: { type: String, enum: ["hard", "soft"] },
    complainedAt: { type: Date }
  },
  { timestamps: true }
)

EmailDeliverySchema.index({ eventId: 1, createdAt: -1 })
EmailDeliverySchema.index({ ownerId: 1, createdAt: -1 })
EmailDeliverySchema.index({ recipientId: 1 })

export default mongoose.models.EmailDelivery || mongoose.model<IEmailDelivery>("EmailDelivery", EmailDeliverySchema)
