import mongoose, { Schema, Document } from "mongoose"

export interface INotification extends Document {
  type: "signup" | "payment" | "event_created" | "system"
  title: string
  description: string
  userId?: mongoose.Types.ObjectId
  metadata?: {
    userName?: string
    userEmail?: string
    eventName?: string
    plan?: string
    amount?: number
    [key: string]: any
  }
  read: boolean
  createdAt: Date
  updatedAt: Date
}

const NotificationSchema = new Schema<INotification>(
  {
    type: {
      type: String,
      enum: ["signup", "payment", "event_created", "system"],
      required: true
    },
    title: { type: String, required: true },
    description: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: "User" },
    metadata: { type: Schema.Types.Mixed },
    read: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// Indexes for faster queries
NotificationSchema.index({ createdAt: -1 })
NotificationSchema.index({ read: 1 })
NotificationSchema.index({ type: 1 })

export default mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema)
