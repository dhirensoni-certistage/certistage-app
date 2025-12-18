import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const plan = searchParams.get("plan") || ""

    // Build query
    const query: Record<string, unknown> = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { organization: { $regex: search, $options: "i" } }
      ]
    }
    
    if (plan && plan !== "all") {
      query.plan = plan
    }

    // Get total count
    const total = await User.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get users with events count
    const users = await User.aggregate([
      { $match: query },
      { $sort: { createdAt: -1 } },
      { $skip: (page - 1) * limit },
      { $limit: limit },
      {
        $lookup: {
          from: "events",
          localField: "_id",
          foreignField: "ownerId",
          as: "events"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          email: 1,
          plan: 1,
          isActive: 1,
          createdAt: 1,
          eventsCount: { $size: "$events" }
        }
      }
    ])

    return NextResponse.json({
      users,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    })
  } catch (error) {
    console.error("Users API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    )
  }
}