import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import User from "@/models/User"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB()
    const { eventId } = await params

    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Get owner info
    const owner = await User.findById(event.ownerId).select("name email").lean()

    // Get certificate types with recipient counts
    const certificateTypes = await CertificateType.aggregate([
      { $match: { eventId: event._id } },
      {
        $lookup: {
          from: "recipients",
          localField: "_id",
          foreignField: "certificateTypeId",
          as: "recipients"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          isActive: 1,
          createdAt: 1,
          recipientsCount: { $size: "$recipients" },
          downloadedCount: {
            $size: {
              $filter: {
                input: "$recipients",
                cond: { $gt: ["$$this.downloadCount", 0] }
              }
            }
          }
        }
      }
    ])

    // Calculate stats
    const totalRecipients = certificateTypes.reduce((sum, ct) => sum + ct.recipientsCount, 0)
    const totalDownloaded = certificateTypes.reduce((sum, ct) => sum + ct.downloadedCount, 0)

    return NextResponse.json({
      event,
      owner,
      certificateTypes,
      stats: {
        totalCertificateTypes: certificateTypes.length,
        totalRecipients,
        totalDownloaded,
        downloadRate: totalRecipients > 0 ? Math.round((totalDownloaded / totalRecipients) * 100) : 0
      }
    })
  } catch (error) {
    console.error("Event details API error:", error)
    return NextResponse.json({ error: "Failed to fetch event" }, { status: 500 })
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  try {
    await connectDB()
    const { eventId } = await params
    const body = await request.json()

    const event = await Event.findById(eventId)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (typeof body.isActive === "boolean") {
      event.isActive = body.isActive
      await event.save()
    }

    return NextResponse.json({ success: true, event: { _id: event._id, isActive: event.isActive } })
  } catch (error) {
    console.error("Event update API error:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}