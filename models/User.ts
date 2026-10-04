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
  /**
   * Certificates issued in the current plan period. `key` identifies the
   * period (plan + expiry); when it changes the counter starts again. Deleting
   * recipients never lowers it: issued certificates are consumed quota.
   */
  usage?: {
    key: string
    certificatesIssued: number
  }
  /** Certificate emails sent to recipients: per plan period (same key as usage) and per day */
  emailUsage?: {
    key: string
    sent: number
  }
  emailDay?: {
    day: string
    sent: number
  }
  /** Extra certificate emails bought as an add-on; used after the plan's emails, never expire */
  emailCredits?: number
  isActive: boolean
  isEmailVerified: boolean
  createdAt: Date
  updatedAt: Date
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    // Not required: Google sign-ups have no password or phone (email sign-up checks phone itself)
    password: { type: String },
    phone: { type: String, default: "" },
    organization: { type: String },
    plan: { type: String, default: "free" },
    pendingPlan: {
      type: String,
      default: null
    },
    planStartDate: { type: Date },
    planExpiresAt: { type: Date },
    usage: {
      key: { type: String },
      certificatesIssued: { type: Number, default: 0 }
    },
    emailUsage: {
      key: { type: String },
      sent: { type: Number, default: 0 }
    },
    emailDay: {
      day: { type: String },
      sent: { type: Number, default: 0 }
    },
    emailCredits: { type: Number, default: 0 },
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
