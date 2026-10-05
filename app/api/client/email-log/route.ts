import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { verifyEventOwnership } from "@/lib/plan-limits"
import { deliveredCondition, deliveryGraceCutoff, displayStatus, PROVIDERS_WITHOUT_DELIVERY_EVENT } from "@/lib/email-events"
import { emailQuota } from "@/lib/email-delivery"
import EmailDelivery from "@/models/EmailDelivery"
import Recipient from "@/models/Recipient"
import CertificateType from "@/models/CertificateType"

const PAGE_SIZE = 25
const STATUSES = ["sent", "delivered", "opened", "clicked", "bounced", "failed", "spam"] as const
type StatusFilter = (typeof STATUSES)[number]

const OK = { status: { $nin: ["failed", "bounced", "complained"] } }

/** Mongo condition for each status shown in the log (see displayStatus) */
function statusCondition(status: StatusFilter): Record<string, unknown> {
  switch (status) {
    case "failed": return { status: "failed" }
    case "bounced": return { status: "bounced" }
    case "spam": return { status: "complained" }
    case "clicked": return { ...OK, clickedAt: { $exists: true } }
    case "opened": return { ...OK, openedAt: { $exists: true }, clickedAt: { $exists: false } }
    case "delivered": return { ...OK, openedAt: { $exists: false }, ...deliveredCondition() }
    case "sent": return {
      status: { $in: ["sent", "sending"] },
      deliveredAt: { $exists: false },
      openedAt: { $exists: false },
      // ZeptoMail emails past the grace period already count as delivered
      $nor: [{ provider: { $in: PROVIDERS_WITHOUT_DELIVERY_EVENT }, sentAt: { $lte: deliveryGraceCutoff() } }]
    }
  }
}

const escapeRegex = (v: string) => v.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
const csvCell = (v: unknown) => {
  const s = v == null ? "" : String(v)
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}
const iso = (d?: Date | null) => (d ? new Date(d).toISOString() : "")

// GET - the organizer's Email log for one event: rows, summary and CSV export
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const params = new URL(request.url).searchParams
    const eventId = params.get("eventId") || ""
    const typeId = params.get("typeId") || ""
    const status = params.get("status") || ""
    const q = (params.get("q") || "").trim().slice(0, 100)
    const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1)
    const asCsv = params.get("format") === "csv"

    if (!mongoose.isValidObjectId(eventId)) return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    if (!(await verifyEventOwnership(eventId, auth.userId))) return NextResponse.json({ error: "Access denied" }, { status: 403 })

    const scope: Record<string, unknown> = { eventId: new mongoose.Types.ObjectId(eventId) }
    if (typeId && mongoose.isValidObjectId(typeId)) scope.certificateTypeId = new mongoose.Types.ObjectId(typeId)

    const filter: Record<string, unknown> = { ...scope }
    if ((STATUSES as readonly string[]).includes(status)) Object.assign(filter, statusCondition(status as StatusFilter))
    if (q) {
      const rx = new RegExp(escapeRegex(q), "i")
      const or = [{ to: rx }, { recipientName: rx }]
      // statusCondition("delivered") also uses $or; combine both with $and
      if (filter.$or) {
        filter.$and = [{ $or: filter.$or }, { $or: or }]
        delete filter.$or
      } else {
        filter.$or = or
      }
    }

    const types = await CertificateType.find({ eventId }).select("name").lean<{ _id: mongoose.Types.ObjectId; name: string }[]>()
    const typeName = new Map(types.map((t) => [String(t._id), t.name]))

    const query = EmailDelivery.find(filter).sort({ createdAt: -1 })
    const docs = asCsv
      ? await query.limit(50000).lean<any[]>()
      : await query.skip((page - 1) * PAGE_SIZE).limit(PAGE_SIZE).lean<any[]>()

    const recipients = await Recipient.find({ _id: { $in: docs.map((d) => d.recipientId) } })
      .select("downloadCount lastDownloadAt")
      .lean<{ _id: mongoose.Types.ObjectId; downloadCount?: number; lastDownloadAt?: Date }[]>()
    const downloads = new Map(recipients.map((r) => [String(r._id), r]))

    const rows = docs.map((d) => {
      const r = downloads.get(String(d.recipientId))
      return {
        id: String(d._id),
        sentAt: d.sentAt || d.createdAt,
        recipientName: d.recipientName,
        to: d.to,
        certificate: typeName.get(String(d.certificateTypeId)) || "",
        kind: d.kind,
        status: displayStatus(d),
        error: d.error || null,
        bounceType: d.bounceType || null,
        deliveredAt: d.deliveredAt || null,
        openedAt: d.openedAt || null,
        openCount: d.openCount || 0,
        clickedAt: d.clickedAt || null,
        clickCount: d.clickCount || 0,
        downloadedAt: r && (r.downloadCount || 0) > 0 ? r.lastDownloadAt || true : null
      }
    })

    if (asCsv) {
      const header = ["Sent at", "Name", "Email", "Certificate", "Type", "Status", "Reason", "Delivered at", "Opened at", "Opens", "Clicked at", "Clicks", "Downloaded"]
      const lines = rows.map((r) => [
        iso(r.sentAt), r.recipientName, r.to, r.certificate, r.kind === "reminder" ? "Reminder" : "Certificate",
        r.status, r.error || "", iso(r.deliveredAt), iso(r.openedAt), r.openCount, iso(r.clickedAt), r.clickCount,
        r.downloadedAt ? "Yes" : "No"
      ].map(csvCell).join(","))
      return new NextResponse([header.join(","), ...lines].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="email-log.csv"`
        }
      })
    }

    // Summary for the whole event (or certificate), not the current filter
    const count = (extra: Record<string, unknown>) => EmailDelivery.countDocuments({ ...scope, ...extra })
    const [total, failed, bounced, spam, delivered, opened, clicked, filtered, emailedIds, quota] = await Promise.all([
      count({}),
      count({ status: "failed" }),
      count({ status: "bounced" }),
      count({ status: "complained" }),
      count({ ...OK, ...deliveredCondition() }),
      count({ ...OK, openedAt: { $exists: true } }),
      count({ ...OK, clickedAt: { $exists: true } }),
      EmailDelivery.countDocuments(filter),
      EmailDelivery.distinct("recipientId", { ...scope, status: { $ne: "failed" } }),
      emailQuota(auth.userId)
    ])
    const downloaded = emailedIds.length
      ? await Recipient.countDocuments({ _id: { $in: emailedIds }, downloadCount: { $gt: 0 } })
      : 0

    return NextResponse.json({
      rows,
      page,
      pageSize: PAGE_SIZE,
      filtered,
      summary: {
        total,
        sent: total - failed,
        delivered,
        opened,
        clicked,
        bounced,
        failed,
        spam,
        recipients: emailedIds.length,
        downloaded
      },
      quota,
      certificateTypes: types.map((t) => ({ id: String(t._id), name: t.name }))
    })
  } catch (error) {
    console.error("Email log GET error:", error)
    return NextResponse.json({ error: "Failed to load email log" }, { status: 500 })
  }
}
