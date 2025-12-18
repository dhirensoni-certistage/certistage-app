import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"
import User from "@/models/User"

// Helper to make Razorpay API calls
async function razorpayFetch(endpoint: string) {
  const keyId = process.env.RAZORPAY_KEY_ID
  const keySecret = process.env.RAZORPAY_KEY_SECRET

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured")
  }

  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    headers: {
      "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
    }
  })

  if (!response.ok) {
    throw new Error(`Razorpay API error: ${response.status}`)
  }

  return response.json()
}

// Plan durations in days
const PLAN_DURATIONS: Record<string, number> = {
  professional: 365,
  enterprise: 365,
  premium: 365
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { paymentId } = await request.json()

    if (!paymentId) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Find the payment
    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // If already successful, no need to sync
    if (payment.status === "success") {
      return NextResponse.json({ 
        message: "Payment already successful", 
        status: "success",
        synced: false 
      })
    }

    // Fetch payment status from Razorpay using order ID
    let razorpayOrder
    try {
      razorpayOrder = await razorpayFetch(`/orders/${payment.orderId}`)
    } catch (err) {
      console.error("Razorpay fetch error:", err)
      return NextResponse.json({ 
        error: "Failed to fetch payment from Razorpay",
        details: "Order not found or API error"
      }, { status: 400 })
    }

    // Check if order is paid
    if (razorpayOrder.status === "paid") {
      // Get payment details from order
      const paymentsData = await razorpayFetch(`/orders/${payment.orderId}/payments`)
      const successfulPayment = paymentsData.items?.find((p: any) => p.status === "captured")

      // Update payment record
      payment.status = "success"
      if (successfulPayment) {
        payment.paymentId = successfulPayment.id
      }
      await payment.save()

      // Update user plan
      const user = await User.findById(payment.userId)
      if (user) {
        user.plan = payment.plan
        user.planExpiresAt = new Date(Date.now() + PLAN_DURATIONS[payment.plan] * 24 * 60 * 60 * 1000)
        await user.save()
      }

      return NextResponse.json({
        message: "Payment synced successfully",
        status: "success",
        synced: true,
        plan: payment.plan,
        userName: user?.name
      })
    } else if (razorpayOrder.status === "attempted") {
      // Payment was attempted but failed
      payment.status = "failed"
      await payment.save()

      return NextResponse.json({
        message: "Payment was attempted but failed",
        status: "failed",
        synced: true
      })
    } else {
      // Still pending
      return NextResponse.json({
        message: "Payment is still pending",
        status: "pending",
        synced: false,
        razorpayStatus: razorpayOrder.status
      })
    }
  } catch (error) {
    console.error("Payment sync error:", error)
    return NextResponse.json({ error: "Failed to sync payment" }, { status: 500 })
  }
}

// Bulk sync all pending payments
export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    // Find all pending payments
    const pendingPayments = await Payment.find({ status: "pending" })
    
    const results = {
      total: pendingPayments.length,
      synced: 0,
      success: 0,
      failed: 0,
      stillPending: 0,
      errors: 0
    }

    for (const payment of pendingPayments) {
      try {
        const razorpayOrder = await razorpayFetch(`/orders/${payment.orderId}`)

        if (razorpayOrder.status === "paid") {
          const paymentsData = await razorpayFetch(`/orders/${payment.orderId}/payments`)
          const successfulPayment = paymentsData.items?.find((p: any) => p.status === "captured")

          payment.status = "success"
          if (successfulPayment) {
            payment.paymentId = successfulPayment.id
          }
          await payment.save()

          // Update user plan
          const user = await User.findById(payment.userId)
          if (user) {
            user.plan = payment.plan
            user.planExpiresAt = new Date(Date.now() + PLAN_DURATIONS[payment.plan] * 24 * 60 * 60 * 1000)
            await user.save()
          }

          results.success++
          results.synced++
        } else if (razorpayOrder.status === "attempted") {
          payment.status = "failed"
          await payment.save()
          results.failed++
          results.synced++
        } else {
          results.stillPending++
        }
      } catch (err) {
        console.error(`Error syncing payment ${payment._id}:`, err)
        results.errors++
      }
    }

    return NextResponse.json({
      message: "Bulk sync completed",
      results
    })
  } catch (error) {
    console.error("Bulk sync error:", error)
    return NextResponse.json({ error: "Failed to bulk sync payments" }, { status: 500 })
  }
}
