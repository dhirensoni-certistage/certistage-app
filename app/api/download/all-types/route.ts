import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

// GET - Get all certificate types with recipients for an event (for cross-type search)
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

    // Get all recipients for these certificate types
    const certTypeIds = certTypes.map(ct => ct._id)
    const allRecipients = await Recipient.find({
      eventId,
      certificateTypeId: { $in: certTypeIds }
    }).lean()

    // Group recipients by certificate type
    const recipientsByType: Record<string, any[]> = {}
    for (const recipient of allRecipients) {
      const typeId = recipient.certificateTypeId.toString()
      if (!recipientsByType[typeId]) {
        recipientsByType[typeId] = []
      }
      recipientsByType[typeId].push({
        id: recipient._id.toString(),
        name: recipient.name,
        email: recipient.email || "",
        mobile: recipient.mobile || "",
        certificateId: recipient.regNo || recipient._id.toString()
      })
    }

    // Build response with certificate types and their recipients
    const certificateTypes = certTypes.map(ct => ({
      id: ct._id.toString(),
      name: ct.name,
      template: ct.templateImage,
      textPosition: ct.textPosition || { x: 50, y: 60 },
      fontSize: ct.fontSize || 24,
      fontFamily: ct.fontFamily || "Arial",
      fontBold: ct.fontBold || false,
      fontItalic: ct.fontItalic || false,
      showNameField: ct.showNameField !== false,
      customFields: ct.customFields || [],
      signatures: ct.signatures || [],
      recipients: recipientsByType[ct._id.toString()] || []
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
