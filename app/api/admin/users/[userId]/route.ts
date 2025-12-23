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

    // Update isActive status
    if (typeof body.isActive === "boolean") {
      user.isActive = body.isActive
    }

    // Update plan (admin can manually set plan)
    if (body.plan && ["free", "professional", "enterprise", "premium"].includes(body.plan)) {
      user.plan = body.plan
      // Set plan expiry to 1 year from now if upgrading to paid plan
      if (body.plan !== "free") {
        user.planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
      }
    }

    await user.save()

    return NextResponse.json({ 
      success: true, 
      user: { 
        _id: user._id, 
        isActive: user.isActive,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
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

// DELETE - Delete user and all their data
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    await connectDB()
    const { userId } = await params

    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Get all user's events
    const events = await Event.find({ ownerId: userId })
    const eventIds = events.map(e => e._id)

    // Delete all recipients for user's events
    const deletedRecipients = await Recipient.deleteMany({ eventId: { $in: eventIds } })

    // Delete all certificate types for user's events
    const deletedCertTypes = await CertificateType.deleteMany({ eventId: { $in: eventIds } })

    // Delete all events
    const deletedEvents = await Event.deleteMany({ ownerId: userId })

    // Delete all payments
    await Payment.deleteMany({ userId })

    // Delete email verification tokens if any
    try {
      const EmailVerificationToken = (await import("@/models/EmailVerificationToken")).default
      await EmailVerificationToken.deleteMany({ userId })
    } catch (e) {
      // Token model might not exist, ignore
    }

    // Delete password reset tokens if any
    try {
      const PasswordResetToken = (await import("@/models/PasswordResetToken")).default
      await PasswordResetToken.deleteMany({ userId })
    } catch (e) {
      // Token model might not exist, ignore
    }

    // Finally delete the user
    await User.findByIdAndDelete(userId)

    return NextResponse.json({
      success: true,
      deletedEvents: deletedEvents.deletedCount,
      deletedCertTypes: deletedCertTypes.deletedCount,
      deletedRecipients: deletedRecipients.deletedCount
    })
  } catch (error) {
    console.error("User delete API error:", error)
    return NextResponse.json(
      { error: "Failed to delete user" },
      { status: 500 }
    )
  }
}
