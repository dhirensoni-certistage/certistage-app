import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"
import { emailLogsQuery } from "@/lib/admin-email-logs.server"
export async function GET(request: NextRequest) {
  try {
    await connectDB(); const query = emailLogsQuery(request.nextUrl.searchParams)
    if (await EmailLog.countDocuments(query) > 50000) return NextResponse.json({ error: "Please narrow your filters to export up to 50,000 logs." }, { status: 400 })
    const logs = await EmailLog.find(query).sort({ createdAt: request.nextUrl.searchParams.get("sort") === "oldest" ? 1 : -1, _id: -1 }).limit(50000).select("to subject template status errorMessage createdAt sentAt readAt").lean()
    const cell = (value: unknown) => { let text = String(value ?? ""); if (/^[\s]*[=+@-]/.test(text)) text = "'" + text; return '"' + text.replace(/"/g, '""') + '"' }
    const date = (value: unknown) => value ? new Date(value as string).toISOString() : ""
    const rows = [["Recipient", "Subject", "Template", "Status", "Created (UTC)", "Sent (UTC)", "Read (UTC)", "Error"], ...logs.map(log => [log.to, log.subject, log.template, log.status, date(log.createdAt), date(log.sentAt), date(log.readAt), log.errorMessage])]
    return new NextResponse("\uFEFF" + rows.map(row => row.map(cell).join(",")).join("\r\n"), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": 'attachment; filename="email-logs.csv"', "Cache-Control": "no-store" } })
  } catch (error) { console.error("Email log export error:", error); return NextResponse.json({ error: "Unable to export email logs" }, { status: 500 }) }
}
