import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get("startDate")
    const endDate = searchParams.get("endDate")

    const dateFilter: Record<string, unknown> = {}
    if (startDate) dateFilter.$gte = new Date(startDate)
    if (endDate) dateFilter.$lte = new Date(endDate)
    const hasDateFilter = Object.keys(dateFilter).length > 0

    // Certificate trends (last 30 days or date range)
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const trendMatch = hasDateFilter ? { createdAt: dateFilter } : { createdAt: { $gte: thirtyDaysAgo } }
    
    const certificateTrends = await Recipient.aggregate([
      { $match: trendMatch },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ])

    // Top 10 users by events created
    const topUsers = await Event.aggregate([
      ...(hasDateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
      { $group: { _id: "$ownerId", eventsCount: { $sum: 1 } } },
      { $sort: { eventsCount: -1 } },
      { $limit: 10 },
      { $lookup: { from: "users", localField: "_id", foreignField: "_id", as: "user" } },
      { $unwind: "$user" },
      { $lookup: { from: "recipients", let: { ownerId: "$_id" }, pipeline: [
        { $lookup: { from: "events", localField: "eventId", foreignField: "_id", as: "event" } },
        { $unwind: "$event" },
        { $match: { $expr: { $eq: ["$event.ownerId", "$$ownerId"] } } }
      ], as: "recipients" } },
      { $project: { user: { _id: "$user._id", name: "$user.name", email: "$user.email" }, eventsCount: 1, recipientsCount: { $size: "$recipients" } } }
    ])

    // Top 10 events by recipient count
    const topEvents = await Event.aggregate([
      ...(hasDateFilter ? [{ $match: { createdAt: dateFilter } }] : []),
      { $lookup: { from: "recipients", localField: "_id", foreignField: "eventId", as: "recipients" } },
      { $lookup: { from: "users", localField: "ownerId", foreignField: "_id", as: "owner" } },
      { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } },
      { $project: { event: { _id: "$_id", name: "$name" }, owner: { _id: "$owner._id", name: "$owner.name", email: "$owner.email" }, recipientsCount: { $size: "$recipients" } } },
      { $sort: { recipientsCount: -1 } },
      { $limit: 10 }
    ])

    // Download stats
    const downloadMatch = hasDateFilter ? { createdAt: dateFilter } : {}
    const [totalRecipients, downloadedRecipients] = await Promise.all([
      Recipient.countDocuments(downloadMatch),
      Recipient.countDocuments({ ...downloadMatch, downloadCount: { $gt: 0 } })
    ])

    const downloadRate = totalRecipients > 0 ? Math.round((downloadedRecipients / totalRecipients) * 100) : 0

    return NextResponse.json({
      certificateTrends,
      topUsers,
      topEvents,
      downloadStats: {
        total: totalRecipients,
        downloaded: downloadedRecipients,
        pending: totalRecipients - downloadedRecipients,
        downloadRate
      }
    })
  } catch (error) {
    console.error("Analytics API error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}