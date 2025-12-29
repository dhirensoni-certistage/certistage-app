import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserCreateCertificateType, verifyEventOwnership } from "@/lib/plan-limits"

function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

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
          id: (certType as any)._id,
          ...certType,
          searchFields: (certType as any).searchFields || { name: true, email: false, mobile: false, regNo: false },
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
        searchFields: (type as any).searchFields || { name: true, email: false, mobile: false, regNo: false },
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
      isActive: true,
      shortCode: generateShortCode()
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

    const body = await request.json()
    const { userId, typeId } = body

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

    // Update fields - accept all possible fields
    const updateData: Record<string, unknown> = {}

    // Basic fields
    if (body.name) updateData.name = body.name
    if (body.templateImage !== undefined) updateData.templateImage = body.templateImage
    if (body.textFields !== undefined) updateData.textFields = body.textFields

    // Font and styling fields (stored in textFields or as separate fields)
    if (body.fontSize !== undefined) updateData.fontSize = body.fontSize
    if (body.fontFamily !== undefined) updateData.fontFamily = body.fontFamily
    if (body.fontBold !== undefined) updateData.fontBold = body.fontBold
    if (body.fontItalic !== undefined) updateData.fontItalic = body.fontItalic
    if (body.textPosition !== undefined) updateData.textPosition = body.textPosition
    if (body.showNameField !== undefined) updateData.showNameField = body.showNameField
    if (body.textCase !== undefined) updateData.textCase = body.textCase
    if (body.customFields !== undefined) updateData.customFields = body.customFields
    if (body.signatures !== undefined) updateData.signatures = body.signatures
    if (body.searchFields !== undefined) updateData.searchFields = body.searchFields

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
        textPosition: updated.textPosition,
        fontSize: updated.fontSize,
        fontFamily: updated.fontFamily,
        fontBold: updated.fontBold,
        fontItalic: updated.fontItalic,
        textCase: updated.textCase,
        searchFields: updated.searchFields,
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
