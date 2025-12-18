import mongoose, { Schema, Document } from "mongoose"

export interface IPasswordResetToken extends Document {
  userId: mongoose.Types.ObjectId
  token: string
  expiresAt: Date
  used: boolean
  createdAt: Date
}

const PasswordResetTokenSchema = new Schema<IPasswordResetToken>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    token: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    used: { type: Boolean, default: false }
  },
  { timestamps: true }
)

// Auto-delete expired tokens
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 })

export default mongoose.models.PasswordResetToken || 
  mongoose.model<IPasswordResetToken>("PasswordResetToken", PasswordResetTokenSchema)
