import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserAddRecipients, verifyEventOwnership, canUserUseFeature } from "@/lib/plan-limits"

// GET - List recipients for a certificate type
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const certificateTypeId = searchParams.get("certificateTypeId")
    const eventId = searchParams.get("eventId")
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "50")
    const search = searchParams.get("search") || ""
    
    if (!certificateTypeId) {
      return NextResponse.json({ error: "Certificate Type ID required" }, { status: 400 })
    }

    const query: Record<string, unknown> = { certificateTypeId }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { mobile: { $regex: search, $options: "i" } }
      ]
    }

    const total = await Recipient.countDocuments(query)
    const recipients = await Recipient.find(query)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    return NextResponse.json({
      recipients,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("Recipients GET error:", error)
    return NextResponse.json({ error: "Failed to fetch recipients" }, { status: 500 })
  }
}

// POST - Add recipients (single or bulk)
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { userId, eventId, certificateTypeId, recipients, isBulkImport } = body
    
    console.log("Recipients POST request:", { userId, eventId, certificateTypeId, recipientsCount: recipients?.length, isBulkImport })
    
    if (!userId || !eventId || !certificateTypeId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ 
        error: "Missing required fields",
        details: { userId: !!userId, eventId: !!eventId, certificateTypeId: !!certificateTypeId, recipients: Array.isArray(recipients) }
      }, { status: 400 })
    }

    // Verify event ownership
    const isOwner = await verifyEventOwnership(eventId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check if bulk import is allowed for this plan
    if (isBulkImport) {
      const canImport = await canUserUseFeature(userId, "canImportData")
      if (!canImport) {
        return NextResponse.json({ 
          error: "Bulk import not available in your plan. Upgrade to Professional or higher.",
          featureRestricted: true
        }, { status: 403 })
      }
    }

    // Check plan limits
    const canAdd = await canUserAddRecipients(userId, recipients.length)
    if (!canAdd.allowed) {
      // If partial import is possible
      if (canAdd.availableSlots > 0) {
        return NextResponse.json({ 
          error: `Can only add ${canAdd.availableSlots} more certificates. You're trying to add ${recipients.length}.`,
          limitReached: true,
          currentCount: canAdd.currentCount,
          maxAllowed: canAdd.maxAllowed,
          availableSlots: canAdd.availableSlots,
          partialAllowed: true
        }, { status: 403 })
      }
      
      return NextResponse.json({ 
        error: canAdd.reason,
        limitReached: true,
        currentCount: canAdd.currentCount,
        maxAllowed: canAdd.maxAllowed,
        availableSlots: 0
      }, { status: 403 })
    }

    // Verify certificate type exists
    const certType = await CertificateType.findById(certificateTypeId)
    if (!certType) {
      console.log("Certificate type not found:", certificateTypeId)
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    // Create recipients
    const recipientDocs = recipients.map((r: any) => {
      // Build full name from prefix + firstName + lastName
      const prefix = (r.prefix || "").trim()
      const firstName = (r.firstName || r.name || "").trim()
      const lastName = (r.lastName || "").trim()
      const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ")
      
      return {
        prefix,
        firstName,
        lastName,
        name: fullName,
        email: r.email || "",
        mobile: r.mobile || "",
        regNo: r.regNo || r.registrationNo || r.certificateId || "",
        certificateTypeId,
        eventId,
        downloadCount: 0,
        customFields: r.customFields || {}
      }
    })

    const created = await Recipient.insertMany(recipientDocs)

    return NextResponse.json({
      success: true,
      count: created.length,
      message: `${created.length} recipient(s) added successfully`
    })
  } catch (error: any) {
    console.error("Recipients POST error:", error?.message || error)
    return NextResponse.json({ 
      error: "Failed to add recipients",
      details: error?.message || "Unknown error"
    }, { status: 500 })
  }
}

// DELETE - Remove recipient(s)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")
    const certificateTypeId = searchParams.get("certificateTypeId")
    const clearAll = searchParams.get("clearAll") === "true"
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    if (clearAll && certificateTypeId) {
      // Clear all recipients from a certificate type
      const certType = await CertificateType.findById(certificateTypeId).populate("eventId")
      if (!certType) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }

      // Verify ownership
      const event = await Event.findById(certType.eventId)
      if (!event || event.ownerId.toString() !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      const result = await Recipient.deleteMany({ certificateTypeId })
      return NextResponse.json({ success: true, deletedCount: result.deletedCount })
    }

    if (recipientId) {
      // Delete single recipient
      const recipient = await Recipient.findById(recipientId)
      if (!recipient) {
        return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
      }

      // Verify ownership through event
      const event = await Event.findById(recipient.eventId)
      if (!event || event.ownerId.toString() !== userId) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }

      await Recipient.findByIdAndDelete(recipientId)
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Recipient ID or clearAll flag required" }, { status: 400 })
  } catch (error) {
    console.error("Recipients DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete recipient" }, { status: 500 })
  }
}
