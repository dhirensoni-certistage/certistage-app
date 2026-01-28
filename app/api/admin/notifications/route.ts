import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Notification from "@/models/Notification"

// Get notifications from database
export async function GET() {
  try {
    await connectDB()

    // Get all unread notifications + recent 30 days notifications
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    const notifications = await Notification.find({
      $or: [
        { read: false },
        { createdAt: { $gte: thirtyDaysAgo } }
      ]
    })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean()

    const unreadCount = await Notification.countDocuments({ read: false })

    return NextResponse.json({
      notifications,
      unreadCount
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}

// Mark notification as read
export async function PATCH(request: Request) {
  try {
    await connectDB()
    
    const { notificationId } = await request.json()
    
    if (!notificationId) {
      return NextResponse.json({ error: "Notification ID required" }, { status: 400 })
    }

    await Notification.findByIdAndUpdate(notificationId, { read: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark notification read error:", error)
    return NextResponse.json({ error: "Failed to update notification" }, { status: 500 })
  }
}

// Mark all notifications as read
export async function POST() {
  try {
    await connectDB()
    
    await Notification.updateMany({ read: false }, { read: true })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Mark all notifications read error:", error)
    return NextResponse.json({ error: "Failed to update notifications" }, { status: 500 })
  }
}
