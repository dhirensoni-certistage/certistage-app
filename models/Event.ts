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

export default mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema)
