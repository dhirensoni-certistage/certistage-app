import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"

// API for fetching all certificate types in an event for cross-type search functionality

// GET - Get all certificate types for an event
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    // Verify event exists and is active
    const event = await Event.findById(eventId).lean()
    if (!event || !event.isActive) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Get all active certificate types for this event
    const certTypes = await CertificateType.find({ 
      eventId, 
      isActive: true,
      templateImage: { $exists: true, $ne: null }
    }).lean()

    // Build response with certificate types safely without dumping attendees
    const certificateTypes = certTypes.map(ct => ({
      id: ct._id.toString(),
      name: ct.name,
      template: ct.templateImage,
      templateImage: ct.templateImage,
      textPosition: ct.textPosition || { x: 50, y: 60 },
      fontSize: ct.fontSize || 24,
      fontFamily: ct.fontFamily || "Arial",
      fontBold: ct.fontBold || false,
      fontItalic: ct.fontItalic || false,
      showNameField: ct.showNameField !== false,
      customFields: ct.customFields || [],
      signatures: ct.signatures || [],
      searchFields: ct.searchFields || { name: true, email: false, mobile: false, regNo: false },
      recipients: []
    }))

    return NextResponse.json({
      event: {
        id: event._id.toString(),
        name: event.name
      },
      certificateTypes
    })
  } catch (error) {
    console.error("All types GET error:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}
