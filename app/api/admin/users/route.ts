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

    // Get users
    const users = await User.find(query)
      .select("_id name email plan isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Get events count for each user
    const userIds = users.map(u => u._id)
    const eventCounts = await Event.aggregate([
      { $match: { ownerId: { $in: userIds } } },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } }
    ])
    
    // Create a map of userId -> eventCount
    const eventCountMap = new Map(
      eventCounts.map(e => [e._id.toString(), e.count])
    )

    // Format users with actual event counts
    const formattedUsers = users.map(user => ({
      ...user,
      plan: user.plan || "free",
      isActive: user.isActive ?? true,
      eventsCount: eventCountMap.get(user._id.toString()) || 0,
      createdAt: user.createdAt || null
    }))

    return NextResponse.json({
      users: formattedUsers,
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
      { error: "Failed to fetch users", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}