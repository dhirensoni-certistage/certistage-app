import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES_MAP } from "@/lib/razorpay"
import { planCreditFor } from "@/lib/plan-credit.server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { requireClientUser } from "@/lib/client-auth.server"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { plan } = body

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (plan === "test" && process.env.ENABLE_TEST_PLAN !== "true") {
      return NextResponse.json({ error: "Test plan is disabled" }, { status: 400 })
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
    
    const user = await User.findById(userId).select("_id")
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // The same credit create-order will apply (unused days, or a recent one-event plan)
    const priceMap = Object.fromEntries(planConfig.map(p => [p.id, p.price]))
    const credit = selectedPlan ? await planCreditFor(userId, selectedPlan, priceMap) : null
    const unusedCredit = credit?.amount || 0
    const finalAmount = Math.max(0, amount - unusedCredit)

    return NextResponse.json({
      success: true,
      proRata: {
        originalPrice: amount,
        unusedCredit,
        finalAmount,
        daysRemaining: credit?.daysRemaining || 0,
        savings: unusedCredit,
        savingsPercent: amount > 0 ? Math.round((unusedCredit / amount) * 100) : 0,
        label: credit?.label || null
      }
    })
  } catch (error) {
    console.error("Error calculating pro-rata:", error)
    return NextResponse.json({ error: "Failed to calculate pricing" }, { status: 500 })
  }
}
