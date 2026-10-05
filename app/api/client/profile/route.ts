import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { requireClientUser } from "@/lib/client-auth.server"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { canHidePoweredBy } from "@/lib/branding.server"

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
        createdAt: user.createdAt,
        hidePoweredBy: !!user.hidePoweredBy,
        canHidePoweredBy: canHidePoweredBy(user)
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
    const { name, phone, organization, hidePoweredBy } = await request.json()

    // Build update object (only allow certain fields to be updated)
    const updateData: Record<string, unknown> = {}
    if (name) updateData.name = name
    if (phone) updateData.phone = phone
    if (organization !== undefined) updateData.organization = organization
    if (typeof hidePoweredBy === "boolean") {
      // Hiding the line is a paid-plan feature; showing it is always allowed
      if (hidePoweredBy) {
        const current = await User.findById(userId).select("plan planExpiresAt").lean<{ plan?: string; planExpiresAt?: Date }>()
        if (!canHidePoweredBy(current)) {
          return NextResponse.json({ error: "Hiding \"Powered by CertiStage\" is available on paid plans. Upgrade to switch it off." }, { status: 403 })
        }
      }
      updateData.hidePoweredBy = hidePoweredBy
    }

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
        planExpiresAt: user.planExpiresAt,
        hidePoweredBy: !!user.hidePoweredBy,
        canHidePoweredBy: canHidePoweredBy(user)
      },
      message: "Profile updated successfully"
    })
  } catch (error) {
    console.error("Profile PUT error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}

// PATCH - remember the paid plan picked at signup (Google sign-up) so the user can pay for it.
// Only pendingPlan can be set here, and only to a paid plan that is on sale; the plan itself
// changes only after a verified payment.
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const body = await request.json().catch(() => ({}))
    const pendingPlan = typeof body?.pendingPlan === "string" ? body.pendingPlan : ""
    if (!pendingPlan) {
      return NextResponse.json({ error: "Only a plan to pay for can be set here" }, { status: 400 })
    }

    const plan = getPlanMap(await getPlanConfigFromDb())[pendingPlan]
    const testBlocked = pendingPlan === "test" && process.env.ENABLE_TEST_PLAN !== "true"
    if (!plan || plan.enabled === false || !(plan.price > 0) || testBlocked) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 })
    }

    await connectDB()
    const result = await User.updateOne({ _id: auth.userId }, { $set: { pendingPlan } })
    if (result.matchedCount === 0) return NextResponse.json({ error: "User not found" }, { status: 404 })

    return NextResponse.json({ success: true, pendingPlan })
  } catch (error) {
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to save plan" }, { status: 500 })
  }
}
