import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"
import Payment from "@/models/Payment"
import CertificateType from "@/models/CertificateType"

const DAY_MS = 24 * 60 * 60 * 1000

// Percent change; null when there is no previous value to compare against
function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null
  return Math.round(((current - previous) / previous) * 100)
}

export async function GET() {
  try {
    await connectDB()

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const startOfYesterday = new Date(startOfToday.getTime() - DAY_MS)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    // Same point in last month, clamped so short months never spill into this one
    const sameTimeLastMonth = new Date(Math.min(
      new Date(now.getFullYear(), now.getMonth() - 1, now.getDate(), now.getHours(), now.getMinutes()).getTime(),
      startOfMonth.getTime()
    ))
    const thirtyDaysAgo = new Date(now.getTime() - 30 * DAY_MS)

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

    // Comparison figures for the metric cards
    const [
      certificatesToday,
      certificatesYesterday,
      totalRecipients,
      recipientsBeforeThisMonth,
      eventsCreatedThisMonth,
      revenueLastMonthResult
    ] = await Promise.all([
      Recipient.countDocuments({ createdAt: { $gte: startOfToday } }),
      Recipient.countDocuments({ createdAt: { $gte: startOfYesterday, $lt: startOfToday } }),
      Recipient.countDocuments(),
      Recipient.countDocuments({ createdAt: { $lt: startOfMonth } }),
      Event.countDocuments({ createdAt: { $gte: startOfMonth } }),
      Payment.aggregate([
        { $match: { status: "success", createdAt: { $gte: startOfLastMonth, $lt: sameTimeLastMonth } } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ])
    ])
    const revenueLastMonthToDate = Math.round((revenueLastMonthResult[0]?.total || 0) / 100)

    const trends = {
      certificatesToday: percentChange(certificatesToday, certificatesYesterday),
      totalRecipients: percentChange(totalRecipients, recipientsBeforeThisMonth),
      revenueThisMonth: percentChange(revenueThisMonth, revenueLastMonthToDate)
    }

    // Certificates issued per day (last 30 days, every day present)
    const certificateActivityRaw: Array<{ _id: string; count: number }> = await Recipient.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, count: { $sum: 1 } } }
    ])
    const activityByDay = new Map(certificateActivityRaw.map((d) => [d._id, d.count]))
    const certificateActivity = Array.from({ length: 30 }, (_, i) => {
      const date = new Date(now.getTime() - (29 - i) * DAY_MS).toISOString().slice(0, 10)
      return { date, count: activityByDay.get(date) ?? 0 }
    })

    // Top events by certificates issued, with how many recipients downloaded
    const topEventsRaw: Array<{
      _id: unknown
      issued: number
      downloaded: number
      event?: { name?: string; createdAt?: Date }
    }> = await Recipient.aggregate([
      {
        $group: {
          _id: "$eventId",
          issued: { $sum: 1 },
          downloaded: { $sum: { $cond: [{ $gt: ["$downloadCount", 0] }, 1, 0] } }
        }
      },
      { $sort: { issued: -1 } },
      { $limit: 5 },
      { $lookup: { from: Event.collection.name, localField: "_id", foreignField: "_id", as: "event" } },
      { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } },
      { $project: { issued: 1, downloaded: 1, "event.name": 1, "event.createdAt": 1 } }
    ])
    const topEvents = topEventsRaw.map((e) => ({
      eventId: String(e._id),
      name: e.event?.name || "Deleted event",
      createdAt: e.event?.createdAt ? new Date(e.event.createdAt).toISOString() : null,
      issued: e.issued,
      downloaded: e.downloaded,
      downloadRate: e.issued > 0 ? Math.round((e.downloaded / e.issued) * 1000) / 10 : 0
    }))

    // Latest certificates issued across the platform
    const recentRecipients = await Recipient.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select("name email downloadCount emailStatus createdAt eventId certificateTypeId")
      .populate("eventId", "name")
      .populate({ path: "certificateTypeId", select: "name templateImage", model: CertificateType })
      .lean()

    const recentCertificates = recentRecipients.map((r: any) => ({
      id: String(r._id),
      name: r.name || "Unknown",
      email: r.email || "",
      eventId: r.eventId?._id ? String(r.eventId._id) : null,
      eventName: r.eventId?.name || "Deleted event",
      certificateTypeName: r.certificateTypeId?.name || "",
      templateImage: r.certificateTypeId?.templateImage || "",
      downloaded: (r.downloadCount || 0) > 0,
      emailStatus: r.emailStatus || null,
      createdAt: new Date(r.createdAt).toISOString()
    }))

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
        conversionRate,
        certificatesToday,
        totalRecipients,
        eventsCreatedThisMonth
      },
      trends,
      certificateActivity,
      topEvents,
      recentCertificates,
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

