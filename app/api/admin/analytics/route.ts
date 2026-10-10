import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Recipient from "@/models/Recipient"
import CertificateType from "@/models/CertificateType"
import { analyticsPeriod, analyticsBuckets } from "@/lib/admin-analytics"

export async function GET(request: NextRequest) {
  let period: ReturnType<typeof analyticsPeriod>
  try { period = analyticsPeriod(request.nextUrl.searchParams) } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Invalid date range" }, { status: 400 }) }
  try {
    await connectDB()
    const match = { createdAt: { ...(period.from ? { $gte: period.from } : {}), $lt: period.to } }
    const first = period.from ? null : await Promise.all([Recipient.findOne().sort({ createdAt: 1 }).select("createdAt").lean(), User.findOne().sort({ createdAt: 1 }).select("createdAt").lean(), Event.findOne().sort({ createdAt: 1 }).select("createdAt").lean()])
    const firstDates = first?.filter(Boolean).map(item => new Date(item!.createdAt).getTime()) || []
    const chartFrom = period.from || new Date(firstDates.length ? Math.min(...firstDates) : period.to.getTime())
    const interval = period.to.getTime() - chartFrom.getTime() <= 90 * 86400000 ? "day" : "month"
    const bucket = { $dateToString: { format: interval === "day" ? "%Y-%m-%d" : "%Y-%m", date: "$createdAt", timezone: "Asia/Kolkata" } }
    const [recipients, users, events, recipientTrend, userTrend, eventTrend, topEvents, topUsers, linkedinRecipients, whatsapp, cta] = await Promise.all([
      Recipient.aggregate([{ $match: match }, { $group: { _id: null, total: { $sum: 1 }, downloaded: { $sum: { $cond: [{ $gt: ["$downloadCount", 0] }, 1, 0] } }, emailed: { $sum: { $cond: [{ $gt: ["$emailCount", 0] }, 1, 0] } } } }]),
      User.countDocuments(match), Event.countDocuments(match),
      Recipient.aggregate([{ $match: match }, { $group: { _id: bucket, count: { $sum: 1 } } }]),
      User.aggregate([{ $match: match }, { $group: { _id: bucket, count: { $sum: 1 } } }]),
      Event.aggregate([{ $match: match }, { $group: { _id: bucket, count: { $sum: 1 } } }]),
      Recipient.aggregate([{ $match: match }, { $group: { _id: "$eventId", recipientsCount: { $sum: 1 }, downloaded: { $sum: { $cond: [{ $gt: ["$downloadCount", 0] }, 1, 0] } } } }, { $sort: { recipientsCount: -1, _id: 1 } }, { $limit: 10 }, { $lookup: { from: Event.collection.name, localField: "_id", foreignField: "_id", as: "event" } }, { $unwind: { path: "$event", preserveNullAndEmptyArrays: true } }, { $lookup: { from: User.collection.name, localField: "event.ownerId", foreignField: "_id", as: "owner" } }, { $unwind: { path: "$owner", preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, event: { _id: "$_id", name: { $ifNull: ["$event.name", "Deleted event"] } }, owner: { name: "$owner.name", email: "$owner.email" }, recipientsCount: 1, downloaded: 1 } }]),
      Recipient.aggregate([{ $match: match }, { $group: { _id: "$eventId", recipientsCount: { $sum: 1 } } }, { $lookup: { from: Event.collection.name, localField: "_id", foreignField: "_id", as: "event" } }, { $unwind: "$event" }, { $group: { _id: "$event.ownerId", recipientsCount: { $sum: "$recipientsCount" }, eventsCount: { $sum: 1 } } }, { $sort: { recipientsCount: -1, _id: 1 } }, { $limit: 10 }, { $lookup: { from: User.collection.name, localField: "_id", foreignField: "_id", as: "user" } }, { $unwind: { path: "$user", preserveNullAndEmptyArrays: true } }, { $project: { _id: 0, user: { _id: "$user._id", name: { $ifNull: ["$user.name", "Deleted account"] }, email: "$user.email" }, recipientsCount: 1, eventsCount: 1 } }]),
      Recipient.countDocuments({ linkedinClicks: { $gt: 0 } }),
      Recipient.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$whatsappShares", 0] } } } }]),
      CertificateType.aggregate([{ $group: { _id: null, total: { $sum: { $ifNull: ["$ctaClicks", 0] } } } }]),
    ])
    const maps = [recipientTrend, userTrend, eventTrend].map(rows => new Map(rows.map(row => [row._id, row.count])))
    const summary = recipients[0] || { total: 0, downloaded: 0, emailed: 0 }
    return NextResponse.json({ period: { ...period, interval }, summary: { users, events, recipients: summary.total, downloaded: summary.downloaded, notDownloaded: summary.total - summary.downloaded, downloadRate: summary.total ? Math.round(summary.downloaded / summary.total * 1000) / 10 : 0, emailed: summary.emailed }, series: analyticsBuckets(chartFrom, period.to, interval).map(date => ({ date, recipients: maps[0].get(date) || 0, users: maps[1].get(date) || 0, events: maps[2].get(date) || 0 })), topEvents, topUsers, growthLoop: { linkedinRecipients, whatsappShares: whatsapp[0]?.total || 0, ctaClicks: cta[0]?.total || 0 }, asOf: new Date().toISOString() }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { console.error("Analytics API error:", error); return NextResponse.json({ error: "Unable to load analytics" }, { status: 500 }) }
}
