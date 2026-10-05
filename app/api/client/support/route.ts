import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import SupportTicket from "@/models/SupportTicket"
import Notification from "@/models/Notification"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { requireClientUser } from "@/lib/client-auth.server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const SUPPORT_EMAIL = "support@certistage.com"
const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))

const ticketNumber = () => `T-${new Date().toISOString().slice(0, 10).replace(/-/g, "")}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`

// GET - the signed-in organiser's recent tickets
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    await connectDB()
    const tickets = await SupportTicket.find({ userId: auth.userId })
      .sort({ createdAt: -1 })
      .limit(20)
      .select("number subject status createdAt closedAt")
      .lean()
    return NextResponse.json({ tickets })
  } catch (error) {
    console.error("Support GET error:", error)
    return NextResponse.json({ error: "Failed to load requests" }, { status: 500 })
  }
}

// POST - Support request from a signed-in customer. The ticket is saved first (Admin > Support),
// then the admin is notified in the panel and by email; a mail failure never loses the request.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const limit = await checkRateLimit("contact", `support:${auth.userId}:${getClientIP(request)}`)
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many requests sent. Please wait a few minutes and try again.")
    }

    const body = await request.json()
    const subject = String(body.subject || "").trim()
    const message = String(body.message || "").trim()
    const eventName = String(body.eventName || "").trim()
    const pageUrl = String(body.pageUrl || "").trim()

    if (!subject || !message) {
      return NextResponse.json({ error: "Subject and message are required" }, { status: 400 })
    }
    if (subject.length > 160 || message.length > 5000 || eventName.length > 160 || pageUrl.length > 500) {
      return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(auth.userId).select("name email phone organization plan pendingPlan")
    if (!user) {
      return NextResponse.json({ error: "Account not found" }, { status: 404 })
    }

    const ticket = await SupportTicket.create({
      number: ticketNumber(),
      userId: user._id,
      name: user.name || "",
      email: user.email,
      phone: user.phone,
      organization: user.organization,
      plan: user.plan || "free",
      subject,
      message,
      eventName: eventName || undefined,
      pageUrl: pageUrl || undefined,
      status: "open"
    })

    await Notification.create({
      type: "support",
      title: `Support: ${subject}`,
      description: `${user.name || user.email} (${user.plan || "free"}) opened ticket ${ticket.number}`,
      userId: user._id,
      metadata: { userName: user.name, userEmail: user.email, plan: user.plan, ticketId: String(ticket._id), ticketNumber: ticket.number },
      read: false
    }).catch((e) => console.error("Support notification failed:", e))

    const html = renderInternalEmail({
      title: `Support ticket ${ticket.number}: ${subject}`,
      rows: [
        ["Ticket", ticket.number],
        ["Name", user.name || "-"],
        ["Email", user.email],
        ["Phone", user.phone || "-"],
        ["Organization", user.organization || "-"],
        ["Plan", `${user.plan || "free"}${user.pendingPlan ? ` (pending: ${user.pendingPlan})` : ""}`],
        ["Event", eventName || "-"],
        ["User ID", auth.userId]
      ],
      message,
      note: `Reply directly to ${escapeHtml(user.email)}. Manage it in <a href="${APP_URL}/admin/support">Admin &gt; Support</a>.${pageUrl ? ` Sent from ${escapeHtml(pageUrl)}.` : ""}`
    })

    // Admin inbox first (ADMIN_EMAIL), support@ in copy so the shared inbox keeps a record
    const to = process.env.ADMIN_EMAIL || SUPPORT_EMAIL
    const cc = [process.env.ADMIN_EMAIL ? SUPPORT_EMAIL : "", process.env.ADMIN_CC_EMAIL || ""].filter((a) => a && a !== to)
    const result = await sendEmail({
      to,
      cc: cc.length ? cc : undefined,
      replyTo: `${user.name || "Customer"} <${user.email}>`,
      subject: `[Support ${ticket.number}] ${user.plan || "free"}: ${subject} (${user.name || user.email})`,
      html,
      template: "support_request",
      metadata: { type: "support_request", userId: auth.userId, senderEmail: user.email, ticketNumber: ticket.number }
    })
    await SupportTicket.updateOne(
      { _id: ticket._id },
      { $set: { emailSent: !!result.success, ...(result.success ? {} : { emailError: String(result.error || "Email failed").slice(0, 300) }) } }
    )
    if (!result.success) console.error("Support email failed:", result.error)

    return NextResponse.json({ success: true, ticketNumber: ticket.number })
  } catch (error) {
    console.error("Support POST error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
