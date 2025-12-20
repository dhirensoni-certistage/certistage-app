import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"
import Payment from "@/models/Payment"

export async function GET() {
  try {
    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Dashboard Metrics
    const [
      totalUsers, 
      activeEvents, 
      certificatesThisMonth, 
      revenueResult,
      newUsersToday,
      pendingPayments,
      paidUsers
    ] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments({ isActive: true }),
      Recipient.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      User.countDocuments({ createdAt: { $gte: startOfToday } }),
      Payment.countDocuments({ status: "pending" }),
      User.countDocuments({ plan: { $ne: "free" } })
    ])

    const revenueThisMonth = Math.round((revenueResult[0]?.total || 0) / 100)
    const conversionRate = totalUsers > 0 ? Math.round((paidUsers / totalUsers) * 100) : 0

    // User Growth (last 30 days)
    const userGrowth = await User.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
      { $project: { date: "$_id", count: 1, _id: 0 } }
    ])

    // Plan Distribution
    const planDistribution = await User.aggregate([
      { $match: { plan: { $ne: null, $exists: true } } },
      { $group: { _id: "$plan", count: { $sum: 1 } } },
      { $project: { plan: { $ifNull: ["$_id", "free"] }, count: 1, _id: 0 } }
    ])

    // Action Items - things that need attention
    const actionItems: any[] = []

    // Get pending payments for action items
    const pendingPaymentsList = await Payment.find({ status: "pending" })
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    pendingPaymentsList.forEach((payment: any) => {
      if (payment._id) {
        actionItems.push({
          id: `payment-${payment._id}`,
          type: "pending_payment",
          title: `Pending Payment: ${payment.userId?.name || "Unknown"}`,
          description: `${payment.plan || "Plan"} - ₹${Math.round((payment.amount || 0) / 100)}`,
          actionLabel: "Review",
          actionHref: "/admin/revenue",
          timestamp: payment.createdAt || new Date(),
          priority: "high"
        })
      }
    })

    // Get today's new users
    const todayUsers = await User.find({ createdAt: { $gte: startOfToday } })
      .select("name email plan createdAt")
      .sort({ createdAt: -1 })
      .limit(3)
      .lean()

    todayUsers.forEach((user: any) => {
      if (user._id) {
        actionItems.push({
          id: `user-${user._id}`,
          type: "new_user",
          title: `New Signup: ${user.name || "User"}`,
          description: user.email || "",
          actionLabel: "View",
          actionHref: `/admin/users/${user._id}`,
          timestamp: user.createdAt || new Date(),
          priority: "low"
        })
      }
    })

    // Sort action items by priority and timestamp
    const priorityOrder = { high: 0, medium: 1, low: 2 }
    actionItems.sort((a, b) => {
      if (priorityOrder[a.priority as keyof typeof priorityOrder] !== priorityOrder[b.priority as keyof typeof priorityOrder]) {
        return priorityOrder[a.priority as keyof typeof priorityOrder] - priorityOrder[b.priority as keyof typeof priorityOrder]
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    })

    // Recent Activity
    const [recentUsers, recentEvents, recentPayments] = await Promise.all([
      User.find().sort({ createdAt: -1 }).limit(5).select("name email createdAt").lean(),
      Event.find().sort({ createdAt: -1 }).limit(5).populate("ownerId", "name email").lean(),
      Payment.find({ status: "success" }).sort({ createdAt: -1 }).limit(5).populate("userId", "name email").lean()
    ])

    const activities: Array<{
      type: "signup" | "event_created" | "payment"
      description: string
      timestamp: string
      userId?: string
    }> = []

    recentUsers.forEach((user: any) => {
      if (user.createdAt) {
        activities.push({
          type: "signup",
          description: `${user.name || "User"} signed up`,
          timestamp: new Date(user.createdAt).toISOString(),
          userId: user._id?.toString()
        })
      }
    })

    recentEvents.forEach((event: any) => {
      if (event.createdAt) {
        const ownerName = event.ownerId?.name || "Unknown"
        activities.push({
          type: "event_created",
          description: `${ownerName} created event "${event.name || "Untitled"}"`,
          timestamp: new Date(event.createdAt).toISOString(),
          userId: event.ownerId?._id?.toString()
        })
      }
    })

    recentPayments.forEach((payment: any) => {
      if (payment.createdAt) {
        const userName = payment.userId?.name || "Unknown"
        activities.push({
          type: "payment",
          description: `${userName} upgraded to ${payment.plan || "paid"} (₹${Math.round((payment.amount || 0) / 100)})`,
          timestamp: new Date(payment.createdAt).toISOString(),
          userId: payment.userId?._id?.toString()
        })
      }
    })

    const recentActivity = activities
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, 10)

    return NextResponse.json({
      metrics: {
        totalUsers,
        activeEvents,
        certificatesThisMonth,
        revenueThisMonth,
        newUsersToday,
        pendingPayments,
        conversionRate
      },
      userGrowth,
      planDistribution,
      recentActivity,
      actionItems
    })
  } catch (error: any) {
    console.error("Dashboard API error:", error)
    return NextResponse.json({ 
      error: "Failed to fetch dashboard data",
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}
