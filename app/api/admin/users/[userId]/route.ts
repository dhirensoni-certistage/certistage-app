import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Payment from "@/models/Payment"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB()
    const { userId } = await params

    const user = await User.findById(userId).select("-password").lean()
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get user's events with counts
    const events = await Event.aggregate([
      { $match: { ownerId: user._id } },
      {
        $lookup: {
          from: "certificatetypes",
          localField: "_id",
          foreignField: "eventId",
          as: "certificateTypes"
        }
      },
      {
        $lookup: {
          from: "recipients",
          localField: "_id",
          foreignField: "eventId",
          as: "recipients"
        }
      },
      {
        $project: {
          _id: 1,
          name: 1,
          isActive: 1,
          createdAt: 1,
          certificateTypesCount: { $size: "$certificateTypes" },
          recipientsCount: { $size: "$recipients" }
        }
      },
      { $sort: { createdAt: -1 } }
    ])

    // Get user's payments
    const payments = await Payment.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean()

    // Calculate stats
    const totalEvents = events.length
    const totalCertificates = events.reduce((sum, e) => sum + e.certificateTypesCount, 0)
    const totalRecipients = events.reduce((sum, e) => sum + e.recipientsCount, 0)

    return NextResponse.json({
      user,
      events,
      payments,
      stats: {
        totalEvents,
        totalCertificates,
        totalRecipients
      }
    })
  } catch (error) {
    console.error("User details API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch user details" },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB()
    const { userId } = await params
    const body = await request.json()

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Only allow updating isActive status
    if (typeof body.isActive === "boolean") {
      user.isActive = body.isActive
      await user.save()
    }

    return NextResponse.json({ 
      success: true, 
      user: { 
        _id: user._id, 
        isActive: user.isActive 
      } 
    })
  } catch (error) {
    console.error("User update API error:", error)
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    )
  }
}