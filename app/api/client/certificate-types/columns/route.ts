import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import CertificateType from "@/models/CertificateType"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"

// GET - Excel column headings imported for this certificate (keys of recipients' customFields),
// so the editor can offer them as fields to place on the design
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const typeId = new URL(request.url).searchParams.get("typeId")
    if (!typeId || !mongoose.isValidObjectId(typeId)) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
    }

    const certType = await CertificateType.findById(typeId).select("eventId").lean<{ eventId: mongoose.Types.ObjectId }>()
    if (!certType) return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    const event = await Event.findById(certType.eventId).select("ownerId").lean<{ ownerId: mongoose.Types.ObjectId }>()
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

    return NextResponse.json({
      columns: rows.map((r) => ({ heading: String(r._id), sample: r.sample == null ? "" : String(r.sample) }))
    })
  } catch (error) {
    console.error("Certificate columns GET error:", error)
    return NextResponse.json({ error: "Failed to load columns" }, { status: 500 })
  }
}
