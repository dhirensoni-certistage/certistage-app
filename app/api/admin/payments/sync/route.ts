import { NextRequest, NextResponse } from "next/server"
import { planExpiresAtFor } from "@/lib/plan-config.server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"
import User from "@/models/User"
import { completeAddonPayment, getRazorpayKeys } from "@/lib/addon-payments.server"
import { matchingCapturedPayment, ReconciliationReviewError } from "@/lib/payment-reconciliation"

// Helper to make Razorpay API calls
async function razorpayFetch(endpoint: string) {
  const { keyId, keySecret } = await getRazorpayKeys()

  if (!keyId || !keySecret) {
    throw new Error("Razorpay credentials not configured")
  }

  const response = await fetch(`https://api.razorpay.com/v1${endpoint}`, {
    headers: {
      "Authorization": `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
    },
    signal: AbortSignal.timeout(15000),
  })

  if (!response.ok) {
    throw new Error(`Razorpay API error: ${response.status}`)
  }

  return response.json()
}

// Plan validity comes from Admin > Plans (365 days for annual plans, 60 for the one-event plan)

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json().catch(() => null)
    const paymentId = body && typeof body === "object" ? body.paymentId : undefined

    if (typeof paymentId !== "string" || !/^[a-f0-9]{24}$/i.test(paymentId)) {
      return NextResponse.json({ error: "Payment ID is required" }, { status: 400 })
    }

    // Find the payment
    const payment = await Payment.findById(paymentId)
    if (!payment) {
      return NextResponse.json({ error: "Payment not found" }, { status: 404 })
    }

    // If already successful, no need to sync
    if (payment.status === "success" || payment.status === "refunded") {
      return NextResponse.json({ 
        message: "Payment already reconciled", 
        status: payment.status,
        synced: false 
      })
    }

    if (!/^order_[A-Za-z0-9]+$/.test(payment.orderId)) {
      return NextResponse.json({ error: "This payment has no Razorpay order to reconcile" }, { status: 400 })
    }
    const keys = await getRazorpayKeys()
    if (!keys.keyId || !keys.keySecret) return NextResponse.json({ error: "Connect Razorpay in Settings to enable reconciliation" }, { status: 503 })

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
      const successfulPayment = matchingCapturedPayment(paymentsData.items || [], { orderId: payment.orderId, amount: payment.amount, currency: payment.currency || "INR" })

      // Add-on purchases add emails and never change the plan
      if (payment.kind === "addon") {
        const completed = await completeAddonPayment(payment.orderId, successfulPayment.id, "sync")
        if (!completed.payment) return NextResponse.json({ message: "Payment changed during reconciliation. Refresh to view its status.", synced: false })
        return NextResponse.json({ message: "Add-on payment synced", status: "success", synced: true, plan: "addon" })
      }

      // Update payment record
      const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: { $in: ["pending", "failed"] } }, { $set: { status: "success", paymentId: successfulPayment.id } }, { new: true })
      if (!claimed) return NextResponse.json({ message: "Payment changed during reconciliation. Refresh to view its status.", synced: false })

      // Update user plan
      const user = await User.findById(payment.userId)
      const latestPaidPlan = await Payment.findOne({ userId: payment.userId, status: "success", kind: { $ne: "addon" } }).sort({ createdAt: -1, _id: -1 })
      if (user && String(latestPaidPlan?._id) === String(payment._id)) {
        const paidAt = successfulPayment.created_at ? new Date(successfulPayment.created_at * 1000) : payment.createdAt
        user.plan = payment.plan
        user.planStartDate = paidAt
        user.planExpiresAt = await planExpiresAtFor(payment.plan, paidAt)
        await user.save()
      }

      return NextResponse.json({
        message: "Payment synced successfully",
        status: "success",
        synced: true,
        plan: payment.plan,
        userName: user?.name
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
    if (error instanceof ReconciliationReviewError) return NextResponse.json({ error: error.message }, { status: 409 })
    return NextResponse.json({ error: "Failed to sync payment" }, { status: 500 })
  }
}

// Bulk sync all pending payments
export async function PUT(request: NextRequest) {
  try {
    await connectDB()

    const keys = await getRazorpayKeys()
    if (!keys.keyId || !keys.keySecret) return NextResponse.json({ error: "Connect Razorpay in Settings to enable reconciliation" }, { status: 503 })

    // Find all pending payments
    const pendingPayments = await Payment.find({ status: "pending", orderId: { $regex: "^order_[A-Za-z0-9]+$" } }).sort({ createdAt: 1 }).limit(50)
    
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
          const successfulPayment = matchingCapturedPayment(paymentsData.items || [], { orderId: payment.orderId, amount: payment.amount, currency: payment.currency || "INR" })

          if (payment.kind === "addon") {
            const completed = await completeAddonPayment(payment.orderId, successfulPayment.id, "sync")
            if (!completed.payment) { results.errors++; continue }
            results.success++
            results.synced++
            continue
          }

          const claimed = await Payment.findOneAndUpdate({ _id: payment._id, status: "pending" }, { $set: { status: "success", paymentId: successfulPayment.id } }, { new: true })
          if (!claimed) { results.stillPending++; continue }

          // Update user plan
          const user = await User.findById(payment.userId)
          const latestPaidPlan = await Payment.findOne({ userId: payment.userId, status: "success", kind: { $ne: "addon" } }).sort({ createdAt: -1, _id: -1 })
          if (user && String(latestPaidPlan?._id) === String(payment._id)) {
            const paidAt = successfulPayment.created_at ? new Date(successfulPayment.created_at * 1000) : payment.createdAt
            user.plan = payment.plan
            user.planStartDate = paidAt
            user.planExpiresAt = await planExpiresAtFor(payment.plan, paidAt)
            await user.save()
          }

          results.success++
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
