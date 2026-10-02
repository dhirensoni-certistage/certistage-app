import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { requireClientUser } from "@/lib/client-auth.server"

// GET - Get the logged-in user's profile
export async function GET(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    await connectDB()
    const user = await User.findById(auth.userId).select("-password").lean()

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        plan: user.plan,
        pendingPlan: user.pendingPlan || null,
        planExpiresAt: user.planExpiresAt,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PUT - Update user profile
export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const { name, phone, organization } = await request.json()

    // Build update object (only allow certain fields to be updated)
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (organization !== undefined) updateData.organization = organization

    const user = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true }
    ).select("-password")

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
      },
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

// Direct plan updates via PATCH are disabled for security
export async function PATCH() {
  return NextResponse.json(
    { error: "Direct plan updates are disabled. Plan upgrades must be completed via checkout payment." },
    { status: 403 }
  )
}
