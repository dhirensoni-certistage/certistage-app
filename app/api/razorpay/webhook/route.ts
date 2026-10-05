import { NextRequest, NextResponse } from "next/server"
import { planExpiresAtFor } from "@/lib/plan-config.server"
import { completeAddonPayment } from "@/lib/addon-payments.server"
import { sendPlanPaymentEmails } from "@/lib/plan-payment-emails.server"
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


function generateInvoiceNumber(): string {
  const now = new Date()
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
  const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
  return `INV-${dateStr}-${randomStr}`
}

async function handlePaymentCaptured(payment: any) {
  const { id: paymentId, order_id: orderId, amount, notes } = payment
  
  // Find existing payment record by order ID
  const existingPayment = await Payment.findOne({ orderId })
  const now = new Date()

  // Add-on purchases (lib/addons) add emails and never touch the plan
  if (existingPayment?.kind === "addon" || (!existingPayment && notes?.kind === "addon")) {
    if (!existingPayment) await createAddonPaymentFromNotes(orderId, paymentId, amount, notes, "pending")
    await completeAddonPayment(orderId, paymentId, "webhook")
    return
  }
  
  if (existingPayment) {
    // Update existing payment
    if (existingPayment.status !== "success") {
      existingPayment.paymentId = paymentId
      existingPayment.status = "success"
      existingPayment.webhookVerified = true
      existingPayment.invoiceNumber = existingPayment.invoiceNumber || generateInvoiceNumber()
      existingPayment.invoiceIssuedAt = existingPayment.invoiceIssuedAt || now
      existingPayment.invoiceBaseAmount = amount
      existingPayment.invoiceGatewayFee = 0
      await existingPayment.save()
      
      // Update user plan if not already updated
      const user = await User.findById(existingPayment.userId)
      if (user && user.plan !== existingPayment.plan) {
        const planStartDate = new Date()
        const planExpiresAt = await planExpiresAtFor(existingPayment.plan, planStartDate)
        
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
    await sendPlanPaymentEmails(orderId)
  } else if (notes?.userId && notes?.plan) {
    // Create new payment record from webhook (backup if client verification failed)
    const planStartDate = new Date()
    const planExpiresAt = await planExpiresAtFor(notes.plan, planStartDate)
    
    await Payment.create({
      userId: notes.userId,
      orderId,
      paymentId,
      plan: notes.plan,
      amount,
      currency: "INR",
      status: "success",
      webhookVerified: true,
      invoiceNumber: generateInvoiceNumber(),
      invoiceIssuedAt: now,
      invoiceBaseAmount: amount,
      invoiceGatewayFee: 0
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
    await sendPlanPaymentEmails(orderId)
  }
}

async function handlePaymentFailed(payment: any) {
  const { id: paymentId, order_id: orderId, error_description, notes } = payment
  
  // Update or create failed payment record
  const existingPayment = await Payment.findOne({ orderId })
  if (!existingPayment && notes?.kind === "addon") {
    await createAddonPaymentFromNotes(orderId, paymentId, payment.amount, notes, "failed", error_description)
    return
  }
  
  if (existingPayment) {
    // A late failure event must not undo an add-on that was already paid
    if (existingPayment.kind === "addon" && existingPayment.status === "success") return
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

  if (notes?.kind === "addon" || (await Payment.exists({ orderId, kind: "addon" }))) {
    if (!(await Payment.exists({ orderId }))) await createAddonPaymentFromNotes(orderId, payment?.id, amount, notes, "pending")
    await completeAddonPayment(orderId, payment?.id, "webhook")
    return
  }
  
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
  
  const now = new Date()
  const planStartDate = now
  const planExpiresAt = await planExpiresAtFor(notes.plan, now)
  
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
      webhookVerified: true,
      invoiceNumber: generateInvoiceNumber(),
      invoiceIssuedAt: now,
      invoiceBaseAmount: amount,
      invoiceGatewayFee: 0
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
  await sendPlanPaymentEmails(orderId)
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

/** Backup record for an add-on order the browser never reported (lib/addons) */
async function createAddonPaymentFromNotes(orderId: string, paymentId: string | undefined, amount: number, notes: any, status: "pending" | "failed", failureReason?: string) {
  if (!notes?.userId) return
  await Payment.create({
    userId: notes.userId,
    orderId,
    paymentId,
    plan: "addon",
    kind: "addon",
    addonId: notes.addonId,
    addonEmails: Number(notes.emails) || 0,
    amount,
    currency: "INR",
    status,
    webhookVerified: true,
    ...(failureReason ? { failureReason } : {})
  })
}
