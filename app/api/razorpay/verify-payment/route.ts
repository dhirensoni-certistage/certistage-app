import { NextRequest, NextResponse } from "next/server"
import { sendPlanPaymentEmails } from "@/lib/plan-payment-emails.server"
import crypto from "crypto"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import Settings from "@/models/Settings"
import { type PlanId, PLAN_PRICES_MAP } from "@/lib/razorpay"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { planExpiryFrom } from "@/lib/plan-config"
import { requireClientUser } from "@/lib/client-auth.server"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const userId = auth.userId
    const body = await request.json()
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })
    }

    if (!plan) {
      return NextResponse.json({ error: "Plan required" }, { status: 400 })
    }
    if (plan === "test" && process.env.ENABLE_TEST_PLAN !== "true") {
      return NextResponse.json({ error: "Test plan is disabled" }, { status: 400 })
    }

    // The signing secret comes only from server-side config, never from the request
    let razorpayKeySecret: string | undefined
    
    if (!razorpayKeySecret) {
      try {
        const setting = await Settings.findOne({ key: "payment_config" })
        if (setting?.value?.razorpay?.keySecret) {
          razorpayKeySecret = setting.value.razorpay.keySecret
        }
      } catch (dbError) {
        console.error("Failed to get payment config from DB:", dbError)
      }
    }
    
    // Fallback to env
    razorpayKeySecret = razorpayKeySecret || process.env.RAZORPAY_KEY_SECRET

    if (!razorpayKeySecret) {
      return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    }

    // An add-on order is confirmed by /api/client/addons/verify and never activates a plan
    if (await Payment.exists({ orderId: razorpay_order_id, kind: "addon" })) {
      return NextResponse.json({ error: "This payment is not for a plan" }, { status: 400 })
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", razorpayKeySecret)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex")

    if (expectedSignature !== razorpay_signature) {
      console.error("Signature mismatch:", { expected: expectedSignature, received: razorpay_signature })
      
      // Save failed payment record
      await Payment.create({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan,
        amount: PLAN_PRICES_MAP[plan] || 0,
        currency: "INR",
        status: "failed",
        razorpaySignature: razorpay_signature
      })
      
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    // The plan comes from the order we created, not from the browser: the order's notes and
    // amount must match the plan being activated
    const { getRazorpayKeys } = await import("@/lib/addon-payments.server")
    const { keyId } = await getRazorpayKeys()
    if (keyId) {
      const orderRes = await fetch(`https://api.razorpay.com/v1/orders/${encodeURIComponent(razorpay_order_id)}`, {
        headers: { Authorization: `Basic ${Buffer.from(`${keyId}:${razorpayKeySecret}`).toString("base64")}` }
      })
      if (!orderRes.ok) {
        return NextResponse.json({ error: "Could not confirm the payment with Razorpay. Please try again in a minute." }, { status: 502 })
      }
      const order = await orderRes.json()
      if (order?.notes?.kind === "addon" || (order?.notes?.plan && order.notes.plan !== plan) || (order?.notes?.userId && order.notes.userId !== userId)) {
        return NextResponse.json({ error: "This payment does not match the selected plan" }, { status: 400 })
      }
    }

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
    const generatedInvoiceNumber = `INV-${dateStr}-${randomStr}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://certistage.com"

    // Check if payment already processed (idempotency)
    const existingPayment = await Payment.findOne({ orderId: razorpay_order_id })
    if (existingPayment && existingPayment.status === "success") {
      // The webhook may have activated the plan first; make sure the receipt still goes out
      await sendPlanPaymentEmails(razorpay_order_id)
      const existingInvoiceNumber = existingPayment.invoiceNumber
      const existingInvoiceUrl = existingInvoiceNumber
        ? `${appUrl}/api/invoices/${encodeURIComponent(existingInvoiceNumber)}/pdf`
        : undefined

      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        data: {
          orderId: existingPayment.orderId,
          paymentId: existingPayment.paymentId,
          plan: existingPayment.plan,
          status: existingPayment.status,
          invoiceNumber: existingInvoiceNumber,
          invoiceUrl: existingInvoiceUrl
        }
      })
    }

    // Plan expiry: 1 year for annual plans, 60 days for the one-event plan (lib/plan-config)
    const planStartDate = now
    const planConfig = await getPlanConfigFromDb()
    const planMap = getPlanMap(planConfig)
    const planExpiresAt = planExpiryFrom(planMap[plan], now)
    const amount = planMap[plan]?.price ?? PLAN_PRICES_MAP[plan] ?? 0
    const baseAmount = amount
    const gatewayFee = 0

    // Update user's plan in database and clear pendingPlan
    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan: plan,
        pendingPlan: null,
        planStartDate: planStartDate,
        planExpiresAt: planExpiresAt
      },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Save/Update payment record
    if (existingPayment) {
      existingPayment.paymentId = razorpay_payment_id
      existingPayment.status = "success"
      existingPayment.razorpaySignature = razorpay_signature
      existingPayment.invoiceNumber = existingPayment.invoiceNumber || generatedInvoiceNumber
      existingPayment.invoiceIssuedAt = existingPayment.invoiceIssuedAt || now
      existingPayment.invoiceBaseAmount = baseAmount
      existingPayment.invoiceGatewayFee = gatewayFee
      existingPayment.amount = amount
      await existingPayment.save()
    } else {
      await Payment.create({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan,
        amount,
        currency: "INR",
        status: "success",
        razorpaySignature: razorpay_signature,
        invoiceNumber: generatedInvoiceNumber,
        invoiceIssuedAt: now,
        invoiceBaseAmount: baseAmount,
        invoiceGatewayFee: gatewayFee
      })
    }

    const paymentRecord = await Payment.findOne({ orderId: razorpay_order_id })
    const invoiceNumber = paymentRecord?.invoiceNumber || generatedInvoiceNumber
    const defaultInvoiceUrl = `${appUrl}/api/invoices/${encodeURIComponent(invoiceNumber)}/pdf`

    // Receipt, admin email and notification (sent once, even if the webhook got here first)
    await sendPlanPaymentEmails(razorpay_order_id)

    console.log("Payment verified and user plan updated:", {
      userId,
      plan,
      planExpiresAt,
      orderId: razorpay_order_id
    })

    return NextResponse.json({
      success: true,
      message: "Payment verified and plan activated successfully",
      data: {
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan,
        userId,
        status: "success",
        invoiceNumber,
        invoiceUrl: defaultInvoiceUrl,
        activatedAt: new Date().toISOString(),
        expiresAt: planExpiresAt.toISOString()
      }
    })
  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}

