import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import { requireClientUser } from "@/lib/client-auth.server"
import { verifyEventOwnership } from "@/lib/plan-limits"
import { logAudit } from "@/lib/audit-logger"
import {
  countCertificateEmails,
  sendCertificateEmailBatch,
  type CertificateEmailMode
} from "@/lib/certificate-email.server"

// Certificate emails to recipients. See lib/certificate-email.server.ts.

function emailConfigured(): boolean {
  return !!(process.env.BREVO_API_KEY || process.env.SENDGRID_API_KEY || (process.env.SMTP_USER && process.env.SMTP_PASS))
}

async function authorise(request: NextRequest, eventId: string | null, certificateTypeId: string | null) {
  const auth = await requireClientUser(request)
  if (auth.response) return { response: auth.response }
  if (!eventId || !mongoose.isValidObjectId(eventId)) {
    return { response: NextResponse.json({ error: "Event ID required" }, { status: 400 }) }
  }
  if (certificateTypeId && !mongoose.isValidObjectId(certificateTypeId)) {
    return { response: NextResponse.json({ error: "Invalid certificate type" }, { status: 400 }) }
  }
  const isOwner = await verifyEventOwnership(eventId, auth.userId)
  if (!isOwner) return { response: NextResponse.json({ error: "Access denied" }, { status: 403 }) }
  return { userId: auth.userId }
}

// GET ?eventId=&certificateTypeId= - how many recipients can be emailed, and how many were
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const certificateTypeId = searchParams.get("certificateTypeId") || null
    const auth = await authorise(request, eventId, certificateTypeId)
    if (auth.response) return auth.response

    const counts = await countCertificateEmails({ eventId: eventId as string, certificateTypeId })
    return NextResponse.json({ counts, configured: emailConfigured() })
  } catch (error) {
    console.error("Certificate email GET error:", error)
    return NextResponse.json({ error: "Failed to load email status" }, { status: 500 })
  }
}

// POST { eventId, certificateTypeId?, mode: "unsent" | "all" | "selected", recipientIds?, since? }
// Sends one batch and reports how many are left; the browser calls again until remaining is 0.
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const eventId = typeof body.eventId === "string" ? body.eventId : null
    const certificateTypeId = typeof body.certificateTypeId === "string" && body.certificateTypeId !== "all" ? body.certificateTypeId : null
    const mode: CertificateEmailMode = ["unsent", "all", "selected"].includes(body.mode) ? body.mode : "unsent"
    const recipientIds: string[] = Array.isArray(body.recipientIds) ? body.recipientIds.filter((id: unknown) => typeof id === "string") : []
    const since = typeof body.since === "string" && !Number.isNaN(Date.parse(body.since)) ? new Date(body.since) : undefined

    const auth = await authorise(request, eventId, certificateTypeId)
    if (auth.response) return auth.response

    if (!emailConfigured()) {
      return NextResponse.json({ error: "Email sending is not set up on this server yet. Ask support@certistage.com." }, { status: 503 })
    }
    if (mode === "selected" && recipientIds.length === 0) {
      return NextResponse.json({ error: "Select at least one recipient" }, { status: 400 })
    }

    const result = await sendCertificateEmailBatch(
      { eventId: eventId as string, certificateTypeId, mode, recipientIds, since },
      { origin: new URL(request.url).origin, userId: auth.userId as string }
    )

    if (result.processed > 0) {
      await logAudit({
        userId: auth.userId as string,
        action: "EMAIL_CERTIFICATES",
        resourceId: certificateTypeId || (eventId as string),
        details: { eventId, certificateTypeId, mode, sent: result.sent, failed: result.failed, remaining: result.remaining },
        status: result.failed > 0 && result.sent === 0 ? "FAILURE" : result.failed > 0 ? "WARNING" : "SUCCESS"
      })
    }

    return NextResponse.json(result, { status: result.error && result.sent === 0 ? 502 : 200 })
  } catch (error) {
    console.error("Certificate email POST error:", error)
    return NextResponse.json({ error: "Failed to send certificate emails" }, { status: 500 })
  }
}
