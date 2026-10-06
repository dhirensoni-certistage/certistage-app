import { NextRequest, NextResponse } from "next/server"
import { randomUUID } from "crypto"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { verifyEventOwnership } from "@/lib/plan-limits"
import {
  BATCH_SIZE,
  deliveryStats,
  emailProvider,
  emailQuota,
  isDeliveryMode,
  sendBatch,
  type EmailQuota
} from "@/lib/email-delivery"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import User from "@/models/User"

export const maxDuration = 60

async function readScope(eventId: unknown, typeId: unknown, userId: string) {
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

/** How many more emails can go out right now */
function sendable(quota: EmailQuota): { max: number; stopped: "quota" | "daily" | null } {
  const left = quota.remaining === -1 ? Infinity : quota.remaining
  const today = quota.todayCap === null ? Infinity : Math.max(0, quota.todayCap - quota.todayUsed)
  if (left <= 0) return { max: 0, stopped: "quota" }
  if (today <= 0) return { max: 0, stopped: "daily" }
  return { max: Math.min(BATCH_SIZE, left, today), stopped: null }
}

// GET - counts and emails left, for the "Email certificates" dialog
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const params = new URL(request.url).searchParams
    const scope = await readScope(params.get("eventId"), params.get("typeId"), auth.userId)
    if (scope.error) return scope.error

    const [stats, quota] = await Promise.all([deliveryStats(scope.eventId, scope.typeId), emailQuota(auth.userId)])
    return NextResponse.json({ configured: emailProvider() !== null, stats, quota })
  } catch (error) {
    console.error("Email delivery GET error:", error)
    return NextResponse.json({ error: "Failed to load email details" }, { status: 500 })
  }
}

// POST - send one batch of a run; the dialog calls again with the same runId while `remaining` > 0
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const body = await request.json().catch(() => ({}))
    if (!isDeliveryMode(body.mode)) return NextResponse.json({ error: "Choose who to email" }, { status: 400 })
    const mode = body.mode
    const runId = typeof body.runId === "string" && /^[\w-]{8,64}$/.test(body.runId) ? body.runId : randomUUID()
    const scope = await readScope(body.eventId, body.typeId, auth.userId)
    if (scope.error) return scope.error

    if (!emailProvider()) {
      return NextResponse.json({ error: "Email sending is not set up yet. Please contact support." }, { status: 503 })
    }

    const quota = await emailQuota(auth.userId)
    const room = sendable(quota)
    if (room.max <= 0) {
      const stats = await deliveryStats(scope.eventId, scope.typeId)
      return NextResponse.json({ runId, sent: 0, failed: 0, remaining: 0, stopped: room.stopped, stats, quota })
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
        runId,
        eventName: event?.name || "the event",
        issuer,
        replyTo: user?.email,
        typeNames: new Map(types.map((t) => [String(t._id), t.name]))
      },
      mode,
      room.max
    )

    const [stats, after] = await Promise.all([deliveryStats(scope.eventId, scope.typeId, runId), emailQuota(auth.userId)])
    const remaining = mode === "new" ? stats.notEmailed : mode === "pending" ? stats.pendingInRun : stats.allInRun
    const next = sendable(after)
    return NextResponse.json({ runId, ...result, remaining, stopped: remaining > 0 ? next.stopped : null, stats, quota: after })
  } catch (error) {
    console.error("Email delivery POST error:", error)
    return NextResponse.json({ error: "Failed to send emails" }, { status: 500 })
  }
}
