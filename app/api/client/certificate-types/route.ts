import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { canUserCreateCertificateType, verifyEventOwnership } from "@/lib/plan-limits"
import { requireClientUser } from "@/lib/client-auth.server"
import { trashCertificateType } from "@/lib/trash.server"
import { logAudit } from "@/lib/audit-logger"

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
    const typeId = searchParams.get("typeId") // For single type fetch
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

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

      const certTypeAny = certType as any
      // Handle signature position migration
      if (certTypeAny.signatures) {
        certTypeAny.signatures = certTypeAny.signatures.map((sig: any) => {
          if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
            return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
          }
          return sig
        })
      }

      return NextResponse.json({
        certificateType: {
          id: certTypeAny._id.toString(),
          _id: certTypeAny._id,
          ...certTypeAny,
          template: certTypeAny.templateImage || "",
          searchFields: certTypeAny.searchFields || { name: true, email: false, mobile: false, regNo: false },
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

      const typeAny = type as any
      // Handle signature position migration
      if (typeAny.signatures) {
        typeAny.signatures = typeAny.signatures.map((sig: any) => {
          if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
            return { ...sig, position: { x: sig.x ?? 80, y: sig.y ?? 80 } }
          }
          return sig
        })
      }

      return {
        ...typeAny,
        id: typeAny._id.toString(),
        _id: typeAny._id,
        template: typeAny.templateImage || "",
        searchFields: typeAny.searchFields || { name: true, email: false, mobile: false, regNo: false },
        stats: {
          total,
          downloaded,
          pending: total - downloaded
        }
      }
    }))

    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    return NextResponse.json({
      event: {
        ...event,
        id: (event as any)._id.toString(),
        certificateTypes: typesWithStats
      }
    })
  } catch (error) {
    console.error("Certificate types GET error:", error)
    return NextResponse.json({ error: "Failed to fetch certificate types" }, { status: 500 })
  }
}

// POST - Create new certificate type
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const { eventId, name, templateImage, textFields } = await request.json()

    if (!eventId || !name) {
      return NextResponse.json({ error: "Event ID and name required" }, { status: 400 })
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
        id: certType._id.toString(),
        _id: certType._id,
        name: certType.name,
        createdAt: certType.createdAt,
        stats: { total: 0, downloaded: 0, pending: 0 }
      }
    })
  } catch (error) {
    console.error("Certificate types POST error:", error)
    return NextResponse.json({ error: "Failed to create certificate type" }, { status: 500 })
  }
}

// Accept only #RRGGBB (or #RGB, expanded) so arbitrary strings never reach the renderers
function normalizeHexColor(value: unknown): string | null {
  if (typeof value !== "string") return null
  const trimmed = value.trim()
  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) return trimmed.toLowerCase()
  if (/^#[0-9a-fA-F]{3}$/.test(trimmed)) {
    return ("#" + trimmed.slice(1).split("").map((c) => c + c).join("")).toLowerCase()
  }
  return null
}

// PUT - Update certificate type
export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { typeId } = body

    if (!typeId) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
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
    if (body.template !== undefined) updateData.templateImage = body.template
    if (body.textFields !== undefined) updateData.textFields = body.textFields

    // Font and styling fields (stored in textFields or as separate fields)
    if (body.fontSize !== undefined) updateData.fontSize = body.fontSize
    if (body.fontFamily !== undefined) updateData.fontFamily = body.fontFamily
    if (body.fontBold !== undefined) updateData.fontBold = body.fontBold
    if (body.fontItalic !== undefined) updateData.fontItalic = body.fontItalic
    if (body.fontColor !== undefined) {
      const color = normalizeHexColor(body.fontColor)
      if (color) updateData.fontColor = color
    }
    if (body.textPosition !== undefined) updateData.textPosition = body.textPosition
    if (body.showNameField !== undefined) updateData.showNameField = body.showNameField
    if (body.textCase !== undefined) updateData.textCase = body.textCase
    if (body.customFields !== undefined) {
      updateData.customFields = Array.isArray(body.customFields)
        ? body.customFields.map((field: any) => {
            if (field?.fontColor === undefined) return field
            const color = normalizeHexColor(field.fontColor)
            return color ? { ...field, fontColor: color } : { ...field, fontColor: "#000000" }
          })
        : body.customFields
    }
    if (body.signatures !== undefined) {
      // Ensure signatures use the nested position format
      updateData.signatures = body.signatures.map((sig: any) => {
        if (!sig.position && (sig.x !== undefined || sig.y !== undefined)) {
          return {
            id: sig.id,
            image: sig.image,
            width: sig.width,
            position: { x: sig.x ?? 80, y: sig.y ?? 80 }
          }
        }
        return sig
      })
    }
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
        fontColor: updated.fontColor,
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
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

    if (!typeId) {
      return NextResponse.json({ error: "Type ID required" }, { status: 400 })
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

    // Both "soft" and "permanent" deletes go to Recently deleted; the organiser can restore for 30 days
    const { batchId, recipients } = await trashCertificateType(certType.toObject(), userId)
    await logAudit({ userId, action: "DELETE_CERTIFICATE_TYPE", resourceId: typeId, details: { name: certType.name, recipients, batchId } })

    return NextResponse.json({
      success: true,
      batchId,
      recipientsDeleted: recipients,
      message: "Certificate type moved to Recently deleted"
    })
  } catch (error) {
    console.error("Certificate types DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete certificate type" }, { status: 500 })
  }
}
