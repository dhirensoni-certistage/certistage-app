import mongoose, { Schema, Document } from "mongoose"

export interface IPayment extends Document {
  userId: mongoose.Types.ObjectId
  orderId: string
  paymentId?: string
  plan: "professional" | "enterprise" | "premium"
  amount: number
  currency: string
  status: "pending" | "success" | "failed"
  razorpaySignature?: string
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
      enum: ["pending", "success", "failed"],
      default: "pending"
    },
    razorpaySignature: { type: String }
  },
  { timestamps: true }
)

export default mongoose.models.Payment || mongoose.model<IPayment>("Payment", PaymentSchema)
