import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  phone: string
  organization?: string
  plan: "free" | "professional" | "enterprise" | "premium"
  pendingPlan?: "professional" | "enterprise" | "premium" | null
  planExpiresAt?: Date
  isActive: boolean
  isEmailVerified: boolean
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
    pendingPlan: {
      type: String,
      enum: ["professional", "enterprise", "premium", null],
      default: null
    },
    planExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
)

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
