import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"

// GET - Fetch email logs with filters
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || ""
    const template = searchParams.get("template") || ""
    const dateRange = searchParams.get("dateRange") || "all"

    // Build query
    const query: any = {}

    if (search) {
      query.$or = [
        { to: { $regex: search, $options: "i" } },
        { subject: { $regex: search, $options: "i" } }
      ]
    }

    if (status && status !== "all") {
      query.status = status
    }

    if (template && template !== "all") {
      query.template = template
    }

    // Date range filter
    if (dateRange !== "all") {
      const now = new Date()
      let startDate: Date

      switch (dateRange) {
        case "today":
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case "week":
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case "month":
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        default:
          startDate = new Date(0)
      }

      query.createdAt = { $gte: startDate }
    }

    const skip = (page - 1) * limit

    const [logs, total, stats] = await Promise.all([
      EmailLog.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .select("-htmlContent")
        .lean(),
      EmailLog.countDocuments(query),
      EmailLog.aggregate([
        {
          $group: {
            _id: "$status",
            count: { $sum: 1 }
          }
        }
      ])
    ])

    // Get unique templates for filter
    const templates = await EmailLog.distinct("template")

    // Format stats
    const statusCounts = {
      total: 0,
      initiated: 0,
      sent: 0,
      failed: 0,
      read: 0
    }

    stats.forEach((s: any) => {
      statusCounts[s._id as keyof typeof statusCounts] = s.count
      statusCounts.total += s.count
    })

    return NextResponse.json({
      logs: logs.map((log: any) => ({
        id: log._id.toString(),
        to: log.to,
        subject: log.subject,
        template: log.template,
        status: log.status,
        errorMessage: log.errorMessage,
        metadata: log.metadata,
        sentAt: log.sentAt,
        createdAt: log.createdAt
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      },
      stats: statusCounts,
      templates
    })
  } catch (error) {
    console.error("Error fetching email logs:", error)
    return NextResponse.json({ error: "Failed to fetch email logs" }, { status: 500 })
  }
}
