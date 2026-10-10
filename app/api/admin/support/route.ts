import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import SupportTicket from "@/models/SupportTicket"
import { sendEmail, emailTemplates } from "@/lib/email"
import { supportQuery } from "@/lib/admin-support.server"
import { parseUsersPagination } from "@/lib/admin-users-query"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

// Admin session is checked by proxy.ts for every /api/admin route

// GET ?status=open|in_progress|closed|all&search=&page=&limit=
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = new URL(request.url).searchParams
    const { page: requestedPage, limit } = parseUsersPagination(params)
    const query = supportQuery(params)
    const [total, counts, plans] = await Promise.all([
      SupportTicket.countDocuments(query),
      SupportTicket.aggregate([{ $match: supportQuery(params, false) }, { $group: { _id: "$status", n: { $sum: 1 } } }]),
      SupportTicket.distinct("plan"),
    ])
    const totalPages = Math.max(1, Math.ceil(total / limit)); const page = Math.min(requestedPage, totalPages)
    const sort: Record<string, 1 | -1> = params.get("sort") === "oldest" ? { createdAt: 1, _id: 1 } : params.get("sort") === "updated" ? { updatedAt: -1, _id: -1 } : { createdAt: -1, _id: -1 }
    const tickets = await SupportTicket.find(query).sort(sort).skip((page - 1) * limit).limit(limit).select("number userId name email organization plan subject status lastReplyBy lastReplyAt emailSent createdAt updatedAt").lean()
    const byStatus: Record<string, number> = { open: 0, in_progress: 0, closed: 0 }
    for (const c of counts) byStatus[c._id] = c.n
    return NextResponse.json({ tickets, total, page, limit, counts: byStatus, plans: plans.filter(Boolean).sort(), pagination: { page, limit, total, totalPages } })
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
    if (!body || typeof body !== "object" || typeof body.id !== "string" || !/^[a-f0-9]{24}$/i.test(body.id) || !mongoose.isValidObjectId(body.id)) return NextResponse.json({ error: "Ticket ID required" }, { status: 400 })
    if (body.status !== undefined && !["open", "in_progress", "closed"].includes(body.status)) return NextResponse.json({ error: "Invalid ticket status" }, { status: 400 })
    if (body.adminNote !== undefined && (typeof body.adminNote !== "string" || body.adminNote.length > 2000)) return NextResponse.json({ error: "Internal notes must be at most 2,000 characters" }, { status: 400 })
    if (body.reply !== undefined && (typeof body.reply !== "string" || !body.reply.trim() || body.reply.length > 5000)) return NextResponse.json({ error: "Reply must contain 1–5,000 characters" }, { status: 400 })
    if (body.status === undefined && body.adminNote === undefined && body.reply === undefined) return NextResponse.json({ error: "No changes supplied" }, { status: 400 })
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
