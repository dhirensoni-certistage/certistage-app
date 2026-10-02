import { NextRequest, NextResponse } from "next/server"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

const SUPPORT_EMAIL = "support@certistage.com"

const TOPICS: Record<string, string> = {
  general: "General question",
  support: "Help with my account or an event",
  pricing: "Pricing and plans",
  partnership: "Partnership",
  feedback: "Feedback"
}

const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string))

// POST - Contact form: emails the support inbox
export async function POST(request: NextRequest) {
  try {
    const limit = await checkRateLimit("contact", getClientIP(request))
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many messages sent. Please try again in a few minutes.")
    }

    const body = await request.json()
    const name = String(body.name || "").trim()
    const email = String(body.email || "").trim().toLowerCase()
    const phone = String(body.phone || "").trim()
    const organization = String(body.organization || "").trim()
    const topic = TOPICS[String(body.topic || "")] ? String(body.topic) : "general"
    const message = String(body.message || "").trim()

    if (!name || !email || !phone || !message) {
      return NextResponse.json({ error: "Name, email, phone and message are required" }, { status: 400 })
    }
    if (phone.replace(/\D/g, "").length < 8) {
      return NextResponse.json({ error: "Please enter a valid phone number" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }
    if (name.length > 120 || organization.length > 160 || phone.length > 30 || message.length > 5000) {
      return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 })
    }

    const html = renderInternalEmail({
      title: "New contact form message",
      rows: [["Name", name], ["Email", email], ["Phone", phone], ["Organization", organization || "-"], ["Topic", TOPICS[topic]]],
      message,
      note: `Reply directly to ${escapeHtml(email)}.`
    })

    const result = await sendEmail({
      to: SUPPORT_EMAIL,
      subject: `[Contact] ${TOPICS[topic]}: ${name}${organization ? ` (${organization})` : ""}`,
      html,
      template: "contact",
      metadata: { type: "contact", senderEmail: email }
    })

    if (!result.success) {
      console.error("Contact email failed:", result.error)
      return NextResponse.json(
        { error: `We could not send your message right now. Please email us directly at ${SUPPORT_EMAIL}.` },
        { status: 502 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Contact POST error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
