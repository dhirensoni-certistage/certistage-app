import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import SupportTicket from "@/models/SupportTicket"

// Admin session is checked by proxy.ts for every /api/admin route

// GET ?status=open|in_progress|closed|all&search=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = new URL(request.url).searchParams
    const status = params.get("status") || "open"
    const search = (params.get("search") || "").trim()
    const page = Math.max(1, parseInt(params.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(params.get("limit") || "25")))

    const query: Record<string, unknown> = {}
    if (status !== "all") query.status = status
    if (search) {
      const re = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i")
      query.$or = [{ number: re }, { subject: re }, { name: re }, { email: re }, { organization: re }]
    }
    const [tickets, total, counts] = await Promise.all([
      SupportTicket.find(query).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
      SupportTicket.countDocuments(query),
      SupportTicket.aggregate([{ $group: { _id: "$status", n: { $sum: 1 } } }])
    ])
    const byStatus: Record<string, number> = { open: 0, in_progress: 0, closed: 0 }
    for (const c of counts) byStatus[c._id] = c.n
    return NextResponse.json({ tickets, total, page, limit, counts: byStatus })
  } catch (error) {
    console.error("Admin support GET error:", error)
    return NextResponse.json({ error: "Failed to load tickets" }, { status: 500 })
  }
}

// PATCH { id, status?, adminNote? }
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json().catch(() => ({}))
    if (!mongoose.isValidObjectId(body.id)) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 })
    const update: Record<string, unknown> = {}
    if (["open", "in_progress", "closed"].includes(body.status)) {
      update.status = body.status
      update.closedAt = body.status === "closed" ? new Date() : null
    }
    if (typeof body.adminNote === "string") update.adminNote = body.adminNote.slice(0, 2000)
    const ticket = await SupportTicket.findByIdAndUpdate(body.id, { $set: update }, { new: true }).lean()
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    return NextResponse.json({ success: true, ticket })
  } catch (error) {
    console.error("Admin support PATCH error:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
