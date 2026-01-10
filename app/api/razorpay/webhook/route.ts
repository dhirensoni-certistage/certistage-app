import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import Settings from "@/models/Settings"
import { PLAN_PRICES, type PlanId } from "@/lib/razorpay"

// Disable body parsing - we need raw body for signature verification
export const dynamic = "force-dynamic"

async function getWebhookSecret(): Promise<string | null> {
  // Try database first
  try {
    const setting = await Settings.findOne({ key: "payment_config" })
    if (setting?.value?.razorpay?.webhookSecret) {
      return setting.value.razorpay.webhookSecret
    }
  } catch (error) {
    console.error("Failed to get webhook secret from DB:", error)
  }
  
  // Fallback to env
  return process.env.RAZORPAY_WEBHOOK_SECRET || null
}

function verifyWebhookSignature(body: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(body)
    .digest("hex")
  
  return expectedSignature === signature
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    // Get raw body for signature verification
    const rawBody = await request.text()
    const signature = request.headers.get("x-razorpay-signature")
    
    if (!signature) {
      console.error("Webhook: Missing signature header")
      return NextResponse.json({ error: "Missing signature" }, { status: 400 })
    }
    
    const webhookSecret = await getWebhookSecret()
    
    if (!webhookSecret) {
      console.error("Webhook: Secret not configured")
      return NextResponse.json({ error: "Webhook not configured" }, { status: 500 })
    }
    
    // Verify signature
    if (!verifyWebhookSignature(rawBody, signature, webhookSecret)) {
      console.error("Webhook: Invalid signature")
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 })
    }
    
    const event = JSON.parse(rawBody)
    const eventType = event.event
    
    console.log("Webhook received:", eventType, event.payload?.payment?.entity?.id || event.payload?.order?.entity?.id)
    
    switch (eventType) {
      case "payment.captured":
        await handlePaymentCaptured(event.payload.payment.entity)
        break
        
      case "payment.failed":
        await handlePaymentFailed(event.payload.payment.entity)
        break
        
      case "order.paid":
        await handleOrderPaid(event.payload.order.entity, event.payload.payment?.entity)
        break
        
      case "refund.created":
        await handleRefundCreated(event.payload.refund.entity)
        break
        
      default:
        console.log("Webhook: Unhandled event type:", eventType)
    }
    
    return NextResponse.json({ received: true })
  } catch (error) {
    console.error("Webhook error:", error)
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 })
  }
}


async function handlePaymentCaptured(payment: any) {
  const { id: paymentId, order_id: orderId, amount, notes } = payment
  
  // Find existing payment record by order ID
  const existingPayment = await Payment.findOne({ orderId })
  
  if (existingPayment) {
    // Update existing payment
    if (existingPayment.status !== "success") {
      existingPayment.paymentId = paymentId
      existingPayment.status = "success"
      existingPayment.webhookVerified = true
      await existingPayment.save()
      
      // Update user plan if not already updated
      const user = await User.findById(existingPayment.userId)
      if (user && user.plan !== existingPayment.plan) {
        const planStartDate = new Date()
        const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
        
        user.plan = existingPayment.plan
        user.pendingPlan = null
        user.planStartDate = planStartDate
        user.planExpiresAt = planExpiresAt
        await user.save()
        
        console.log("Webhook: User plan updated via payment.captured", {
          userId: user._id,
          plan: existingPayment.plan
        })
      }
    }
  } else if (notes?.userId && notes?.plan) {
    // Create new payment record from webhook (backup if client verification failed)
    const planStartDate = new Date()
    const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    
    await Payment.create({
      userId: notes.userId,
      orderId,
      paymentId,
      plan: notes.plan,
      amount,
      currency: "INR",
      status: "success",
      webhookVerified: true
    })
    
    // Update user plan
    await User.findByIdAndUpdate(notes.userId, {
      plan: notes.plan,
      pendingPlan: null,
      planStartDate,
      planExpiresAt
    })
    
    console.log("Webhook: New payment created and user updated", {
      userId: notes.userId,
      plan: notes.plan
    })
  }
}

async function handlePaymentFailed(payment: any) {
  const { id: paymentId, order_id: orderId, error_description, notes } = payment
  
  // Update or create failed payment record
  const existingPayment = await Payment.findOne({ orderId })
  
  if (existingPayment) {
    existingPayment.paymentId = paymentId
    existingPayment.status = "failed"
    existingPayment.failureReason = error_description
    existingPayment.webhookVerified = true
    await existingPayment.save()
  } else if (notes?.userId && notes?.plan) {
    await Payment.create({
      userId: notes.userId,
      orderId,
      paymentId,
      plan: notes.plan,
      amount: payment.amount,
      currency: "INR",
      status: "failed",
      failureReason: error_description,
      webhookVerified: true
    })
  }
  
  console.log("Webhook: Payment failed", { orderId, error: error_description })
}

async function handleOrderPaid(order: any, payment?: any) {
  const { id: orderId, amount, notes } = order
  
  if (!notes?.userId || !notes?.plan) {
    console.log("Webhook: order.paid missing notes", orderId)
    return
  }
  
  // Check if already processed
  const existingPayment = await Payment.findOne({ orderId, status: "success" })
  if (existingPayment) {
    console.log("Webhook: Order already processed", orderId)
    return
  }
  
  const planStartDate = new Date()
  const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
  
  // Create or update payment
  await Payment.findOneAndUpdate(
    { orderId },
    {
      userId: notes.userId,
      orderId,
      paymentId: payment?.id || "",
      plan: notes.plan,
      amount,
      currency: "INR",
      status: "success",
      webhookVerified: true
    },
    { upsert: true }
  )
  
  // Update user
  await User.findByIdAndUpdate(notes.userId, {
    plan: notes.plan,
    pendingPlan: null,
    planStartDate,
    planExpiresAt
  })
  
  console.log("Webhook: Order paid processed", { orderId, userId: notes.userId, plan: notes.plan })
}

async function handleRefundCreated(refund: any) {
  const { payment_id: paymentId, amount, notes } = refund
  
  // Find payment by paymentId
  const payment = await Payment.findOne({ paymentId })
  
  if (payment) {
    payment.status = "refunded"
    payment.refundAmount = amount
    payment.refundedAt = new Date()
    await payment.save()
    
    // Optionally downgrade user to free plan
    if (notes?.downgradeUser === "true") {
      await User.findByIdAndUpdate(payment.userId, {
        plan: "free",
        planExpiresAt: null
      })
    }
    
    console.log("Webhook: Refund processed", { paymentId, amount })
  }
}
