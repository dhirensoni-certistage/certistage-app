import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserCreateEvent, getUserUsageStats, verifyEventOwnership } from "@/lib/plan-limits"

// GET - List user's events
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    // Get user's events with stats
    const events = await Event.find({ ownerId: userId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    // Get stats for each event
    const eventsWithStats = await Promise.all(events.map(async (event) => {
      const certTypesCount = await CertificateType.countDocuments({ eventId: event._id })
      const recipientsCount = await Recipient.countDocuments({ eventId: event._id })
      const downloadedCount = await Recipient.countDocuments({ eventId: event._id, downloadCount: { $gt: 0 } })
      
      return {
        ...event,
        stats: {
          certificateTypesCount: certTypesCount,
          total: recipientsCount,
          downloaded: downloadedCount,
          pending: recipientsCount - downloadedCount
        }
      }
    }))

    // Get usage stats
    const usage = await getUserUsageStats(userId)

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
    
    const { userId, name, description } = await request.json()
    
    if (!userId || !name) {
      return NextResponse.json({ error: "User ID and name required" }, { status: 400 })
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
    
    const { userId, eventId, name, description } = await request.json()
    
    if (!userId || !eventId) {
      return NextResponse.json({ error: "User ID and Event ID required" }, { status: 400 })
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
    const userId = searchParams.get("userId")
    const permanent = searchParams.get("permanent") === "true"
    
    if (!userId || !eventId) {
      return NextResponse.json({ error: "User ID and Event ID required" }, { status: 400 })
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
