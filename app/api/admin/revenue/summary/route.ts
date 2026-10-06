import { NextRequest, NextResponse } from "next/server"
import type { PipelineStage } from "mongoose"
import connectDB from "@/lib/mongodb"
import { Payment, revenuePeriod } from "@/lib/admin-revenue.server"
import { getPlanConfigFromDb } from "@/lib/plan-config.server"
import { getRazorpayKeys } from "@/lib/addon-payments.server"

export const dynamic = "force-dynamic"

// Amounts stay in paise throughout aggregation. Refunds are attributed to their original orders.
const moneyFields: PipelineStage[] = [
  { $set: { captured: { $in: ["$status", ["success", "refunded"]] } } },
  { $set: {
    gross: { $cond: ["$captured", { $ifNull: ["$amount", 0] }, 0] },
    refunds: { $cond: ["$captured", { $min: [{ $ifNull: ["$amount", 0] }, { $max: [0, { $ifNull: ["$refundAmount", { $cond: [{ $eq: ["$status", "refunded"] }, "$amount", 0] }] }] }] }, 0] },
  } },
  { $set: { net: { $subtract: ["$gross", "$refunds"] } } },
]
const currencyQuery = { $or: [{ currency: "INR" }, { currency: { $exists: false } }, { currency: null }] }

export async function GET(request: NextRequest) {
  try {
    const period = revenuePeriod(request.nextUrl.searchParams)
    await connectDB()
    const dateQuery = { ...(period.from ? { $gte: period.from } : {}), $lt: period.to }
    const summaryPipeline: PipelineStage[] = [
      { $match: { ...currencyQuery, createdAt: dateQuery } }, ...moneyFields,
      { $facet: {
        totals: [{ $group: {
          _id: null, grossPaise: { $sum: "$gross" }, refundPaise: { $sum: "$refunds" }, netPaise: { $sum: "$net" },
          capturedCount: { $sum: { $cond: ["$captured", 1, 0] } },
          pendingCount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          pendingPaise: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
          failedCount: { $sum: { $cond: [{ $eq: ["$status", "failed"] }, 1, 0] } },
          refundedCount: { $sum: { $cond: [{ $eq: ["$status", "refunded"] }, 1, 0] } },
          firstDate: { $min: "$createdAt" },
        } }],
        customers: [{ $match: { captured: true } }, { $group: { _id: "$userId" } }, { $count: "count" }],
        series: [
          { $group: { _id: { $dateToString: { format: period.interval === "day" ? "%Y-%m-%d" : "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } }, grossPaise: { $sum: "$gross" }, refundPaise: { $sum: "$refunds" }, netPaise: { $sum: "$net" } } },
          { $sort: { _id: 1 } },
        ],
        breakdown: [{ $match: { captured: true } }, { $group: { _id: { $cond: [{ $eq: ["$kind", "addon"] }, "__addons", "$plan"] }, netPaise: { $sum: "$net" }, count: { $sum: 1 } } }, { $sort: { netPaise: -1 } }],
      } },
    ]
    const previousPipeline: PipelineStage[] = period.from ? [
      { $match: { ...currencyQuery, createdAt: { $gte: new Date(period.from.getTime() - (period.to.getTime() - period.from.getTime())), $lt: period.from } } },
      ...moneyFields, { $group: { _id: null, netPaise: { $sum: "$net" } } },
    ] : []
    const [result, previous, plans, historicalPlans, keys, pendingAllCount] = await Promise.all([
      Payment.aggregate(summaryPipeline),
      period.from ? Payment.aggregate(previousPipeline) : Promise.resolve([]),
      getPlanConfigFromDb(),
      Payment.distinct("plan", { kind: { $ne: "addon" } }),
      getRazorpayKeys(),
      Payment.countDocuments({ status: "pending" }),
    ])
    const summary = result[0]
    const raw = summary?.totals[0] || { grossPaise: 0, refundPaise: 0, netPaise: 0, capturedCount: 0, pendingCount: 0, pendingPaise: 0, failedCount: 0, refundedCount: 0 }
    const { firstDate, _id, ...totals } = raw
    const names = new Map(plans.map(plan => [plan.id, plan.name]))
    const planOptions = [...plans.map(plan => ({ id: plan.id, name: plan.name })), ...historicalPlans.filter(id => typeof id === "string" && !names.has(id)).map(id => ({ id, name: id.replace(/_/g, " ") }))]
    const seriesMap = new Map<string, { grossPaise: number; refundPaise: number; netPaise: number }>(summary.series.map((item: { _id: string; grossPaise: number; refundPaise: number; netPaise: number }) => [item._id, item]))
    const start = new Date((period.from || firstDate || period.to).getTime() + 330 * 60000)
    const end = new Date(period.to.getTime() - 1 + 330 * 60000)
    const cursor = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), period.interval === "month" ? 1 : start.getUTCDate()))
    const series = []
    while (cursor <= end) {
      const date = cursor.toISOString().slice(0, period.interval === "month" ? 7 : 10)
      const item = seriesMap.get(date)
      series.push({ date, grossPaise: item?.grossPaise || 0, refundPaise: item?.refundPaise || 0, netPaise: item?.netPaise || 0 })
      if (period.interval === "month") cursor.setUTCMonth(cursor.getUTCMonth() + 1)
      else cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
    const resolved = raw.capturedCount + raw.failedCount
    const previousNet = previous[0]?.netPaise || 0
    return NextResponse.json({
      period: { range: period.range, from: period.from?.toISOString() || null, to: period.to.toISOString(), interval: period.interval },
      totals: { ...totals, payingCustomers: summary.customers[0]?.count || 0, averagePaise: raw.capturedCount ? raw.grossPaise / raw.capturedCount : 0, successRate: resolved ? Math.round(raw.capturedCount / resolved * 1000) / 10 : null, netChange: period.from && previousNet > 0 ? Math.round((raw.netPaise - previousNet) / previousNet * 1000) / 10 : null },
      series,
      breakdown: summary.breakdown.map((item: { _id: string; netPaise: number; count: number }) => ({ id: item._id, name: item._id === "__addons" ? "Add-ons" : names.get(item._id) || item._id || "Unknown plan", netPaise: item.netPaise, count: item.count })),
      plans: planOptions,
      gatewayConfigured: Boolean(keys.keyId && keys.keySecret),
      pendingAllCount,
      asOf: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Revenue summary error:", error)
    const invalid = error instanceof Error && error.message === "Invalid date range"
    return NextResponse.json({ error: invalid ? error.message : "Failed to load revenue overview" }, { status: invalid ? 400 : 500 })
  }
}
