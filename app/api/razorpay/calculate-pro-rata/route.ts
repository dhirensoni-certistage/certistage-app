import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES, type PlanId } from "@/lib/razorpay"
import { calculateProRataUpgrade } from "@/lib/pro-rata"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, userId } = body

    if (!plan || !PLAN_PRICES[plan as PlanId]) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    await connectDB()
    
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate pro-rata pricing
    const proRata = calculateProRataUpgrade(
      user.plan as PlanId,
      plan as PlanId,
      user.planStartDate,
      user.planExpiresAt
    )

    return NextResponse.json({
      success: true,
      proRata: {
        originalPrice: proRata.originalPrice,
        unusedCredit: proRata.unusedCredit,
        finalAmount: proRata.finalAmount,
        daysRemaining: proRata.daysRemaining,
        savings: proRata.savings,
        savingsPercent: proRata.savingsPercent
      }
    })
  } catch (error) {
    console.error("Error calculating pro-rata:", error)
    return NextResponse.json({ error: "Failed to calculate pricing" }, { status: 500 })
  }
}
