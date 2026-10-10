import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"
import { emailLogsQuery } from "@/lib/admin-email-logs.server"
import { parseUsersPagination } from "@/lib/admin-users-query"
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = request.nextUrl.searchParams
    const { page: requestedPage, limit } = parseUsersPagination(params)
    const query = emailLogsQuery(params)
    const [total, groups, templates] = await Promise.all([
      EmailLog.countDocuments(query),
      EmailLog.aggregate([{ $match: emailLogsQuery(params, new Date(), false) }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
      EmailLog.distinct("template"),
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit)); const page = Math.min(requestedPage, totalPages)
    const logs = await EmailLog.find(query).sort({ createdAt: params.get("sort") === "oldest" ? 1 : -1, _id: -1 }).skip((page - 1) * limit).limit(limit).select("to subject template status errorMessage metadata.userName sentAt readAt createdAt").lean()
    const stats: Record<string, number> = { total: 0, initiated: 0, sent: 0, failed: 0, read: 0 }
    for (const group of groups) { if (group._id in stats && group._id !== "total") { stats[group._id] = group.count; stats.total += group.count } }
    return NextResponse.json({ logs: logs.map(log => ({ ...log, id: String(log._id), _id: undefined })), pagination: { page, limit, total, totalPages }, stats, templates: templates.filter(Boolean).sort() })
  } catch (error) { console.error("Email log directory error:", error); return NextResponse.json({ error: "Unable to load email logs" }, { status: 500 }) }
}
