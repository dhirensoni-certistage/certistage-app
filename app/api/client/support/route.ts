import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { requireClientUser } from "@/lib/client-auth.server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const SUPPORT_EMAIL = "support@certistage.com"

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))

// POST - Support request from a signed-in customer: emails the support inbox
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

    const html = renderInternalEmail({
      title: `Support request: ${subject}`,
      rows: [
        ["Name", user.name || "-"],
        ["Email", user.email],
        ["Phone", user.phone || "-"],
        ["Organization", user.organization || "-"],
        ["Plan", `${user.plan || "free"}${user.pendingPlan ? ` (pending: ${user.pendingPlan})` : ""}`],
        ["Event", eventName || "-"],
        ["User ID", auth.userId]
      ],
      message,
      note: `Reply directly to ${escapeHtml(user.email)}.${pageUrl ? ` Sent from ${escapeHtml(pageUrl)}.` : ""}`
    })

    const result = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Support] ${user.plan || "free"}: ${subject} (${user.name || user.email})`,
      html,
      template: "support_request",
      metadata: { type: "support_request", userId: auth.userId, senderEmail: user.email }
    })

    if (!result.success) {
      console.error("Support email failed:", result.error)
      return NextResponse.json(
        { error: `We could not send your request right now. Please email us directly at ${SUPPORT_EMAIL}.` },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Support POST error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
