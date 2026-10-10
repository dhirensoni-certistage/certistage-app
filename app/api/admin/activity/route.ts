import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { activityPipeline, activityTypeMatch, activitySort, User } from "@/lib/admin-activity.server"
import { parseUsersPagination } from "@/lib/admin-users-query"
export async function GET(request: NextRequest) {
  try {
    await connectDB(); const params = request.nextUrl.searchParams
    const { page: requestedPage, limit } = parseUsersPagination(params)
    const base = activityPipeline(params); const match = activityTypeMatch(params)
    const [result] = await User.aggregate([...base, { $facet: { counts: [{ $group: { _id: "$type", count: { $sum: 1 } } }], total: [...match, { $count: "total" }], rows: [...match, { $sort: activitySort(params) }, { $skip: (requestedPage - 1) * limit }, { $limit: limit }] } }])
    const total = result.total[0]?.total || 0; const totalPages = Math.max(1, Math.ceil(total / limit)); const page = Math.min(requestedPage, totalPages)
    const activities = page === requestedPage ? result.rows : await User.aggregate([...base, ...match, { $sort: activitySort(params) }, { $skip: (page - 1) * limit }, { $limit: limit }])
    const counts: Record<string, number> = { signup: 0, payment: 0, event_created: 0, download: 0 }
    for (const group of result.counts) counts[group._id] = group.count
    return NextResponse.json({ activities, counts, total, totalPages, pagination: { page, limit, total, totalPages } }, { headers: { "Cache-Control": "no-store" } })
  } catch (error) { console.error("Activity directory error:", error); return NextResponse.json({ error: "Unable to load platform activity" }, { status: 500 }) }
}
