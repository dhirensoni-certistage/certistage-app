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
    const eventId = searchParams.get("eventId") || searchParams.get("event")
    const typeId = searchParams.get("typeId")
    const recipientId = searchParams.get("recipientId")
    const certId = searchParams.get("cert") // Individual certificate by regNo

    // Get single recipient by regNo (individual download link)
    if (eventId && certId) {
      // Find recipient by regNo in this event
      const recipient = await Recipient.findOne({
        eventId,
        regNo: certId
      }).lean()

      if (!recipient) {
        return NextResponse.json({ error: "Certificate not found" }, { status: 404 })
      }

      // Parallel fetch for speed
      const [certType, event] = await Promise.all([
        CertificateType.findById(recipient.certificateTypeId).lean(),
        Event.findById(eventId).lean()
      ])

      if (!event || !event.isActive) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }

      if (!certType || !certType.isActive) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }

      return NextResponse.json({
        recipient: {
          id: recipient._id.toString(),
          name: recipient.name,
          prefix: recipient.prefix,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          email: recipient.email,
          mobile: recipient.mobile,
          certificateId: recipient.regNo,
          downloadCount: recipient.downloadCount || 0
        },
        certificateType: {
          id: certType._id.toString(),
          name: certType.name,
          templateImage: certType.templateImage,
          textPosition: certType.textPosition || { x: 50, y: 60 },
          fontSize: certType.fontSize || 24,
          fontFamily: certType.fontFamily || "Arial",
          fontBold: certType.fontBold || false,
          fontItalic: certType.fontItalic || false,
          textCase: certType.textCase || "none",
          showNameField: certType.showNameField !== false,
          customFields: certType.customFields || [],
          signatures: (certType.signatures || []).map((sig: any) => {
            if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
              return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
            }
            return sig
          })
        },
        event: {
          id: event._id.toString(),
          name: event.name,
          ownerId: event.ownerId?.toString()
        }
      })
    }

    // Get single recipient by ID
    if (recipientId) {
      const recipient = await Recipient.findById(recipientId).lean()
      if (!recipient) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
      }

      // Parallel fetch for speed
      const [certType, event] = await Promise.all([
        CertificateType.findById(recipient.certificateTypeId).lean(),
        Event.findById(recipient.eventId).lean()
      ])

      const certTypeAny = certType as any
      if (certTypeAny && certTypeAny.signatures) {
        certTypeAny.signatures = certTypeAny.signatures.map((sig: any) => {
          if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
            return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
          }
          return sig
        })
      }

      return NextResponse.json({
        recipient,
        certificateType: certTypeAny,
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
      const [event, certType, recipients] = await Promise.all([
        Event.findById(eventId).lean(),
        CertificateType.findById(typeId).lean(),
        Recipient.find({ eventId, certificateTypeId: typeId })
          .select("name email mobile regNo downloadCount lastDownloadAt prefix firstName lastName")
          .lean()
      ])

      if (!event || !event.isActive) {
        return NextResponse.json({ error: "Event not found" }, { status: 404 })
      }

      if (!certType || !certType.isActive) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }

      const downloaded = recipients.filter(r => (r.downloadCount || 0) > 0).length

      return NextResponse.json({
        event: {
          id: event._id,
          name: event.name,
          ownerId: event.ownerId
        },
        certificateType: {
          id: certType._id,
          name: certType.name,
          templateImage: certType.templateImage,
          textPosition: certType.textPosition || { x: 50, y: 60 },
          fontSize: certType.fontSize || 24,
          fontFamily: certType.fontFamily || "Arial",
          fontBold: certType.fontBold || false,
          fontItalic: certType.fontItalic || false,
          textCase: certType.textCase || "none",
          showNameField: certType.showNameField !== false,
          customFields: certType.customFields || [],
          signatures: (certType.signatures || []).map((sig: any) => {
            if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
              return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
            }
            return sig
          }),
          searchFields: certType.searchFields || { name: true, email: false, mobile: false, regNo: false },
          stats: {
            total: recipients.length,
            downloaded,
            pending: recipients.length - downloaded
          },
          createdAt: certType.createdAt
        },
        recipients: recipients.map(r => ({
          id: r._id.toString(),
          name: r.name,
          prefix: r.prefix,
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email || "",
          mobile: r.mobile || "",
          certificateId: r.regNo || r._id.toString(),
          status: (r.downloadCount || 0) > 0 ? "downloaded" : "pending",
          downloadCount: r.downloadCount || 0
        })),
        downloadLimit: -1
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
      // Default: search by name - split into words for partial matching
      // This allows "komal patel" to match "Ms Komal Patel" or "Dr. Komal Patel"
      const searchWords = searchQuery.trim().split(/\s+/).filter((w: string) => w.length > 0)
      if (searchWords.length > 1) {
        // Multiple words: all words must be present (in any order)
        query.$and = searchWords.map((word: string) => ({
          name: { $regex: word, $options: "i" }
        }))
      } else {
        // Single word: simple regex match
        query.name = { $regex: searchQuery, $options: "i" }
      }
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
        textFields: certType.textFields,
        signatures: (certType.signatures || []).map((sig: any) => {
          if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
            return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
          }
          return sig
        })
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

    // Get recipient and check event owner's plan
    const recipient = await Recipient.findById(recipientId)
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Get event to find owner
    const event = await Event.findById(recipient.eventId)
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Import User model and plan limits
    const User = (await import("@/models/User")).default
    const { getPlanLimits } = await import("@/lib/plan-limits")

    const owner = await User.findById(event.ownerId)
    if (!owner) {
      return NextResponse.json({ error: "Event owner not found" }, { status: 404 })
    }

    const limits = getPlanLimits(owner.plan)

    // Check if free plan and already downloaded once
    if (owner.plan === "free" && recipient.downloadCount >= 1) {
      return NextResponse.json({
        error: "Free plan allows only 1 download per certificate. Please ask the event organizer to upgrade.",
        limitReached: true
      }, { status: 403 })
    }

    // Update download count
    const updatedRecipient = await Recipient.findByIdAndUpdate(
      recipientId,
      {
        $inc: { downloadCount: 1 },
        $set: { lastDownloadAt: new Date() }
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      downloadCount: updatedRecipient?.downloadCount || 1
    })
  } catch (error) {
    console.error("Download PUT error:", error)
    return NextResponse.json({ error: "Failed to track download" }, { status: 500 })
  }
}
