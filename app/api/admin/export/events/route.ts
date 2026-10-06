import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Event, eventDirectoryPipeline, eventCountsPipeline, eventDirectoryProjection, eventDirectorySort } from "@/lib/admin-events.server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = request.nextUrl.searchParams
    const events = await Event.aggregate([
      ...eventDirectoryPipeline(params), ...eventCountsPipeline(),
      { $sort: eventDirectorySort(params) }, eventDirectoryProjection,
    ]).collation({ locale: "en", strength: 2 })
    const headers = ["ID", "Event Name", "Description", "Owner Name", "Owner Email", "Certificate Types", "Registrations", "Status", "Created At"]
    const rows = events.map(event => [String(event._id), event.name || "", event.description || "", event.owner?.name || "Unknown", event.owner?.email || "", event.certificateTypesCount, event.recipientsCount, event.isActive ? "Active" : "Inactive", event.createdAt ? new Date(event.createdAt).toISOString() : ""])
    const escape = (value: unknown) => {
      const text = String(value ?? "")
      const safe = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(row => row.map(escape).join(","))].join("\r\n")
    return new NextResponse(csv, { headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="events_export_${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    } })
  } catch (error) {
    console.error("Export events error:", error)
    const invalid = error instanceof Error && error.message === "Invalid event selection"
    return NextResponse.json({ error: invalid ? error.message : "Failed to export events" }, { status: invalid ? 400 : 500 })
  }
}
