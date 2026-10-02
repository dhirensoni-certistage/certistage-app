import mongoose, { Schema, Document } from "mongoose"

export interface ILoginOtp extends Document {
  email: string
  codeHash: string
  attempts: number
  used: boolean
  expiresAt: Date
  createdAt: Date
}

const LoginOtpSchema = new Schema<ILoginOtp>(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    used: { type: Boolean, default: false },
    expiresAt: { type: Date, required: true }
  },
  { timestamps: true }
)

// MongoDB removes the document once it has expired
LoginOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.LoginOtp || mongoose.model<ILoginOtp>("LoginOtp", LoginOtpSchema)
