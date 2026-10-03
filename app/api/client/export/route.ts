import { NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { requireClientUser } from "@/lib/client-auth.server"

export const maxDuration = 60

const fmt = (d?: Date | string | null) => (d ? new Date(d).toISOString().replace("T", " ").slice(0, 16) : "")

// GET - Everything in this account as one Excel workbook
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    await connectDB()

    const events = await Event.find({ ownerId: auth.userId }).sort({ createdAt: -1 }).lean()
    const eventIds = events.map((e) => e._id)
    const [types, recipients] = await Promise.all([
      CertificateType.find({ eventId: { $in: eventIds } }).lean(),
      Recipient.find({ eventId: { $in: eventIds } }).sort({ createdAt: 1 }).lean()
    ])
    const eventName = new Map(events.map((e: any) => [String(e._id), e.name as string]))
    const typeName = new Map(types.map((t: any) => [String(t._id), t.name as string]))

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(recipients.map((r: any) => ({
      Event: eventName.get(String(r.eventId)) || "",
      Certificate: typeName.get(String(r.certificateTypeId)) || "",
      Prefix: r.prefix || "",
      "First name": r.firstName || "",
      "Last name": r.lastName || "",
      Name: r.name || "",
      Email: r.email || "",
      Mobile: r.mobile || "",
      "Reg no": r.regNo || "",
      Downloads: r.downloadCount || 0,
      "Last download": fmt(r.lastDownloadAt),
      Added: fmt(r.createdAt)
    }))), "Recipients")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(types.map((t: any) => ({
      Event: eventName.get(String(t.eventId)) || "",
      Certificate: t.name,
      "Template URL": t.templateImage || "",
      "Short code": t.shortCode || "",
      Recipients: recipients.filter((r: any) => String(r.certificateTypeId) === String(t._id)).length,
      Created: fmt(t.createdAt)
    }))), "Certificates")
    XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(events.map((e: any) => ({
      Event: e.name,
      Description: e.description || "",
      Active: e.isActive ? "Yes" : "No",
      Certificates: types.filter((t: any) => String(t.eventId) === String(e._id)).length,
      Recipients: recipients.filter((r: any) => String(r.eventId) === String(e._id)).length,
      Created: fmt(e.createdAt)
    }))), "Events")

    const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" }) as Buffer
    const filename = `certistage-export-${new Date().toISOString().slice(0, 10)}.xlsx`
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store"
      }
    })
  } catch (error) {
    console.error("Client export error:", error)
    return NextResponse.json({ error: "Could not build the export" }, { status: 500 })
  }
}
