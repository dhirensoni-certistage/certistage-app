import { NextRequest, NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"
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

    if (!name || !email || !message) {
      return NextResponse.json({ error: "Name, email and message are required" }, { status: 400 })
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }
    if (name.length > 120 || organization.length > 160 || phone.length > 30 || message.length > 5000) {
      return NextResponse.json({ error: "One of the fields is too long" }, { status: 400 })
    }

    const rows = [
      ["Name", name],
      ["Email", email],
      ["Phone", phone || "-"],
      ["Organization", organization || "-"],
      ["Topic", TOPICS[topic]]
    ]
      .map(([k, v]) => `<tr><td style="padding:6px 12px 6px 0;color:#6b7280;white-space:nowrap">${k}</td><td style="padding:6px 0">${escapeHtml(v)}</td></tr>`)
      .join("")

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111; max-width: 640px; margin: 0 auto; padding: 24px;">
        <h2 style="margin: 0 0 16px;">New contact form message</h2>
        <table style="border-collapse: collapse; font-size: 14px;">${rows}</table>
        <div style="margin-top: 20px; padding: 16px; background: #f5f5f5; border-radius: 8px; font-size: 14px; white-space: pre-wrap;">${escapeHtml(message)}</div>
        <p style="margin-top: 20px; font-size: 12px; color: #6b7280;">Reply directly to ${escapeHtml(email)}.</p>
      </div>`

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
