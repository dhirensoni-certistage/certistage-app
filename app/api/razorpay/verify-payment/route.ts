import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Payment from "@/models/Payment"
import Settings from "@/models/Settings"
import { type PlanId, PLAN_PRICES } from "@/lib/razorpay"

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json()
    const { 
      razorpay_order_id, 
      razorpay_payment_id, 
      razorpay_signature,
      plan,
      userId,
      keySecret
    } = body

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })
    }

    if (!userId || !plan) {
      return NextResponse.json({ error: "User ID and plan required" }, { status: 400 })
    }

    // Try to get secret from database first
    let razorpayKeySecret = keySecret
    
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
        amount: PLAN_PRICES[plan as PlanId] || 0,
        currency: "INR",
        status: "failed",
        razorpaySignature: razorpay_signature
      })
      
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    // Check if payment already processed (idempotency)
    const existingPayment = await Payment.findOne({ orderId: razorpay_order_id })
    if (existingPayment && existingPayment.status === "success") {
      return NextResponse.json({
        success: true,
        message: "Payment already processed",
        data: {
          orderId: existingPayment.orderId,
          paymentId: existingPayment.paymentId,
          plan: existingPayment.plan,
          status: existingPayment.status
        }
      })
    }

    // Calculate plan expiry (1 year from now)
    const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)

    // Update user's plan in database and clear pendingPlan
    const user = await User.findByIdAndUpdate(
      userId,
      {
        plan: plan,
        pendingPlan: null,
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
      await existingPayment.save()
    } else {
      await Payment.create({
        userId,
        orderId: razorpay_order_id,
        paymentId: razorpay_payment_id,
        plan,
        amount: PLAN_PRICES[plan as PlanId] || 0,
        currency: "INR",
        status: "success",
        razorpaySignature: razorpay_signature
      })
    }

    // Send payment success email
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      const paymentTemplate = emailTemplates.paymentSuccess(
        user.name, 
        plan.charAt(0).toUpperCase() + plan.slice(1), 
        PLAN_PRICES[plan as PlanId] || 0
      )
      await sendEmail({
        to: user.email,
        subject: paymentTemplate.subject,
        html: paymentTemplate.html
      })
      
      // Send admin notification
      if (process.env.ADMIN_EMAIL) {
        const adminTemplate = emailTemplates.adminNotification('payment', {
          userName: user.name,
          userEmail: user.email,
          plan: plan.charAt(0).toUpperCase() + plan.slice(1),
          amount: PLAN_PRICES[plan as PlanId] || 0,
          paymentId: razorpay_payment_id
        })
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: adminTemplate.subject,
          html: adminTemplate.html
        })
      }
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError)
      // Don't fail payment verification if email fails
    }

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
        activatedAt: new Date().toISOString(),
        expiresAt: planExpiresAt.toISOString()
      }
    })
  } catch (error) {
    console.error("Error verifying payment:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}
