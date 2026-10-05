import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES_MAP, generateReceipt } from "@/lib/razorpay"
import { planCreditFor } from "@/lib/plan-credit.server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { requireClientUser } from "@/lib/client-auth.server"

export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { plan, userEmail, userName } = body

    if (!plan) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (plan === "test" && process.env.ENABLE_TEST_PLAN !== "true") {
      return NextResponse.json({ error: "Test plan is disabled" }, { status: 400 })
    }

    const planConfig = await getPlanConfigFromDb()
    const planMap = getPlanMap(planConfig)
    const selectedPlan = planMap[plan]
    const fallbackAmount = PLAN_PRICES_MAP[plan]
    let amount = selectedPlan?.price ?? fallbackAmount

    if (!amount && amount !== 0) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }
    if (selectedPlan && selectedPlan.enabled === false) {
      return NextResponse.json({ error: "Plan is not available" }, { status: 400 })
    }
    let proRataDetails = null
    
    if (amount === 0) {
      return NextResponse.json({ error: "Free plan does not require payment" }, { status: 400 })
    }

    // Credit for the unused part of the current plan, or for a one-event plan bought recently
    // (lib/plan-credit.server). The credited amount and its source travel in the order notes so
    // every activation path records the same receipt.
    await connectDB()
    const fullPrice = amount
    let credit: Awaited<ReturnType<typeof planCreditFor>> = null
    if (userId && selectedPlan) {
      const priceMap = Object.fromEntries(planConfig.map(p => [p.id, p.price]))
      credit = await planCreditFor(userId, selectedPlan, priceMap)
      if (credit && credit.amount > 0) {
        amount = Math.max(0, fullPrice - credit.amount)
        proRataDetails = {
          originalPrice: fullPrice,
          unusedCredit: credit.amount,
          finalAmount: amount,
          daysRemaining: credit.daysRemaining || 0,
          savings: credit.amount,
          savingsPercent: fullPrice > 0 ? Math.round((credit.amount / fullPrice) * 100) : 0,
          label: credit.label
        }
      }
    }
    if (amount < 100) {
      // Razorpay needs at least ₹1; a credit that covers the whole price leaves a token amount
      amount = 100
    }

    // Try to get credentials from database first
    // Gateway keys come only from server-side config, never from the request
    let razorpayKeyId: string | undefined
    let razorpayKeySecret: string | undefined
    
    if (!razorpayKeyId || !razorpayKeySecret) {
      try {
        await connectDB()
        const setting = await Settings.findOne({ key: "payment_config" })
        if (setting?.value?.razorpay) {
          razorpayKeyId = razorpayKeyId || setting.value.razorpay.keyId
          razorpayKeySecret = razorpayKeySecret || setting.value.razorpay.keySecret
        }
      } catch (dbError) {
        console.error("Failed to get payment config from DB:", dbError)
      }
    }
    
    // Fallback to env variables
    razorpayKeyId = razorpayKeyId || process.env.RAZORPAY_KEY_ID
    razorpayKeySecret = razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeyId || !razorpayKeySecret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    const receipt = generateReceipt()

    // Create order using Razorpay API
    const orderData = {
      amount,
      currency: "INR",
      receipt,
      notes: {
        plan,
        userId: userId || "",
        userEmail: userEmail || "",
        userName: userName || "",
        fullPrice: String(fullPrice),
        ...(credit && credit.amount > 0 ? { credit: String(credit.amount), creditLabel: credit.label, creditPaymentId: credit.sourcePaymentId || "" } : {})
      }
    }

    const response = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Basic ${Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64")}`
      },
      body: JSON.stringify(orderData)
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error("Razorpay order creation failed:", errorData)
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 })
    }

    const order = await response.json()

    return NextResponse.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
        receipt: order.receipt
      },
      razorpayKeyId: razorpayKeyId,
      proRata: proRataDetails
    })
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
