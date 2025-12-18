import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { getUserUsageStats } from "@/lib/plan-limits"

// GET - Get user's plan usage stats
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const userId = searchParams.get("userId")
    
    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    const usage = await getUserUsageStats(userId)

    return NextResponse.json({
      success: true,
      ...usage
    })
  } catch (error) {
    console.error("Usage GET error:", error)
    return NextResponse.json({ error: "Failed to fetch usage stats" }, { status: 500 })
  }
}
