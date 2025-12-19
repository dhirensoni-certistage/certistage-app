import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"
import User from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const status = searchParams.get("status") || ""
    const plan = searchParams.get("plan") || ""

    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    // Revenue totals
    const [allTimeResult, thisMonthResult, lastMonthResult, totalPayments, successPayments] = await Promise.all([
      Payment.aggregate([{ $match: { status: "success" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: startOfMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.aggregate([{ $match: { status: "success", createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
      Payment.countDocuments(),
      Payment.countDocuments({ status: "success" })
    ])

    // Monthly revenue (last 12 months)
    const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1)
    const monthlyRevenue = await Payment.aggregate([
      { $match: { status: "success", createdAt: { $gte: twelveMonthsAgo } } },
      { $group: { _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } }, revenue: { $sum: "$amount" } } },
      { $sort: { _id: 1 } },
      { $project: { month: "$_id", revenue: 1, _id: 0 } }
    ])

    // Plan breakdown
    const planBreakdown = await Payment.aggregate([
      { $match: { status: "success" } },
      { $group: { _id: "$plan", revenue: { $sum: "$amount" }, count: { $sum: 1 } } },
      { $project: { plan: "$_id", revenue: 1, count: 1, _id: 0 } }
    ])

    // Payments list with filters
    const paymentQuery: Record<string, unknown> = {}
    if (status && status !== "all") paymentQuery.status = status
    if (plan && plan !== "all") paymentQuery.plan = plan

    const total = await Payment.countDocuments(paymentQuery)
    const totalPages = Math.ceil(total / limit)

    const payments = await Payment.find(paymentQuery)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("userId", "name email")
      .lean()

    const formattedPayments = payments.map((p: any) => ({
      _id: p._id,
      user: { name: p.userId?.name || "Unknown", email: p.userId?.email || "" },
      plan: p.plan,
      amount: p.amount,
      status: p.status,
      paymentId: p.paymentId,
      orderId: p.orderId,
      createdAt: p.createdAt
    }))

    // Convert paise to rupees for display
    const toRupees = (paise: number) => Math.round(paise / 100)

    return NextResponse.json({
      totals: {
        allTime: toRupees(allTimeResult[0]?.total || 0),
        thisMonth: toRupees(thisMonthResult[0]?.total || 0),
        lastMonth: toRupees(lastMonthResult[0]?.total || 0),
        successRate: totalPayments > 0 ? Math.round((successPayments / totalPayments) * 100) : 0
      },
      monthlyRevenue: monthlyRevenue.map(m => ({ ...m, revenue: toRupees(m.revenue) })),
      planBreakdown: planBreakdown.map(p => ({ ...p, revenue: toRupees(p.revenue) })),
      payments: formattedPayments.map(p => ({ ...p, amount: toRupees(p.amount) })),
      pagination: { total, page, limit, totalPages }
    })
  } catch (error) {
    console.error("Revenue API error:", error)
    return NextResponse.json({ error: "Failed to fetch revenue data" }, { status: 500 })
  }
}