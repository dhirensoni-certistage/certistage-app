import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import SupportTicket from "@/models/SupportTicket"
import { sendEmail, emailTemplates } from "@/lib/email"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

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

// PATCH { id, status?, adminNote?, reply? }
// A reply is added to the ticket's thread and emailed to the customer; it moves an open
// ticket to "in progress" unless a status is given in the same call.
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json().catch(() => ({}))
    if (!mongoose.isValidObjectId(body.id)) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 })
    const existing = await SupportTicket.findById(body.id)
    if (!existing) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })

    const reply = typeof body.reply === "string" ? body.reply.trim().slice(0, 5000) : ""
    const update: Record<string, unknown> = {}
    const push: Record<string, unknown> = {}
    if (["open", "in_progress", "closed"].includes(body.status)) {
      update.status = body.status
      update.closedAt = body.status === "closed" ? new Date() : null
    } else if (reply && existing.status === "open") {
      update.status = "in_progress"
    }
    if (typeof body.adminNote === "string") update.adminNote = body.adminNote.slice(0, 2000)

    let emailSent: boolean | undefined
    if (reply) {
      const template = emailTemplates.supportReply({
        name: existing.name || "there",
        ticketNumber: existing.number,
        subject: existing.subject,
        reply,
        url: `${APP_URL}/client/support`
      })
      const result = await sendEmail({
        to: existing.email,
        replyTo: process.env.ADMIN_EMAIL || "support@certistage.com",
        subject: template.subject,
        html: template.html,
        template: "support_reply",
        metadata: { type: "support_reply", userId: String(existing.userId), ticketNumber: existing.number }
      })
      emailSent = !!result.success
      if (!result.success) console.error("Support reply to customer failed:", result.error)
      const now = new Date()
      push.replies = { author: "admin", name: "CertiStage Support", message: reply, at: now, emailSent }
      update.lastReplyAt = now
      update.lastReplyBy = "admin"
    }

    const ticket = await SupportTicket.findByIdAndUpdate(
      body.id,
      { ...(Object.keys(update).length ? { $set: update } : {}), ...(Object.keys(push).length ? { $push: push } : {}) },
      { new: true }
    ).lean()
    return NextResponse.json({ success: true, ticket, emailSent })
  } catch (error) {
    console.error("Admin support PATCH error:", error)
    return NextResponse.json({ error: "Failed to update ticket" }, { status: 500 })
  }
}
