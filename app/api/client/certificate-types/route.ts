import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserCreateCertificateType, verifyEventOwnership } from "@/lib/plan-limits"

// GET - List certificate types for an event
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const userId = searchParams.get("userId")
    const typeId = searchParams.get("typeId") // For single type fetch
    
    // Single certificate type fetch
    if (typeId) {
      const certType = await CertificateType.findById(typeId).lean()
      if (!certType) {
        return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
      }
      
      // Verify ownership if userId provided
      if (userId) {
        const event = await Event.findById(certType.eventId)
        if (!event || event.ownerId.toString() !== userId) {
          return NextResponse.json({ error: "Access denied" }, { status: 403 })
        }
      }
      
      const total = await Recipient.countDocuments({ certificateTypeId: typeId })
      const downloaded = await Recipient.countDocuments({ certificateTypeId: typeId, downloadCount: { $gt: 0 } })
      
      return NextResponse.json({
        certificateType: {
          ...certType,
          stats: { total, downloaded, pending: total - downloaded }
        }
      })
    }
    
    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    // Verify ownership if userId provided
    if (userId) {
      const isOwner = await verifyEventOwnership(eventId, userId)
      if (!isOwner) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 })
      }
    }

    const certTypes = await CertificateType.find({ eventId, isActive: true })
      .sort({ createdAt: -1 })
      .lean()

    // Get recipient counts for each type
    const typesWithStats = await Promise.all(certTypes.map(async (type) => {
      const total = await Recipient.countDocuments({ certificateTypeId: type._id })
      const downloaded = await Recipient.countDocuments({ certificateTypeId: type._id, downloadCount: { $gt: 0 } })
      
      return {
        ...type,
        stats: {
          total,
          downloaded,
          pending: total - downloaded
        }
      }
    }))

    return NextResponse.json({ certificateTypes: typesWithStats })
  } catch (error) {
    console.error("Certificate types GET error:", error)
    return NextResponse.json({ error: "Failed to fetch certificate types" }, { status: 500 })
  }
}

// POST - Create new certificate type
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { userId, eventId, name, templateImage, textFields } = await request.json()
    
    if (!userId || !eventId || !name) {
      return NextResponse.json({ error: "User ID, Event ID and name required" }, { status: 400 })
    }

    // Verify event ownership
    const isOwner = await verifyEventOwnership(eventId, userId)
    if (!isOwner) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Check plan limits
    const canCreate = await canUserCreateCertificateType(userId, eventId)
    if (!canCreate.allowed) {
      return NextResponse.json({ 
        error: canCreate.reason,
        limitReached: true,
        currentCount: canCreate.currentCount,
        maxAllowed: canCreate.maxAllowed
      }, { status: 403 })
    }

    // Create certificate type
    const certType = await CertificateType.create({
      name,
      eventId,
      templateImage: templateImage || "",
      textFields: textFields || [],
      isActive: true
    })

    return NextResponse.json({
      success: true,
      certificateType: {
        id: certType._id,
        name: certType.name,
        createdAt: certType.createdAt
      }
    })
  } catch (error) {
    console.error("Certificate types POST error:", error)
    return NextResponse.json({ error: "Failed to create certificate type" }, { status: 500 })
  }
}

// PUT - Update certificate type
export async function PUT(request: NextRequest) {
  try {
    await connectDB()
    
    const { userId, typeId, name, templateImage, textFields } = await request.json()
    
    if (!userId || !typeId) {
      return NextResponse.json({ error: "User ID and Type ID required" }, { status: 400 })
    }

    // Get certificate type and verify ownership
    const certType = await CertificateType.findById(typeId)
    if (!certType) {
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    const event = await Event.findById(certType.eventId)
    if (!event || event.ownerId.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Update fields
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (templateImage !== undefined) updateData.templateImage = templateImage
    if (textFields !== undefined) updateData.textFields = textFields

    const updated = await CertificateType.findByIdAndUpdate(
      typeId,
      updateData,
      { new: true }
    )

    return NextResponse.json({
      success: true,
      certificateType: {
        id: updated._id,
        name: updated.name,
        templateImage: updated.templateImage,
        textFields: updated.textFields,
        updatedAt: updated.updatedAt
      }
    })
  } catch (error) {
    console.error("Certificate types PUT error:", error)
    return NextResponse.json({ error: "Failed to update certificate type" }, { status: 500 })
  }
}

// DELETE - Delete certificate type
export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const typeId = searchParams.get("typeId")
    const userId = searchParams.get("userId")
    const permanent = searchParams.get("permanent") === "true"
    
    if (!userId || !typeId) {
      return NextResponse.json({ error: "User ID and Type ID required" }, { status: 400 })
    }

    // Get certificate type and verify ownership
    const certType = await CertificateType.findById(typeId)
    if (!certType) {
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    const event = await Event.findById(certType.eventId)
    if (!event || event.ownerId.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    if (permanent) {
      // Delete all recipients first
      await Recipient.deleteMany({ certificateTypeId: typeId })
      // Delete certificate type
      await CertificateType.findByIdAndDelete(typeId)
      
      return NextResponse.json({
        success: true,
        message: "Certificate type and all recipients permanently deleted"
      })
    } else {
      // Soft delete
      await CertificateType.findByIdAndUpdate(typeId, { isActive: false })
      
      return NextResponse.json({
        success: true,
        message: "Certificate type deleted successfully"
      })
    }
  } catch (error) {
    console.error("Certificate types DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete certificate type" }, { status: 500 })
  }
}
