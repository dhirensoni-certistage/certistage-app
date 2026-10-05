import mongoose, { Schema, Document } from "mongoose"

export type TicketStatus = "open" | "in_progress" | "closed"

export interface ITicketReply {
  author: "admin" | "customer"
  name: string
  message: string
  at: Date
  emailSent?: boolean
}

/** A support request from a signed-in organiser (Support page). Listed in Admin > Support. */
export interface ISupportTicket extends Document {
  number: string // T-20261006-AB12C, shown to the customer
  userId: mongoose.Types.ObjectId
  name: string
  email: string
  phone?: string
  organization?: string
  plan: string
  subject: string
  message: string
  eventName?: string
  pageUrl?: string
  status: TicketStatus
  /** The conversation after the first message, newest last */
  replies: ITicketReply[]
  lastReplyAt?: Date
  lastReplyBy?: "admin" | "customer"
  adminNote?: string
  emailSent: boolean
  emailError?: string
  closedAt?: Date
  createdAt: Date
  updatedAt: Date
}

const SupportTicketSchema = new Schema<ISupportTicket>(
  {
    number: { type: String, required: true, unique: true },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    name: { type: String, default: "" },
    email: { type: String, required: true },
    phone: { type: String },
    organization: { type: String },
    plan: { type: String, default: "free" },
    subject: { type: String, required: true },
    message: { type: String, required: true },
    eventName: { type: String },
    pageUrl: { type: String },
    status: { type: String, enum: ["open", "in_progress", "closed"], default: "open", index: true },
    replies: [{
      author: { type: String, enum: ["admin", "customer"], required: true },
      name: { type: String, default: "" },
      message: { type: String, required: true },
      at: { type: Date, default: Date.now },
      emailSent: { type: Boolean }
    }],
    lastReplyAt: { type: Date },
    lastReplyBy: { type: String, enum: ["admin", "customer"] },
    adminNote: { type: String },
    emailSent: { type: Boolean, default: false },
    emailError: { type: String },
    closedAt: { type: Date }
  },
  { timestamps: true }
)

SupportTicketSchema.index({ status: 1, createdAt: -1 })

export default mongoose.models.SupportTicket || mongoose.model<ISupportTicket>("SupportTicket", SupportTicketSchema)
