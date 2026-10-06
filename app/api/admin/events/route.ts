import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { Event, eventDirectoryPipeline, eventCountsPipeline, eventDirectoryProjection, eventDirectorySort } from "@/lib/admin-events.server"
import { parseUsersPagination } from "@/lib/admin-users-query"
import { canUserCreateEvent } from "@/lib/plan-limits"
import { isEventCategory } from "@/lib/event-categories"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = request.nextUrl.searchParams
    const base = eventDirectoryPipeline(params)
    let { page } = parseUsersPagination(params)
    const { limit } = parseUsersPagination(params)
    const [count] = await Event.aggregate([...base, { $count: "total" }])
    const total = count?.total || 0
    const totalPages = Math.ceil(total / limit)
    page = Math.min(page, Math.max(1, totalPages))
    const sort = eventDirectorySort(params)
    const sortByCount = "certificateTypesCount" in sort || "recipientsCount" in sort
    const events = await Event.aggregate([
      ...base,
      ...(sortByCount ? eventCountsPipeline() : []),
      { $sort: sort }, { $skip: (page - 1) * limit }, { $limit: limit },
      ...(sortByCount ? [] : eventCountsPipeline()),
      eventDirectoryProjection,
    ]).collation({ locale: "en", strength: 2 })
    return NextResponse.json({ events, pagination: { page, limit, total, totalPages } })
  } catch (error) {
    console.error("Events API error:", error)
    const invalid = error instanceof Error && error.message === "Invalid event selection"
    return NextResponse.json({ error: invalid ? error.message : "Failed to fetch events" }, { status: invalid ? 400 : 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    const { name, description, ownerId, category } = body as Record<string, unknown>
    if (typeof name !== "string" || !name.trim() || name.trim().length > 200) {
      return NextResponse.json({ error: "Enter an event name between 1 and 200 characters" }, { status: 400 })
    }
    if (typeof ownerId !== "string" || !/^[a-f0-9]{24}$/i.test(ownerId)) {
      return NextResponse.json({ error: "Select a valid event owner" }, { status: 400 })
    }
    if (description !== undefined && (typeof description !== "string" || description.length > 2000)) {
      return NextResponse.json({ error: "Description must be at most 2,000 characters" }, { status: 400 })
    }
    if (category !== undefined && category !== "" && !isEventCategory(category)) {
      return NextResponse.json({ error: "Select a valid event category" }, { status: 400 })
    }
    await connectDB()
    const owner = await User.findById(ownerId).select("isActive")
    if (!owner) return NextResponse.json({ error: "Owner not found" }, { status: 404 })
    if (owner.isActive === false) return NextResponse.json({ error: "Select an active user as the event owner" }, { status: 400 })
    const allowance = await canUserCreateEvent(ownerId)
    if (!allowance.allowed) {
      return NextResponse.json({ error: allowance.reason || "Owner's event limit reached", limitReached: true }, { status: 403 })
    }
    const event = await Event.create({ name: name.trim(), description: (description as string | undefined)?.trim() || "", ownerId, category: category || undefined, isActive: true })
    return NextResponse.json({ success: true, event: { _id: event._id, name: event.name } }, { status: 201 })
  } catch (error) {
    console.error("Create admin event error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    let body: unknown
    try { body = await request.json() } catch { return NextResponse.json({ error: "Invalid request body" }, { status: 400 }) }
    if (!body || typeof body !== "object") return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
    const { ids, isActive } = body as Record<string, unknown>
    if (!Array.isArray(ids) || ids.length === 0 || ids.length > 100 || ids.some(id => typeof id !== "string" || !/^[a-f0-9]{24}$/i.test(id)) || typeof isActive !== "boolean") {
      return NextResponse.json({ error: "Provide 1-100 valid event IDs and a boolean status" }, { status: 400 })
    }
    const uniqueIds = [...new Set(ids)].map(id => new mongoose.Types.ObjectId(id))
    await connectDB()
    const matched = await Event.countDocuments({ _id: { $in: uniqueIds } })
    if (matched !== uniqueIds.length) return NextResponse.json({ error: "One or more events no longer exist. Refresh and try again." }, { status: 404 })
    const result = await Event.updateMany({ _id: { $in: uniqueIds } }, { $set: { isActive } })
    return NextResponse.json({ success: true, matched: result.matchedCount, modified: result.modifiedCount })
  } catch (error) {
    console.error("Update admin event status error:", error)
    return NextResponse.json({ error: "Failed to update events" }, { status: 500 })
  }
}
