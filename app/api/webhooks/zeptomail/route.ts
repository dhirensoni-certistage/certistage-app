import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { recordEmailEvent, type EmailEvent } from "@/lib/email-events"
import { webhookAuthorized } from "@/lib/email-webhook-auth"

// ZeptoMail webhook (bounces, spam reports). Each message carries the Email log id we sent as
// client_reference. Opens and clicks are tracked by CertiStage itself, so those events are ignored.
function toEvent(name: string, details: any): EmailEvent | null {
  const n = name.toLowerCase()
  const reason = details?.reason || details?.diagnostic_message
  if (n.includes("hardbounce") || n === "hard_bounce") return { type: "bounce", hard: true, reason }
  if (n.includes("softbounce") || n === "soft_bounce") return { type: "bounce", hard: false, reason }
  if (n.includes("feedback") || n.includes("spam") || n.includes("complaint")) return { type: "complaint" }
  return null
}

export async function POST(request: NextRequest) {
  if (!webhookAuthorized(request.url)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const body = await request.json().catch(() => null)
  if (!body) return NextResponse.json({ ok: true })
  try {
    await connectDB()
    const names: string[] = Array.isArray(body.event_name) ? body.event_name : body.event_name ? [body.event_name] : []
    const messages: any[] = Array.isArray(body.event_message) ? body.event_message : body.event_message ? [body.event_message] : []
    for (const message of messages) {
      const ref = message?.email_info?.client_reference
      if (!ref) continue
      const items: any[] = Array.isArray(message.event_data) ? message.event_data : []
      const handled = new Set<string>()
      for (const item of items) {
        const name = String(item?.object || names[0] || "")
        const details = Array.isArray(item?.details) ? item.details[0] : item?.details
        const event = toEvent(name, details)
        if (!event || handled.has(event.type)) continue
        handled.add(event.type)
        await recordEmailEvent(String(ref), event, details?.time ? new Date(details.time) : new Date())
      }
      if (items.length === 0) {
        for (const name of names) {
          const event = toEvent(name, null)
          if (event) await recordEmailEvent(String(ref), event)
        }
      }
    }
  } catch (error) {
    console.error("ZeptoMail webhook error:", error)
  }
  return NextResponse.json({ ok: true })
}
