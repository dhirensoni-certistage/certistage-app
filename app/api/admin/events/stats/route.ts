import { NextResponse } from "next/server"
import type { PipelineStage } from "mongoose"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"
import type { EventMetric } from "@/lib/admin-events"

export const dynamic = "force-dynamic"

interface Summary {
  totals: { total: number; secondary: number }[]
  cohorts: { _id: boolean; total: number; secondary: number }[]
  growth: { _id: string; total: number; secondary: number }[]
}

export async function GET() {
  try {
    await connectDB()
    const now = new Date()
    const recent = new Date(now.getTime() - 30 * 86400000)
    const previous = new Date(now.getTime() - 60 * 86400000)
    const active = { $ne: ["$isActive", false] }
    const issued = { $or: [
      { $gt: [{ $ifNull: ["$downloadCount", 0] }, 0] },
      { $gt: [{ $ifNull: ["$emailCount", 0] }, 0] },
    ] }
    const summaryPipeline = (condition: Record<string, unknown>): PipelineStage[] => [{ $facet: {
      totals: [{ $group: { _id: null, total: { $sum: 1 }, secondary: { $sum: { $cond: [condition, 1, 0] } } } }],
      cohorts: [
        { $match: { createdAt: { $gte: previous, $lte: now } } },
        { $group: { _id: { $gte: ["$createdAt", recent] }, total: { $sum: 1 }, secondary: { $sum: { $cond: [condition, 1, 0] } } } },
      ],
      growth: [
        { $match: { createdAt: { $gte: recent, $lte: now } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, total: { $sum: 1 }, secondary: { $sum: { $cond: [condition, 1, 0] } } } },
        { $sort: { _id: 1 } },
      ],
    } }]
    const [eventResults, recipientResults] = await Promise.all([
      Event.aggregate<Summary>(summaryPipeline(active)),
      Recipient.aggregate<Summary>([
        // Only registrations attached to a current event belong in these totals.
        { $lookup: { from: Event.collection.name, localField: "eventId", foreignField: "_id", pipeline: [{ $project: { _id: 1 } }], as: "event" } },
        { $match: { "event.0": { $exists: true } } },
        ...summaryPipeline(issued),
      ]),
    ])
    const empty: Summary = { totals: [], cohorts: [], growth: [] }
    const metric = (summary: Summary, key: "total" | "secondary"): EventMetric => {
      const value = summary.totals[0]?.[key] || 0
      const current = summary.cohorts.find(cohort => cohort._id === true)?.[key] || 0
      const before = summary.cohorts.find(cohort => cohort._id === false)?.[key] || 0
      const counts = new Map(summary.growth.map(day => [day._id, day[key]]))
      let cumulative = value - current
      const growth = Array.from({ length: 31 }, (_, index) => {
        const date = new Date(recent.getTime() + index * 86400000 + 330 * 60000).toISOString().slice(0, 10)
        cumulative += counts.get(date) || 0
        return { date, count: cumulative }
      })
      return { value, recentCount: current, change: before ? Math.round((current - before) / before * 100) : null, growth }
    }
    return NextResponse.json({
      totalEvents: metric(eventResults[0] || empty, "total"),
      activeEvents: metric(eventResults[0] || empty, "secondary"),
      totalRegistrations: metric(recipientResults[0] || empty, "total"),
      certificatesIssued: metric(recipientResults[0] || empty, "secondary"),
    })
  } catch (error) {
    console.error("Event statistics error:", error)
    return NextResponse.json({ error: "Failed to load event statistics" }, { status: 500 })
  }
}
