import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserAddRecipients, verifyEventOwnership, canUserUseFeature, recordCertificatesIssued } from "@/lib/plan-limits"
import { cleanCustomFields } from "@/lib/certificate-fields"
import { requireClientUser } from "@/lib/client-auth.server"
import { trashRecipients } from "@/lib/trash.server"
import { logAudit } from "@/lib/audit-logger"
import mongoose from "mongoose"

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
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

    if (!certificateTypeId) {
      return NextResponse.json({ error: "Certificate Type ID required" }, { status: 400 })
    }

    // Verify certificate type and event ownership
    const certType = await CertificateType.findById(certificateTypeId).lean()
    if (!certType) {
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    if (userId) {
      const isOwner = await verifyEventOwnership(certType.eventId.toString(), userId)
      if (!isOwner) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
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
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { eventId, certificateTypeId, recipients, isBulkImport } = body
    
    if (!eventId || !certificateTypeId || !recipients || !Array.isArray(recipients)) {
      return NextResponse.json({ 
        error: "Missing required fields",
        details: { eventId: !!eventId, certificateTypeId: !!certificateTypeId, recipients: Array.isArray(recipients) }
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
        customFields: cleanCustomFields(r.customFields)
      }
    })

    const created = await Recipient.insertMany(recipientDocs)
    await recordCertificatesIssued(userId, created.length)

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

// DELETE - Move recipient(s) to Recently deleted (restorable for 30 days)
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")
    const recipientIdsParam = searchParams.get("recipientIds")
    const certificateTypeId = searchParams.get("certificateTypeId")
    const clearAll = searchParams.get("clearAll") === "true"
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

    if (clearAll && certificateTypeId) {
      const certType = await CertificateType.findById(certificateTypeId).lean()
      if (!certType) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }
      const isOwner = await verifyEventOwnership(certType.eventId.toString(), userId)
      if (!isOwner) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
      const { batchId, count } = await trashRecipients({ filter: { certificateTypeId }, ownerId: userId, certTypeName: certType.name })
      await logAudit({ userId, action: "DELETE_RECIPIENTS", resourceId: certificateTypeId, details: { count, batchId, clearAll: true } })
      return NextResponse.json({ success: true, deletedCount: count, batchId })
    }

    const ids = (recipientId ? [recipientId] : (recipientIdsParam || "").split(","))
      .map((id) => id.trim())
      .filter((id) => mongoose.isValidObjectId(id))
    if (ids.length === 0) {
      return NextResponse.json({ error: "Recipient ID or clearAll flag required" }, { status: 400 })
    }

    const recipients = await Recipient.find({ _id: { $in: ids } }).select("_id eventId certificateTypeId").lean()
    if (recipients.length === 0) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Every recipient must belong to an event this organiser owns
    const eventIds = Array.from(new Set(recipients.map((r) => String(r.eventId))))
    const ownedEvents = await Event.countDocuments({ _id: { $in: eventIds }, ownerId: userId })
    if (ownedEvents !== eventIds.length) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    const typeIds = Array.from(new Set(recipients.map((r) => String(r.certificateTypeId))))
    let certTypeName = ""
    if (typeIds.length === 1) {
      const certType = await CertificateType.findById(typeIds[0]).select("name").lean()
      certTypeName = certType?.name || ""
    }

    const { batchId, count } = await trashRecipients({
      filter: { _id: { $in: recipients.map((r) => r._id) } },
      ownerId: userId,
      certTypeName
    })
    await logAudit({ userId, action: "DELETE_RECIPIENTS", resourceId: batchId, details: { count, batchId } })
    return NextResponse.json({ success: true, deletedCount: count, batchId })
  } catch (error) {
    console.error("Recipients DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete recipient" }, { status: 500 })
  }
}

// PUT - Update recipient
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { recipientId, updates } = body
    
    if (!recipientId || !updates) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Get recipient
    const recipient = await Recipient.findById(recipientId)
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Verify ownership through event
    const event = await Event.findById(recipient.eventId)
    if (!event || event.ownerId.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Build full name from prefix + firstName + lastName
    const prefix = (updates.prefix || recipient.prefix || "").trim()
    const firstName = (updates.firstName || recipient.firstName || "").trim()
    const lastName = (updates.lastName || recipient.lastName || "").trim()
    const fullName = [prefix, firstName, lastName].filter(Boolean).join(" ")

    // Update recipient
    const updatedRecipient = await Recipient.findByIdAndUpdate(
      recipientId,
      {
        prefix,
        firstName,
        lastName,
        name: fullName,
        email: updates.email !== undefined ? updates.email.trim() : recipient.email,
        mobile: updates.mobile !== undefined ? updates.mobile.trim() : recipient.mobile,
        regNo: updates.regNo !== undefined ? updates.regNo.trim() : recipient.regNo,
      },
      { new: true }
    )

    return NextResponse.json({
      success: true,
      recipient: updatedRecipient
    })
  } catch (error) {
    console.error("Recipients PUT error:", error)
    return NextResponse.json({ error: "Failed to update recipient" }, { status: 500 })
  }
}
