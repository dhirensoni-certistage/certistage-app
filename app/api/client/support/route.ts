import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { sendEmail } from "@/lib/email"
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

    const rows = [
      ["Name", user.name || "-"],
      ["Email", user.email],
      ["Phone", user.phone || "-"],
      ["Organization", user.organization || "-"],
      ["Plan", `${user.plan || "free"}${user.pendingPlan ? ` (pending: ${user.pendingPlan})` : ""}`],
      ["Event", eventName || "-"],
      ["User ID", auth.userId]
    ]
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap">${k}</td><td style="padding:6px 0">${escapeHtml(String(v))}</td></tr>`)
      .join("")

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 4px;">Support request</h2>
        <p style="margin: 0 0 16px; font-size: 15px;"><strong>${escapeHtml(subject)}</strong></p>
        <table style="border-collapse: collapse; font-size: 14px;">${rows}</table>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Reply directly to ${escapeHtml(user.email)}.${pageUrl ? ` Sent from ${escapeHtml(pageUrl)}.` : ""}</p>
      </div>`

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
