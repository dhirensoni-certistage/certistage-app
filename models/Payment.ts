import mongoose, { Schema, Document } from "mongoose"

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  orderId: string
  paymentId?: string
  plan: "professional" | "enterprise" | "premium"
  amount: number
  currency: string
  status: "pending" | "success" | "failed" | "refunded"
  razorpaySignature?: string
  webhookVerified?: boolean
  failureReason?: string
  refundAmount?: number
  refundedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const PaymentSchema = new Schema<IPayment>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    orderId: { type: String, required: true, unique: true },
    paymentId: { type: String },
    plan: { 
      type: String, 
      enum: ["professional", "enterprise", "premium"],
      required: true
    },
    amount: { type: Number, required: true },
    currency: { type: String, default: "INR" },
    status: { 
      type: String, 
      enum: ["pending", "success", "failed", "refunded"],
      default: "pending"
    },
    razorpaySignature: { type: String },
    webhookVerified: { type: Boolean, default: false },
    failureReason: { type: String },
    refundAmount: { type: Number },
    refundedAt: { type: Date }
  },
  { timestamps: true }
)

// Indexes for faster queries
PaymentSchema.index({ userId: 1 })
PaymentSchema.index({ status: 1 })
PaymentSchema.index({ status: 1, createdAt: -1 })
PaymentSchema.index({ userId: 1, status: 1 })

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)
