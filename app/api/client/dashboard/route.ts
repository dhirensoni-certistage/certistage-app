import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

import mongoose from "mongoose"

function generateShortCode(length = 6): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  let result = ''
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return result
}

// GET - Get dashboard data for an event
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const includeRecipients = searchParams.get("includeRecipients") !== "false" // Default true for backward compatibility

    if (!eventId) {
      return NextResponse.json({ error: "Event ID required" }, { status: 400 })
    }

    const eventObjectId = new mongoose.Types.ObjectId(eventId)

    // Get event
    const event = await Event.findById(eventId).lean()
    if (!event) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    // Get certificate types
    const certTypes = await CertificateType.find({ eventId }).lean()

    // Lazy migration: Generate shortCode for types that don't have it
    const updates = certTypes
      .filter(ct => !ct.shortCode)
      .map(async (ct) => {
        const shortCode = generateShortCode()
        await CertificateType.findByIdAndUpdate(ct._id, { shortCode })
        ct.shortCode = shortCode
      })

    if (updates.length > 0) {
      await Promise.all(updates)
    }

    let certificateTypes
    let totalRecipients = 0
    let downloadedRecipients = 0

    if (includeRecipients) {
      // Get recipients grouped by certificate type using aggregation
      const recipientsByType = await Recipient.aggregate([
        { $match: { eventId: eventObjectId } },
        {
          $group: {
            _id: "$certificateTypeId",
            recipients: {
              $push: {
                id: { $toString: "$_id" },
                name: "$name",
                email: { $ifNull: ["$email", ""] },
                mobile: { $ifNull: ["$mobile", ""] },
                certificateId: { $ifNull: ["$regNo", { $toString: "$_id" }] },
                downloadCount: { $ifNull: ["$downloadCount", 0] },
                downloadedAt: "$lastDownloadAt"
              }
            },
            total: { $sum: 1 },
            downloaded: { $sum: { $cond: [{ $gt: [{ $ifNull: ["$downloadCount", 0] }, 0] }, 1, 0] } }
          }
        }
      ])

      // Create map for quick lookup
      const recipientsMap = new Map(recipientsByType.map(r => [r._id?.toString(), r]))

      // Build certificate types with recipients
      certificateTypes = certTypes.map(ct => {
        const typeData = recipientsMap.get(ct._id?.toString()) || { recipients: [], total: 0, downloaded: 0 }
        const ctAny = ct as any

        return {
          id: ct._id?.toString(),
          name: ct.name,
          templateImage: ctAny.templateImage || "",
          template: ctAny.templateImage || "",
          textFields: ctAny.textFields || [],
          fontSize: ctAny.fontSize || 24,
          fontFamily: ctAny.fontFamily || "Arial",
          fontBold: ctAny.fontBold || false,
          fontItalic: ctAny.fontItalic || false,
          textPosition: ctAny.textPosition || { x: 50, y: 60 },
          showNameField: ctAny.showNameField !== false,
          customFields: ctAny.customFields || [],
          signatures: ctAny.signatures || [],
          createdAt: ctAny.createdAt,
          shortCode: ctAny.shortCode,
          recipients: typeData.recipients.map((r: any) => ({
            ...r,
            status: r.downloadCount > 0 ? "downloaded" : "pending"
          })),
          stats: {
            total: typeData.total,
            downloaded: typeData.downloaded,
            pending: typeData.total - typeData.downloaded
          }
        }
      })

      // Calculate totals
      totalRecipients = recipientsByType.reduce((sum, r) => sum + r.total, 0)
      downloadedRecipients = recipientsByType.reduce((sum, r) => sum + r.downloaded, 0)
    } else {
      // Stats only mode (faster for dashboard)
      const statsAgg = await Recipient.aggregate([
        { $match: { eventId: eventObjectId } },
        {
          $group: {
            _id: "$certificateTypeId",
            total: { $sum: 1 },
            downloaded: { $sum: { $cond: [{ $gt: ["$downloadCount", 0] }, 1, 0] } }
          }
        }
      ])

      const statsMap = new Map(statsAgg.map(s => [s._id?.toString(), s]))

      certificateTypes = certTypes.map(ct => {
        const stats = statsMap.get(ct._id?.toString()) || { total: 0, downloaded: 0 }
        const ctAny = ct as any

        return {
          id: ct._id?.toString(),
          name: ct.name,
          templateImage: ctAny.templateImage || "",
          template: ctAny.templateImage || "",
          textFields: ctAny.textFields || [],
          fontSize: ctAny.fontSize || 24,
          fontFamily: ctAny.fontFamily || "Arial",
          fontBold: ctAny.fontBold || false,
          fontItalic: ctAny.fontItalic || false,
          textPosition: ctAny.textPosition || { x: 50, y: 60 },
          showNameField: ctAny.showNameField !== false,
          customFields: ctAny.customFields || [],
          signatures: ctAny.signatures || [],
          createdAt: ctAny.createdAt,
          shortCode: ctAny.shortCode,
          recipients: [],
          stats: {
            total: stats.total,
            downloaded: stats.downloaded,
            pending: stats.total - stats.downloaded
          }
        }
      })

      totalRecipients = statsAgg.reduce((sum, s) => sum + s.total, 0)
      downloadedRecipients = statsAgg.reduce((sum, s) => sum + s.downloaded, 0)
    }

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
