import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { backfillOAuthUsers } from "@/lib/oauth-user.server"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await connectDB()
    await backfillOAuthUsers()
    const now = new Date()
    const recent = new Date(now.getTime() - 30 * 86400000)
    const previous = new Date(now.getTime() - 60 * 86400000)
    const offset = 330 * 60 * 1000
    const local = new Date(now.getTime() + offset)
    const month = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - offset)
    const lastMonth = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - 1, 1) - offset)
    const [result] = await User.aggregate([
      { $facet: {
        totals: [{ $group: {
          _id: null,
          total: { $sum: 1 },
          professional: { $sum: { $cond: [{ $eq: ["$plan", "professional"] }, 1, 0] } },
          free: { $sum: { $cond: [{ $eq: [{ $ifNull: ["$plan", "free"] }, "free"] }, 1, 0] } },
          thisMonth: { $sum: { $cond: [{ $gte: ["$createdAt", month] }, 1, 0] } },
          lastMonth: { $sum: { $cond: [{ $and: [{ $gte: ["$createdAt", lastMonth] }, { $lt: ["$createdAt", month] }] }, 1, 0] } },
        } }],
        cohorts: [
          { $match: { createdAt: { $gte: previous } } },
          { $group: {
            _id: { plan: { $ifNull: ["$plan", "free"] }, recent: { $gte: ["$createdAt", recent] } },
            count: { $sum: 1 },
          } },
        ],
        growth: [
          { $match: { createdAt: { $gte: recent } } },
          { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt", timezone: "Asia/Kolkata" } }, count: { $sum: 1 } } },
          { $sort: { _id: 1 } },
        ],
      } },
    ])
    const totals = result.totals[0] || { total: 0, professional: 0, free: 0, thisMonth: 0, lastMonth: 0 }
    const cohortCount = (isRecent: boolean, plan?: string): number =>
      result.cohorts.reduce((sum: number, item: { _id: { plan: string; recent: boolean }; count: number }) =>
        sum + (item._id.recent === isRecent && (!plan || item._id.plan === plan) ? item.count : 0), 0)
    const metric = (value: number, current: number, before: number) => ({
      value,
      recentCount: current,
      change: before > 0 ? Math.round((current - before) / before * 100) : null,
    })
    const dailyCounts = new Map<string, number>(result.growth.map((item: { _id: string; count: number }) => [item._id, item.count]))
    let cumulative = totals.total - cohortCount(true)
    const growth = Array.from({ length: 31 }, (_, index) => {
      const day = new Date(recent.getTime() + index * 86400000)
      const date = new Date(day.getTime() + offset).toISOString().slice(0, 10)
      cumulative += dailyCounts.get(date) || 0
      return { date, count: cumulative }
    })
    return NextResponse.json({
      total: metric(totals.total, cohortCount(true), cohortCount(false)),
      professional: metric(totals.professional, cohortCount(true, "professional"), cohortCount(false, "professional")),
      free: metric(totals.free, cohortCount(true, "free"), cohortCount(false, "free")),
      newSignups: metric(totals.thisMonth, totals.thisMonth, totals.lastMonth),
      growth,
    })
  } catch (error) {
    console.error("User statistics error:", error)
    return NextResponse.json({ error: "Failed to load user statistics" }, { status: 500 })
  }
}
