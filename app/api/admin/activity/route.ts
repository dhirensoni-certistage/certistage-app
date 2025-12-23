import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const type = searchParams.get("type") || "all"
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")

    const activities: any[] = []

    // Fetch based on filter
    if (type === "all" || type === "signup") {
      const users = await User.find()
        .sort({ createdAt: -1 })
        .limit(type === "signup" ? limit : 10)
        .select("name email createdAt")
        .lean()

      users.forEach(user => {
        activities.push({
          _id: `signup-${user._id}`,
          type: "signup",
          description: `${user.name || "User"} signed up`,
          userName: user.name,
          userEmail: user.email,
          createdAt: user.createdAt
        })
      })
    }

    if (type === "all" || type === "payment") {
      const payments = await Payment.find({ status: "success" })
        .sort({ createdAt: -1 })
        .limit(type === "payment" ? limit : 10)
        .populate("userId", "name email")
        .lean()

      payments.forEach((payment: any) => {
        activities.push({
          _id: `payment-${payment._id}`,
          type: "payment",
          description: `${payment.userId?.name || "User"} upgraded to ${payment.plan} (₹${Math.round(payment.amount / 100)})`,
          userName: payment.userId?.name,
          userEmail: payment.userId?.email,
          metadata: { plan: payment.plan, amount: payment.amount },
          createdAt: payment.createdAt
        })
      })
    }

    if (type === "all" || type === "event_created") {
      const events = await Event.find()
        .sort({ createdAt: -1 })
        .limit(type === "event_created" ? limit : 10)
        .populate("ownerId", "name email")
        .lean()

      events.forEach((event: any) => {
        activities.push({
          _id: `event-${event._id}`,
          type: "event_created",
          description: `${event.ownerId?.name || "User"} created event "${event.name}"`,
          userName: event.ownerId?.name,
          userEmail: event.ownerId?.email,
          createdAt: event.createdAt
        })
      })
    }

    if (type === "all" || type === "download") {
      const downloads = await Recipient.find({ downloadCount: { $gt: 0 } })
        .sort({ lastDownloadAt: -1 })
        .limit(type === "download" ? limit : 10)
        .select("name email lastDownloadAt downloadCount")
        .lean()

      downloads.forEach(download => {
        if (download.lastDownloadAt) {
          activities.push({
            _id: `download-${download._id}`,
            type: "download",
            description: `${download.name} downloaded certificate`,
            userName: download.name,
            userEmail: download.email,
            metadata: { downloadCount: download.downloadCount },
            createdAt: download.lastDownloadAt
          })
        }
      })
    }

    // Sort all activities by date
    activities.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    // Paginate
    const startIndex = (page - 1) * limit
    const paginatedActivities = activities.slice(startIndex, startIndex + limit)
    const totalPages = Math.ceil(activities.length / limit)

    return NextResponse.json({
      activities: paginatedActivities,
      totalPages,
      total: activities.length
    })
  } catch (error) {
    console.error("Activity API error:", error)
    return NextResponse.json({ error: "Failed to fetch activities" }, { status: 500 })
  }
}
