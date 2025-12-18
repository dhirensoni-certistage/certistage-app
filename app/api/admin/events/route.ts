import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import User from "@/models/User"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""

    // Build query
    const query: Record<string, unknown> = {}
    
    if (status === "active") {
      query.isActive = true
    } else if (status === "inactive") {
      query.isActive = false
    }

    // Get total count
    let total = await Event.countDocuments(query)

    // Get events with owner info and counts
    let events = await Event.aggregate([
      { $match: query },
      {
        $lookup: {
          from: "users",
          localField: "ownerId",
          foreignField: "_id",
          as: "owner"
        }
      },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "certificatetypes",
          localField: "_id",
          foreignField: "eventId",
          as: "certificateTypes"
        }
      },
      {
        $lookup: {
          from: "recipients",
          localField: "_id",
          foreignField: "eventId",
          as: "recipients"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          isActive: 1,
          createdAt: 1,
          owner: {
            _id: "$owner._id",
            name: "$owner.name",
            email: "$owner.email"
          },
          certificateTypesCount: { $size: "$certificateTypes" },
          recipientsCount: { $size: "$recipients" }
        }
      },
      { $sort: { createdAt: -1 } }
    ])

    // Filter by search (name or owner email)
    if (search) {
      const searchLower = search.toLowerCase()
      events = events.filter(
        (e) =>
          e.name.toLowerCase().includes(searchLower) ||
          e.owner?.email?.toLowerCase().includes(searchLower) ||
          e.owner?.name?.toLowerCase().includes(searchLower)
      )
      total = events.length
    }

    // Paginate
    const totalPages = Math.ceil(total / limit)
    const paginatedEvents = events.slice((page - 1) * limit, page * limit)

    return NextResponse.json({
      events: paginatedEvents,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    })
  } catch (error) {
    console.error("Events API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch events" },
      { status: 500 }
    )
  }
}