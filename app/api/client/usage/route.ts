import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { getUserUsageStats } from "@/lib/plan-limits"
import { requireClientUser } from "@/lib/client-auth.server"

// GET - Get user's plan usage stats
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId

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
