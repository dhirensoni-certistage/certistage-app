import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import Event from "@/models/Event"

// Generate notifications from recent activity
export async function GET() {
  try {
    await connectDB()

    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000)

    // Get recent signups
    const recentUsers = await User.find({ createdAt: { $gte: oneDayAgo } })
      .select("name email createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    // Get recent payments
    const recentPayments = await Payment.find({ 
      createdAt: { $gte: oneDayAgo },
      status: "success"
    })
      .populate("userId", "name")
      .select("plan amount createdAt userId")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    // Get pending payments (action required)
    const pendingPayments = await Payment.find({ status: "pending" })
      .populate("userId", "name")
      .select("plan amount createdAt userId")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()

    // Build notifications array
    const notifications: any[] = []

    // Add signup notifications
    recentUsers.forEach((user: any) => {
      notifications.push({
        _id: `signup-${user._id}`,
        type: "signup",
        title: "New User Signup",
        description: `${user.name} (${user.email}) joined`,
        read: false,
        createdAt: user.createdAt
      })
    })

    // Add payment notifications
    recentPayments.forEach((payment: any) => {
      notifications.push({
        _id: `payment-${payment._id}`,
        type: "payment",
        title: "Payment Received",
        description: `${payment.userId?.name || "User"} upgraded to ${payment.plan} - ₹${Math.round(payment.amount / 100)}`,
        read: false,
        createdAt: payment.createdAt
      })
    })

    // Add pending payment alerts
    pendingPayments.forEach((payment: any) => {
      notifications.push({
        _id: `pending-${payment._id}`,
        type: "payment",
        title: "Pending Payment",
        description: `${payment.userId?.name || "User"}'s ${payment.plan} payment needs attention`,
        read: false,
        createdAt: payment.createdAt
      })
    })

    // Sort by date
    notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

    return NextResponse.json({
      notifications: notifications.slice(0, 10),
      unreadCount: notifications.length
    })
  } catch (error) {
    console.error("Notifications API error:", error)
    return NextResponse.json({ notifications: [], unreadCount: 0 })
  }
}
