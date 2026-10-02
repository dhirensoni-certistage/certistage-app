import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserCreateEvent, getUserUsageStats, verifyEventOwnership } from "@/lib/plan-limits"
import { requireClientUser } from "@/lib/client-auth.server"

// GET - List user's events
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

    // Get user's events with stats
    const events = await Event.find({ ownerId: userId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    // Stats for all events in two grouped queries instead of three counts per event
    const eventIds = events.map((e) => e._id)
    const [typeCounts, recipientCounts, usage] = await Promise.all([
      CertificateType.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: "$eventId", count: { $sum: 1 } } }
      ]),
      Recipient.aggregate([
        { $match: { eventId: { $in: eventIds } } },
        { $group: { _id: "$eventId", total: { $sum: 1 }, downloaded: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$downloadCount", 0] }, 0] }, 1, 0] } } } }
      ]),
      getUserUsageStats(userId)
    ])
    const typeMap = new Map(typeCounts.map((t) => [String(t._id), t.count]))
    const recipientMap = new Map(recipientCounts.map((r) => [String(r._id), r]))

    const eventsWithStats = events.map((event) => {
      const key = String(event._id)
      const rc = recipientMap.get(key) || { total: 0, downloaded: 0 }
      return {
        ...event,
        stats: {
          certificateTypesCount: typeMap.get(key) || 0,
          total: rc.total,
          downloaded: rc.downloaded,
          pending: rc.total - rc.downloaded
        }
      }
    })

    return NextResponse.json({
      events: eventsWithStats,
      usage
    })
  } catch (error) {
    console.error("Events GET error:", error)
    return NextResponse.json({ error: "Failed to fetch events" }, { status: 500 })
  }
}

// POST - Create new event
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const { name, description } = await request.json()
    
    if (!name) {
      return NextResponse.json({ error: "Event name required" }, { status: 400 })
    }

    // Check plan limits
    const canCreate = await canUserCreateEvent(userId)
    if (!canCreate.allowed) {
      return NextResponse.json({ 
        error: canCreate.reason,
        limitReached: true,
        currentCount: canCreate.currentCount,
        maxAllowed: canCreate.maxAllowed
      }, { status: 403 })
    }

    // Create event
    const event = await Event.create({
      name,
      description,
      ownerId: userId,
      isActive: true
    })

    // Create admin notification in database
    try {
      const Notification = (await import('@/models/Notification')).default
      const User = (await import('@/models/User')).default
      const user = await User.findById(userId).select('name email')
      
      if (user) {
        await Notification.create({
          type: "event_created",
          title: "New Event Created",
          description: `${user.name} created event: ${name}`,
          userId: userId,
          metadata: {
            userName: user.name,
            userEmail: user.email,
            eventName: name,
            eventId: event._id.toString()
          },
          read: false
        })
      }
    } catch (notifError) {
      console.error('Failed to create event notification:', notifError)
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        createdAt: event.createdAt
      }
    })
  } catch (error) {
    console.error("Events POST error:", error)
    return NextResponse.json({ error: "Failed to create event" }, { status: 500 })
  }
}

// PUT - Update event
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const { eventId, name, description } = await request.json()
    
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    // Verify ownership
    const isOwner = await verifyEventOwnership(eventId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Update event
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (description !== undefined) updateData.description = description

    const event = await Event.findByIdAndUpdate(
      eventId,
      updateData,
      { new: true }
    )

    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      event: {
        id: event._id,
        name: event.name,
        description: event.description,
        updatedAt: event.updatedAt
      }
    })
  } catch (error) {
    console.error("Events PUT error:", error)
    return NextResponse.json({ error: "Failed to update event" }, { status: 500 })
  }
}

// DELETE - Delete event (soft delete)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const permanent = searchParams.get("permanent") === "true"
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    // Verify ownership
    const isOwner = await verifyEventOwnership(eventId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (permanent) {
      // Permanent delete - remove event and all related data
      const certTypes = await CertificateType.find({ eventId }).select("_id")
      const certTypeIds = certTypes.map(ct => ct._id)
      
      // Delete all recipients for this event's certificate types
      await Recipient.deleteMany({ certificateTypeId: { $in: certTypeIds } })
      
      // Delete all certificate types
      await CertificateType.deleteMany({ eventId })
      
      // Delete the event
      await Event.findByIdAndDelete(eventId)
      
      return NextResponse.json({
        success: true,
        message: "Event and all related data permanently deleted"
      })
    } else {
      // Soft delete - just mark as inactive
      await Event.findByIdAndUpdate(eventId, { isActive: false })
      
      return NextResponse.json({
        success: true,
        message: "Event deleted successfully"
      })
    }
  } catch (error) {
    console.error("Events DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete event" }, { status: 500 })
  }
}
