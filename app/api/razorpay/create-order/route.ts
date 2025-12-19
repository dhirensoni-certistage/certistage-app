import { NextRequest, NextResponse } from "next/server"
import { PLAN_PRICES, generateReceipt, type PlanId } from "@/lib/razorpay"
import crypto from "crypto"

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { plan, userId, userEmail, userName, keyId, keySecret } = body

    if (!plan || !PLAN_PRICES[plan as PlanId]) {
      return NextResponse.json({ error: "Invalid plan selected" }, { status: 400 })
    }

    const amount = PLAN_PRICES[plan as PlanId]
    
    if (amount === 0) {
      return NextResponse.json({ error: "Free plan does not require payment" }, { status: 400 })
    }

    // Get Razorpay credentials from request or env
    const razorpayKeyId = keyId || process.env.RAZORPAY_KEY_ID
    const razorpayKeySecret = keySecret || process.env.RAZORPAY_KEY_SECRET

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
      razorpayKeyId: razorpayKeyId
    })
  } catch (error) {
    console.error("Error creating Razorpay order:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
