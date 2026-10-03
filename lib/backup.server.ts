import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Admin from "@/models/Admin"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import Payment from "@/models/Payment"
import Settings from "@/models/Settings"
import TrashItem from "@/models/TrashItem"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { serializeBackup, backupFilename } from "@/lib/backup-format"

export interface BackupResult {
  buffer: Buffer
  filename: string
  counts: Record<string, number>
  bytes: number
}

/**
 * Full platform backup. Certificate template images live on Cloudinary and
 * are referenced by URL, so they are not inside the file. Password hashes
 * are left out; admins reset their password after a restore.
 */
export async function createBackup(): Promise<BackupResult> {
  await connectDB()
  const [users, admins, events, certificateTypes, recipients, payments, settings, trashItems] = await Promise.all([
    User.find().select("-password").lean(),
    Admin.find().select("-password").lean(),
    Event.find().lean(),
    CertificateType.find().lean(),
    Recipient.find().lean(),
    Payment.find().lean(),
    Settings.find().lean(),
    TrashItem.find().lean()
  ])
  const collections = { users, admins, events, certificateTypes, recipients, payments, settings, trashItems }
  const counts = Object.fromEntries(Object.entries(collections).map(([k, v]) => [k, v.length]))
  const buffer = serializeBackup(collections)
  return { buffer, filename: backupFilename(), counts, bytes: buffer.length }
}

export function backupRecipient(): string | null {
  return process.env.BACKUP_EMAIL || process.env.ADMIN_EMAIL || null
}

/** Build a backup and email it as an attachment. */
export async function emailBackup(to: string, trigger: "scheduled" | "manual"): Promise<BackupResult & { sent: boolean; error?: string }> {
  const backup = await createBackup()
  const date = new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })
  const html = renderInternalEmail({
    title: `Backup ${date}`,
    rows: [
      ["Users", backup.counts.users],
      ["Events", backup.counts.events],
      ["Certificate types", backup.counts.certificateTypes],
      ["Recipients", backup.counts.recipients],
      ["Payments", backup.counts.payments],
      ["File", `${backup.filename} (${(backup.bytes / 1024).toFixed(0)} KB)`],
      ["Trigger", trigger === "scheduled" ? "Weekly schedule" : "Sent from admin settings"]
    ],
    message: "The attached file is a complete copy of the CertiStage database. Keep it somewhere safe outside your inbox as well.",
    note: `Restore with: node scripts/restore-backup.mjs ${backup.filename} --uri <MONGODB_URI>. Template images stay on Cloudinary and are not in the file.`
  })
  const result = await sendEmail({
    to,
    subject: `CertiStage backup · ${date}`,
    html,
    template: "backup",
    metadata: { type: "backup", trigger, ...backup.counts },
    attachments: [{ filename: backup.filename, content: backup.buffer, contentType: "application/gzip" }]
  })
  return { ...backup, sent: result.success, error: result.success ? undefined : String(result.error) }
}

