import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { listTrash, restoreBatch, TRASH_RETENTION_DAYS } from "@/lib/trash.server"
import { logAudit } from "@/lib/audit-logger"

// GET - Recently deleted items for the signed-in organiser
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const eventId = new URL(request.url).searchParams.get("eventId")
    const items = await listTrash(auth.userId, eventId)
    return NextResponse.json({ items, retentionDays: TRASH_RETENTION_DAYS })
  } catch (error) {
    console.error("Trash GET error:", error)
    return NextResponse.json({ error: "Failed to load recently deleted items" }, { status: 500 })
  }
}

// POST - Restore a deleted batch
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const { batchId } = await request.json().catch(() => ({}))
    if (!batchId || typeof batchId !== "string") {
      return NextResponse.json({ error: "batchId required" }, { status: 400 })
    }
    const result = await restoreBatch(batchId, auth.userId)
    if (!result.ok) return NextResponse.json({ error: result.error }, { status: result.status })
    await logAudit({ userId: auth.userId, action: "RESTORE_DELETED", resourceId: batchId, details: { certificateTypes: result.certificateTypes, recipients: result.recipients } })
    return NextResponse.json({ success: true, restored: { certificateTypes: result.certificateTypes, recipients: result.recipients } })
  } catch (error) {
    console.error("Trash POST error:", error)
    return NextResponse.json({ error: "Failed to restore" }, { status: 500 })
  }
}
