import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

// Quick fix API to reset user plan to free
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    
    const user = await User.findOneAndUpdate(
      { email: email.toLowerCase() },
      { 
        plan: "free",
        pendingPlan: null,
        planStartDate: null,
        planExpiresAt: null
      },
      { new: true }
    )
    
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }
    
    return NextResponse.json({
      success: true,
      message: "Plan reset to free successfully",
      user: {
        email: user.email,
        plan: user.plan,
        pendingPlan: user.pendingPlan
      }
    })
  } catch (error) {
    console.error("Fix plan error:", error)
    return NextResponse.json({ error: "Failed to fix plan" }, { status: 500 })
  }
}
