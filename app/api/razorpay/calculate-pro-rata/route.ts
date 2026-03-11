import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES_MAP } from "@/lib/razorpay"
import { calculateProRataUpgrade } from "@/lib/pro-rata"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, userId } = body

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (plan === "test" && process.env.ENABLE_TEST_PLAN !== "true") {
      return NextResponse.json({ error: "Test plan is disabled" }, { status: 400 })
    }

    if (!userId) {
      return NextResponse.json({ error: "User ID required" }, { status: 400 })
    }

    await connectDB()

    const planConfig = await getPlanConfigFromDb()
    const planMap = getPlanMap(planConfig)
    const selectedPlan = planMap[plan]
    const fallbackAmount = PLAN_PRICES_MAP[plan]
    const amount = selectedPlan?.price ?? fallbackAmount

    if (!amount && amount !== 0) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (selectedPlan && selectedPlan.enabled === false) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 })
    }
    
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Calculate pro-rata pricing
    const priceMap = Object.fromEntries(planConfig.map(p => [p.id, p.price]))
    const proRata = calculateProRataUpgrade(
      user.plan,
      plan,
      user.planStartDate,
      user.planExpiresAt,
      priceMap
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
