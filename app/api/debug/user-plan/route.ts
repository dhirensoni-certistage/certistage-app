import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const email = searchParams.get("email")
    
    if (!email) {
      return NextResponse.json({ error: "Email required" }, { status: 400 })
    }
    
    const user = await User.findOne({ email: email.toLowerCase() })
    
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
        pendingPlan: user.pendingPlan,
        planStartDate: user.planStartDate,
        planExpiresAt: user.planExpiresAt,
        createdAt: user.createdAt
      }
    })
  } catch (error) {
    console.error("Debug user plan error:", error)
    return NextResponse.json({ error: "Failed to fetch user" }, { status: 500 })
  }
}
