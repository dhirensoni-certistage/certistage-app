import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { verifyEventOwnership } from "@/lib/plan-limits"
import {
  BATCH_SIZE,
  MAX_PER_RECIPIENT,
  MIN_GAP_HOURS,
  deliveryStats,
  emailProvider,
  emailQuota,
  sendBatch,
  type DeliveryMode
} from "@/lib/email-delivery"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import User from "@/models/User"

export const maxDuration = 60

async function readScope(request: NextRequest, eventId: unknown, typeId: unknown, userId: string) {
  if (typeof eventId !== "string" || !mongoose.isValidObjectId(eventId)) {
    return { error: NextResponse.json({ error: "Event ID required" }, { status: 400 }) }
  }
  if (typeId != null && typeId !== "" && (typeof typeId !== "string" || !mongoose.isValidObjectId(typeId))) {
    return { error: NextResponse.json({ error: "Invalid certificate" }, { status: 400 }) }
  }
  if (!(await verifyEventOwnership(eventId, userId))) {
    return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) }
  }
  const type = typeId ? String(typeId) : null
  if (type && !(await CertificateType.exists({ _id: type, eventId }))) {
    return { error: NextResponse.json({ error: "Certificate not found" }, { status: 404 }) }
  }
  return { eventId, typeId: type }
}

// GET - counts and remaining quota for the "Email certificates" dialog
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const params = new URL(request.url).searchParams
    const scope = await readScope(request, params.get("eventId"), params.get("typeId"), auth.userId)
    if (scope.error) return scope.error

    const [stats, quota] = await Promise.all([deliveryStats(scope.eventId, scope.typeId), emailQuota(auth.userId)])
    return NextResponse.json({
      configured: emailProvider() !== null,
      stats,
      quota,
      rules: { maxPerRecipient: MAX_PER_RECIPIENT, minGapHours: MIN_GAP_HOURS }
    })
  } catch (error) {
    console.error("Email delivery GET error:", error)
    return NextResponse.json({ error: "Failed to load email details" }, { status: 500 })
  }
}

// POST - send one batch; the dialog calls again while `remaining` > 0
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const body = await request.json().catch(() => ({}))
    const mode: DeliveryMode = body.mode === "reminder" ? "reminder" : "new"
    const scope = await readScope(request, body.eventId, body.typeId, auth.userId)
    if (scope.error) return scope.error

    if (!emailProvider()) {
      return NextResponse.json({ error: "Email sending is not set up yet. Please contact support." }, { status: 503 })
    }

    const quota = await emailQuota(auth.userId)
    const planLeft = quota.remaining === -1 ? Infinity : quota.remaining
    const todayLeft = Math.max(0, quota.todayCap - quota.todayUsed)
    const max = Math.min(BATCH_SIZE, planLeft, todayLeft)
    if (max <= 0) {
      const stopped = planLeft <= 0 ? "quota" : "daily"
      return NextResponse.json({ sent: 0, failed: 0, remaining: 0, stopped, quota })
    }

    const [event, user, types] = await Promise.all([
      Event.findById(scope.eventId).select("name").lean<{ name: string }>(),
      User.findById(auth.userId).select("name email organization").lean<{ name?: string; email?: string; organization?: string }>(),
      CertificateType.find({ eventId: scope.eventId }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }[]>()
    ])
    const issuer = user?.organization?.trim() || user?.name?.trim() || "The organizer"

    const result = await sendBatch(
      {
        userId: auth.userId,
        eventId: scope.eventId,
        typeId: scope.typeId,
        eventName: event?.name || "the event",
        issuer,
        replyTo: user?.email,
        typeNames: new Map(types.map((t) => [String(t._id), t.name]))
      },
      mode,
      max
    )

    const [stats, after] = await Promise.all([deliveryStats(scope.eventId, scope.typeId), emailQuota(auth.userId)])
    const remaining = mode === "new" ? stats.notEmailed : stats.reminder
    const afterPlanLeft = after.remaining === -1 ? Infinity : after.remaining
    const stopped = remaining > 0 && afterPlanLeft <= 0 ? "quota" : remaining > 0 && after.todayUsed >= after.todayCap ? "daily" : null
    return NextResponse.json({ ...result, remaining, stopped, stats, quota: after })
  } catch (error) {
    console.error("Email delivery POST error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
