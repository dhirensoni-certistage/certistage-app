import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { recordEmailEvent, type EmailEvent } from "@/lib/email-events"
import { webhookAuthorized } from "@/lib/email-webhook-auth"

// Brevo transactional webhook. Certificate emails carry the Email log id in X-Mailin-custom.
// Opens and clicks are tracked by CertiStage itself, so those events are ignored.
function toEvent(e: any): EmailEvent | null {
  switch (String(e?.event || "").toLowerCase()) {
    case "delivered": return { type: "delivered" }
    case "hard_bounce":
    case "invalid_email":
    case "blocked": return { type: "bounce", hard: true, reason: e.reason }
    case "soft_bounce": return { type: "bounce", hard: false, reason: e.reason }
    case "spam":
    case "complaint": return { type: "complaint" }
    default: return null
  }
}

export async function POST(request: NextRequest) {
  if (!webhookAuthorized(request.url)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  const events: any[] = Array.isArray(body) ? body : body ? [body] : []
  try {
    await connectDB()
    for (const e of events) {
      const ref = e?.["X-Mailin-custom"] || e?.["x-mailin-custom"]
      const event = toEvent(e)
      if (!ref || !event) continue
      await recordEmailEvent(String(ref), event, e.date ? new Date(e.date) : new Date())
    }
  } catch (error) {
    console.error("Brevo webhook error:", error)
  }
  return NextResponse.json({ ok: true })
}
