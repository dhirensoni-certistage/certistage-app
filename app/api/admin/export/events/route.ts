import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import User from "@/models/User"

export async function GET() {
  try {
    await connectDB()

    const events = await Event.find().populate("ownerId", "name email").lean()

    const headers = ["ID", "Name", "Description", "Owner Name", "Owner Email", "Status", "Created At"]
    const rows = events.map((e: any) => [
      e._id.toString(),
      e.name,
      e.description || "",
      e.ownerId?.name || "Unknown",
      e.ownerId?.email || "",
      e.isActive ? "Active" : "Inactive",
      new Date(e.createdAt).toISOString()
    ])

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="events_export_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Export events error:", error)
    return NextResponse.json({ error: "Failed to export events" }, { status: 500 })
  }
}