import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  phone: string
  organization?: string
  plan: "free" | "professional" | "enterprise" | "premium"
  planExpiresAt?: Date
  isActive: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    organization: { type: String },
    plan: { 
      type: String, 
      enum: ["free", "professional", "enterprise", "premium"],
      default: "free"
    },
    planExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
