import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

// GET - Get certificate data for download page
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const typeId = searchParams.get("typeId")
    const recipientId = searchParams.get("recipientId")
    
    // Get single recipient for download
    if (recipientId) {
      const recipient = await Recipient.findById(recipientId).lean()
      if (!recipient) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
      }
      
      const certType = await CertificateType.findById(recipient.certificateTypeId).lean()
      const event = await Event.findById(recipient.eventId).lean()
      
      return NextResponse.json({
        recipient,
        certificateType: certType,
        event
      })
    }
    
    // Get event info
    if (eventId && !typeId) {
      const event = await Event.findById(eventId).lean()
      if (!event || !event.isActive) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }
      
      const certTypes = await CertificateType.find({ eventId, isActive: true })
        .select("name")
        .lean()
      
      return NextResponse.json({
        event: {
          id: event._id,
          name: event.name,
          description: event.description
        },
        certificateTypes: certTypes
      })
    }
    
    // Get certificate type with recipients for search
    if (eventId && typeId) {
      const event = await Event.findById(eventId).lean()
      if (!event || !event.isActive) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }
      
      const certType = await CertificateType.findById(typeId).lean()
      if (!certType || !certType.isActive) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }
      
      return NextResponse.json({
        event: {
          id: event._id,
          name: event.name
        },
        certificateType: {
          id: certType._id,
          name: certType.name,
          templateImage: certType.templateImage,
          textFields: certType.textFields
        }
      })
    }
    
    return NextResponse.json({ error: "Event ID required" }, { status: 400 })
  } catch (error) {
    console.error("Download GET error:", error)
    return NextResponse.json({ error: "Failed to fetch data" }, { status: 500 })
  }
}

// POST - Search recipient and track download
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { eventId, typeId, searchQuery, searchType } = await request.json()
    
    if (!eventId || !typeId || !searchQuery) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }
    
    // Build search query
    const query: Record<string, unknown> = {
      eventId,
      certificateTypeId: typeId
    }
    
    // Search by different fields
    if (searchType === "email") {
      query.email = { $regex: searchQuery, $options: "i" }
    } else if (searchType === "mobile") {
      query.mobile = { $regex: searchQuery, $options: "i" }
    } else if (searchType === "regNo") {
      query.regNo = { $regex: searchQuery, $options: "i" }
    } else {
      // Default: search by name
      query.name = { $regex: searchQuery, $options: "i" }
    }
    
    const recipients = await Recipient.find(query)
      .limit(10)
      .lean()
    
    if (recipients.length === 0) {
      return NextResponse.json({ 
        found: false,
        message: "No certificate found with the provided details"
      })
    }
    
    // Get certificate type for template
    const certType = await CertificateType.findById(typeId).lean()
    
    return NextResponse.json({
      found: true,
      recipients: recipients.map(r => ({
        id: r._id,
        name: r.name,
        email: r.email,
        mobile: r.mobile,
        regNo: r.regNo,
        customFields: r.customFields,
        downloadCount: r.downloadCount
      })),
      certificateType: certType ? {
        name: certType.name,
        templateImage: certType.templateImage,
        textFields: certType.textFields
      } : null
    })
  } catch (error) {
    console.error("Download POST error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}

// PUT - Track download (increment download count)
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const { recipientId } = await request.json()
    
    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID required" }, { status: 400 })
    }
    
    const recipient = await Recipient.findByIdAndUpdate(
      recipientId,
      { $inc: { downloadCount: 1 } },
      { new: true }
    )
    
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      downloadCount: recipient.downloadCount
    })
  } catch (error) {
    console.error("Download PUT error:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
