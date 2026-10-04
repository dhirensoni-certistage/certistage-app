import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { categoryColumns } from "@/lib/event-categories"
import { columnHeading } from "@/lib/certificate-fields"
import CertificateType from "@/models/CertificateType"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"

type ColumnSource = "certificate" | "event" | "excel"

// GET - Extra Excel columns for this certificate, so the editor, the sample Excel and the
// Add-recipient form all offer the same list before anything is imported:
//   certificate: Excel-column fields already placed on the design
//   event:       columns suggested by the event type (lib/event-categories)
//   excel:       headings found in imported recipients' customFields
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const typeId = new URL(request.url).searchParams.get("typeId")
    if (!typeId || !mongoose.isValidObjectId(typeId)) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
    }

    const certType = await CertificateType.findById(typeId)
      .select("eventId customFields.variable")
      .lean<{ eventId: mongoose.Types.ObjectId; customFields?: { variable: string }[] }>()
    if (!certType) return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    const event = await Event.findById(certType.eventId)
      .select("ownerId category")
      .lean<{ ownerId: mongoose.Types.ObjectId; category?: string }>()
    if (!event || String(event.ownerId) !== auth.userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const rows = await Recipient.aggregate([
      { $match: { certificateTypeId: new mongoose.Types.ObjectId(typeId) } },
      { $project: { kv: { $objectToArray: { $ifNull: ["$customFields", {}] } } } },
      { $unwind: "$kv" },
      { $group: { _id: "$kv.k", sample: { $first: "$kv.v" } } },
      { $sort: { _id: 1 } },
      { $limit: 50 }
    ])
    const samples = new Map(rows.map((r) => [String(r._id), r.sample == null ? "" : String(r.sample)]))

    const columns: { heading: string; sample: string; source: ColumnSource }[] = []
    const add = (heading: string | null, source: ColumnSource) => {
      if (!heading || columns.some((c) => c.heading === heading)) return
      columns.push({ heading, sample: samples.get(heading) || "", source })
    }
    for (const f of certType.customFields || []) add(columnHeading(f.variable), "certificate")
    for (const heading of categoryColumns(event.category)) add(heading, "event")
    for (const heading of samples.keys()) add(heading, "excel")

    return NextResponse.json({ columns })
  } catch (error) {
    console.error("Certificate columns GET error:", error)
    return NextResponse.json({ error: "Failed to load columns" }, { status: 500 })
  }
}
