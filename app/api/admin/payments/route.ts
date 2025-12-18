import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const status = searchParams.get("status") || ""
    const plan = searchParams.get("plan") || ""

    // Build query
    const query: Record<string, unknown> = {}
    
    if (status && status !== "all") {
      query.status = status
    }
    
    if (plan && plan !== "all") {
      query.plan = plan
    }

    // Get total count
    const total = await Payment.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get payments with user info
    const payments = await Payment.find(query)
      .populate("userId", "name email")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Get summary stats
    const [successTotal, pendingCount, failedCount] = await Promise.all([
      Payment.aggregate([
        { $match: { status: "success" } },
        { $group: { _id: null, total: { $sum: "$amount" } } }
      ]),
      Payment.countDocuments({ status: "pending" }),
      Payment.countDocuments({ status: "failed" })
    ])

    return NextResponse.json({
      payments,
      pagination: {
        total,
        page,
        limit,
        totalPages
      },
      summary: {
        totalRevenue: successTotal[0]?.total || 0,
        pendingCount,
        failedCount,
        successCount: total - pendingCount - failedCount
      }
    })
  } catch (error) {
    console.error("Payments API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}
