import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

// GET - Get user profile
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    const email = searchParams.get("email")
    
    // If no userId or email provided, try to get from NextAuth session
    if (!userId && !email) {
      try {
        const { getServerSession } = await import("next-auth")
        const { authOptions } = await import("@/lib/auth-config")
        const session = await getServerSession(authOptions)
        
        if (!session?.user?.email) {
          // No session - user not logged in, return 401
          return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
        }
        
        await connectDB()
        const user = await User.findOne({ email: session.user.email.toLowerCase() }).select("-password").lean()
        
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
            isActive: user.isActive,
            createdAt: user.createdAt
          }
        })
      } catch (sessionError) {
        console.error("Session error:", sessionError)
        return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
      }
    }
    
    await connectDB()
    
    // Try to get user by userId or email
    let user = null
    
    if (userId) {
      user = await User.findById(userId).select("-password").lean()
    } else if (email) {
      user = await User.findOne({ email: email.toLowerCase() }).select("-password").lean()
    }
    
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
    
    const { userId, name, phone, organization } = await request.json()
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

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


// PATCH - Update user plan (for upgrades)
export async function PATCH(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { plan, userId } = body
    
    if (!userId) {
      return NextResponse.json({ error: "User ID is required" }, { status: 400 })
    }
    
    if (!plan) {
      return NextResponse.json({ error: "Plan is required" }, { status: 400 })
    }

    const validPlans = ["free", "professional", "enterprise", "premium"]
    if (!validPlans.includes(plan)) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 })
    }

    // For now, allow plan update without payment verification (demo mode)
    // In production, this should verify payment first
    
    // Calculate plan expiry (1 year from now for paid plans)
    const planExpiresAt = plan !== "free" 
      ? new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) 
      : null

    const user = await User.findByIdAndUpdate(
      userId,
      { 
        plan,
        planExpiresAt
      },
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
        plan: user.plan,
        planExpiresAt: user.planExpiresAt
      },
      message: "Plan updated successfully"
    })
  } catch (error) {
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to update plan" }, { status: 500 })
  }
}
