import mongoose from "mongoose"

const emailVerificationTokenSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  token: {
    type: String,
    required: true,
    unique: true
  },
  userData: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    organization: { type: String },
    plan: { 
      type: String, 
      enum: ["free", "professional", "enterprise", "premium"],
      default: "free"
    }
  },
  expiresAt: {
    type: Date,
    required: true,
    default: () => new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours
  },
  used: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
})

// Auto-delete expired tokens
emailVerificationTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

const EmailVerificationToken = mongoose.models.EmailVerificationToken || 
  mongoose.model("EmailVerificationToken", emailVerificationTokenSchema)

export default EmailVerificationToken