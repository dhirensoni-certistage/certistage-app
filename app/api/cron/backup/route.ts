import { NextRequest, NextResponse } from "next/server"
import { emailBackup, backupRecipient } from "@/lib/backup.server"

export const maxDuration = 60

/**
 * Weekly backup, fired by the Vercel cron in vercel.json. Vercel sends
 * `Authorization: Bearer <CRON_SECRET>` when that variable is set; without it
 * the route refuses to run so nobody can trigger backups from outside.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }
  const to = backupRecipient()
  if (!to) return NextResponse.json({ error: "BACKUP_EMAIL or ADMIN_EMAIL is not set" }, { status: 500 })
  try {
    const result = await emailBackup(to, "scheduled")
    if (!result.sent) return NextResponse.json({ error: result.error, counts: result.counts }, { status: 502 })
    return NextResponse.json({ success: true, to, filename: result.filename, bytes: result.bytes, counts: result.counts })
  } catch (error) {
    console.error("Scheduled backup error:", error)
    return NextResponse.json({ error: "Backup failed" }, { status: 500 })
  }
}
