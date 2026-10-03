import { NextRequest, NextResponse } from "next/server"
import { verifyAdminToken } from "@/lib/admin-auth"
import { createBackup, emailBackup, backupRecipient } from "@/lib/backup.server"

export const maxDuration = 60

// GET - Download a full backup (.json.gz)
export async function GET(request: NextRequest) {
  const admin = await verifyAdminToken(request)
  if (!admin) return NextResponse.json({ error: "Admin authentication required" }, { status: 401 })
  try {
    const backup = await createBackup()
    return new NextResponse(new Uint8Array(backup.buffer), {
      headers: {
        "Content-Type": "application/gzip",
        "Content-Disposition": `attachment; filename="${backup.filename}"`,
        "Content-Length": String(backup.bytes),
        "Cache-Control": "no-store",
        "X-Backup-Counts": JSON.stringify(backup.counts)
      }
    })
  } catch (error) {
    console.error("Backup download error:", error)
    return NextResponse.json({ error: "Could not build the backup" }, { status: 500 })
  }
}

// POST - Email a backup to the configured address now
export async function POST(request: NextRequest) {
  const admin = await verifyAdminToken(request)
  if (!admin) return NextResponse.json({ error: "Admin authentication required" }, { status: 401 })
  const to = backupRecipient()
  if (!to) return NextResponse.json({ error: "Set BACKUP_EMAIL or ADMIN_EMAIL in the environment first" }, { status: 400 })
  try {
    const result = await emailBackup(to, "manual")
    if (!result.sent) return NextResponse.json({ error: `Backup built but the email failed: ${result.error}` }, { status: 502 })
    return NextResponse.json({ success: true, to, filename: result.filename, bytes: result.bytes, counts: result.counts })
  } catch (error) {
    console.error("Backup email error:", error)
    return NextResponse.json({ error: "Could not build the backup" }, { status: 500 })
  }
}
