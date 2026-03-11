import mongoose, { Schema, Document } from "mongoose"

export interface IUser extends Document {
  name: string
  email: string
  password: string
  phone: string
  organization?: string
  plan: string
  pendingPlan?: string | null
  planStartDate?: Date
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
    plan: { type: String, default: "free" },
    pendingPlan: {
      type: String,
      default: null
    },
    planStartDate: { type: Date },
    planExpiresAt: { type: Date },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// Indexes for faster queries
UserSchema.index({ plan: 1 })
UserSchema.index({ isActive: 1 })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ plan: 1, isActive: 1 })

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
