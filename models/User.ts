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
  /** Extra certificates bought as an add-on; drawn on once the plan's quota for the period is used */
  certificateCredits?: number
  /** Expiry reminder emails sent for the current plan term (key = plan:expiry, see api/cron/plan-reminders) */
  planReminders?: { key: string; d15At?: Date; d3At?: Date; expiredAt?: Date }
  /** "Request early access" clicks on upcoming add-ons (Add-ons page); one entry per add-on */
  addonRequests?: { addonId: string; requestedAt: Date }[]
  isActive: boolean
  isEmailVerified: boolean
  hidePoweredBy?: boolean // hide "Powered by CertiStage" on download pages; honoured only on an active paid plan
  /** Organisation logo shown as the hero on download pages (Cloudinary URL + id for replacement) */
  logo?: string
  logoPublicId?: string
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
    certificateCredits: { type: Number, default: 0 },
    addonRequests: [{ addonId: { type: String, required: true }, requestedAt: { type: Date, default: Date.now } }],
    planReminders: { key: { type: String }, d15At: { type: Date }, d3At: { type: Date }, expiredAt: { type: Date } },
    isActive: { type: Boolean, default: true },
    isEmailVerified: { type: Boolean, default: false },
    hidePoweredBy: { type: Boolean, default: false },
    logo: { type: String },
    logoPublicId: { type: String }
  },
  { timestamps: true }
)

// Indexes for faster queries
UserSchema.index({ plan: 1 })
UserSchema.index({ isActive: 1 })
UserSchema.index({ createdAt: -1 })
UserSchema.index({ plan: 1, isActive: 1 })

export default mongoose.models.User || mongoose.model<IUser>("User", UserSchema)
