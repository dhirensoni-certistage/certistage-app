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
  // 6-digit code (HMAC hashed) for the in-page verification flow
  codeHash: { type: String },
  attempts: { type: Number, default: 0 },
  userData: {
    name: { type: String, required: true },
    phone: { type: String, required: true },
    organization: { type: String },
    plan: { 
      type: String,
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
