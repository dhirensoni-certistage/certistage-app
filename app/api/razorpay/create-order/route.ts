import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES, generateReceipt, type PlanId } from "@/lib/razorpay"
import { calculateProRataUpgrade } from "@/lib/pro-rata"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import User from "@/models/User"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, userId, userEmail, userName, keyId, keySecret } = body

    if (!plan || !PLAN_PRICES[plan as PlanId]) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    let amount = PLAN_PRICES[plan as PlanId]
    let proRataDetails = null
    
    if (amount === 0) {
      return NextResponse.json({ error: "Free plan does not require payment" }, { status: 400 })
    }

    // Calculate pro-rata pricing if user is upgrading from a paid plan
    await connectDB()
    
    if (userId) {
      const user = await User.findById(userId)
      if (user && user.plan !== "free" && user.planStartDate && user.planExpiresAt) {
        const proRata = calculateProRataUpgrade(
          user.plan as PlanId,
          plan as PlanId,
          user.planStartDate,
          user.planExpiresAt
        )
        
        if (proRata.unusedCredit > 0) {
          amount = proRata.finalAmount
          proRataDetails = {
            originalPrice: proRata.originalPrice,
            unusedCredit: proRata.unusedCredit,
            finalAmount: proRata.finalAmount,
            daysRemaining: proRata.daysRemaining,
            savings: proRata.savings,
            savingsPercent: proRata.savingsPercent
          }
        }
      }
    }

    // Try to get credentials from database first
    let razorpayKeyId = keyId
    let razorpayKeySecret = keySecret
    
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
        userName: userName || ""
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
