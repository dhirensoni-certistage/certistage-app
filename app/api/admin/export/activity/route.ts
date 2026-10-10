import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { activityPipeline, activityTypeMatch, activitySort, User } from "@/lib/admin-activity.server"
import { ACTIVITY_LABELS, activityDescription, type ActivityItem } from "@/lib/admin-activity"
export async function GET(request: NextRequest) {
  try {
    await connectDB(); const params = request.nextUrl.searchParams
    const rows = await User.aggregate([...activityPipeline(params), ...activityTypeMatch(params), { $sort: activitySort(params) }, { $limit: 50001 }])
    if (rows.length > 50000) return NextResponse.json({ error: "Narrow your filters to export up to 50,000 records" }, { status: 400 })
    const cell = (value: unknown) => { let text = String(value ?? ""); if (/^\s*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"' }
    const data = [["Type", "Description", "Name", "Email", "Recorded date (UTC)", "Payment status", "Order ID", "Total recipient downloads"], ...rows.map(row => { const item = row as ActivityItem; return [ACTIVITY_LABELS[item.type], activityDescription(item), item.userName, item.userEmail, new Date(item.createdAt).toISOString(), item.metadata?.status, item.metadata?.orderId, item.metadata?.downloadCount] })]
    return new NextResponse("\uFEFF" + data.map(row => row.map(cell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="platform-activity.csv"', "Cache-Control": "no-store" } })
  } catch (error) { console.error("Activity export error:", error); return NextResponse.json({ error: "Unable to export activity" }, { status: 500 }) }
}
