import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import SupportTicket from "@/models/SupportTicket"
import Notification from "@/models/Notification"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { requireClientUser } from "@/lib/client-auth.server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

// POST { id, message } - the customer answers on their own ticket; reopens a closed one
export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const limit = await checkRateLimit("contact", `support-reply:${auth.userId}:${getClientIP(request)}`)
    if (!limit.success) return rateLimitResponse(limit, "Too many messages. Please wait a few minutes and try again.")

    const body = await request.json().catch(() => ({}))
    const message = String(body.message || "").trim()
    if (!mongoose.isValidObjectId(body.id)) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    if (!message) return NextResponse.json({ error: "Write a message first" }, { status: 400 })
    if (message.length > 5000) return NextResponse.json({ error: "Message is too long" }, { status: 400 })

    await connectDB()
    const user = await User.findById(auth.userId).select("name email plan").lean<{ name?: string; email: string; plan?: string }>()
    const now = new Date()
    const ticket = await SupportTicket.findOneAndUpdate(
      { _id: body.id, userId: auth.userId },
      {
        $push: { replies: { author: "customer", name: user?.name || "Customer", message, at: now } },
        $set: { status: "open", lastReplyAt: now, lastReplyBy: "customer", closedAt: null }
      },
      { new: true }
    ).lean<{ _id: unknown; number: string; subject: string; email: string }>()
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    await Notification.create({
      type: "support",
      title: `Reply on ${ticket.number}: ${ticket.subject}`,
      description: `${user?.name || ticket.email} replied on their support ticket`,
      userId: auth.userId,
      metadata: { userName: user?.name, userEmail: ticket.email, ticketId: String(ticket._id), ticketNumber: ticket.number },
      read: false
    }).catch((e) => console.error("Support reply notification failed:", e))

    sendEmail({
      to: process.env.ADMIN_EMAIL || "support@certistage.com",
      replyTo: `${user?.name || "Customer"} <${ticket.email}>`,
      subject: `[Support ${ticket.number}] reply from ${user?.name || ticket.email}: ${ticket.subject}`,
      html: renderInternalEmail({
        title: `Customer reply on ${ticket.number}`,
        rows: [["Ticket", ticket.number], ["Subject", ticket.subject], ["From", `${user?.name || ""} <${ticket.email}>`], ["Plan", user?.plan || "free"]],
        message,
        note: `Answer in <a href="${APP_URL}/admin/support">Admin &gt; Support</a>; the customer gets it by email and on their Support page.`
      }),
      template: "support_request",
      metadata: { type: "support_reply", userId: auth.userId, ticketNumber: ticket.number }
    }).catch((e) => console.error("Support reply email failed:", e))

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Support reply error:", error)
    return NextResponse.json({ error: "Could not send your message" }, { status: 500 })
  }
}
