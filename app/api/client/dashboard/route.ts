import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

// GET - Get dashboard data for an event
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    // Get event
    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Get certificate types with recipients
    const certTypes = await CertificateType.find({ eventId }).lean()
    
    // Get all recipients for this event
    const recipients = await Recipient.find({ eventId }).lean()

    // Build certificate types with stats
    const certificateTypes = certTypes.map(ct => {
      const typeRecipients = recipients.filter(r => 
        r.certificateTypeId?.toString() === ct._id?.toString()
      )
      const downloaded = typeRecipients.filter(r => (r.downloadCount || 0) > 0).length
      const ctAny = ct as any
      
      return {
        id: ct._id?.toString(),
        name: ct.name,
        templateImage: ctAny.templateImage || "",
        template: ctAny.templateImage || "", // Alias for compatibility
        textFields: ctAny.textFields || [],
        // Font and styling fields
        fontSize: ctAny.fontSize || 24,
        fontFamily: ctAny.fontFamily || "Arial",
        fontBold: ctAny.fontBold || false,
        fontItalic: ctAny.fontItalic || false,
        textPosition: ctAny.textPosition || { x: 50, y: 60 },
        showNameField: ctAny.showNameField !== false,
        customFields: ctAny.customFields || [],
        signatures: ctAny.signatures || [],
        createdAt: ctAny.createdAt,
        recipients: typeRecipients.map(r => ({
          id: r._id?.toString(),
          name: r.name,
          email: r.email,
          mobile: r.mobile || "",
          certificateId: r.regNo || r._id?.toString(),
          downloadCount: r.downloadCount || 0,
          status: (r.downloadCount || 0) > 0 ? "downloaded" : "pending",
          downloadedAt: r.lastDownloadAt
        })),
        stats: {
          total: typeRecipients.length,
          downloaded,
          pending: typeRecipients.length - downloaded
        }
      }
    })

    // Calculate overall stats
    const totalRecipients = recipients.length
    const downloadedRecipients = recipients.filter(r => (r.downloadCount || 0) > 0).length

    const dashboardEvent = {
      _id: event._id?.toString(),
      name: event.name,
      description: event.description,
      certificateTypes,
      stats: {
        total: totalRecipients,
        downloaded: downloadedRecipients,
        pending: totalRecipients - downloadedRecipients,
        certificateTypesCount: certTypes.length
      }
    }

    return NextResponse.json({ event: dashboardEvent })
  } catch (error) {
    console.error("Dashboard GET error:", error)
    return NextResponse.json({ error: "Failed to fetch dashboard data" }, { status: 500 })
  }
}
