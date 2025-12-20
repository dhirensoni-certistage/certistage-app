import mongoose, { Schema, Document } from "mongoose"

export interface IEvent extends Document {
  name: string
  description?: string
  ownerId: mongoose.Types.ObjectId
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const EventSchema = new Schema<IEvent>(
  {
    name: { type: String, required: true },
    description: { type: String },
    ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

// Indexes for faster queries
EventSchema.index({ ownerId: 1 })
EventSchema.index({ ownerId: 1, isActive: 1 })
EventSchema.index({ isActive: 1, createdAt: -1 })

export default mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema)
