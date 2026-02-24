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

    const now = new Date()
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')
    const randomStr = Math.random().toString(36).substring(2, 7).toUpperCase()
    const generatedInvoiceNumber = `INV-${dateStr}-${randomStr}`
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://certistage.com"

    // Check if payment already processed (idempotency)
    const existingPayment = await Payment.findOne({ orderId: razorpay_order_id })
    if (existingPayment && existingPayment.status === "success") {
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

    // Calculate plan expiry (1 year from now)
    const planStartDate = now
    const planExpiresAt = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    const amount = PLAN_PRICES[plan as PlanId] || 0
    const gatewayFeePercent = 2
    const baseAmount = Math.round(amount / (1 + gatewayFeePercent / 100))
    const gatewayFee = amount - baseAmount

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

    // Create admin notification in database
    try {
      const Notification = (await import('@/models/Notification')).default
      const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1)
      
      await Notification.create({
        type: "payment",
        title: "Payment Received",
        description: `${user.name} upgraded to ${planDisplayName} - ₹${Math.round(amount / 100)}`,
        userId: user._id,
        metadata: {
          userName: user.name,
          userEmail: user.email,
          plan: planDisplayName,
          amount: amount,
          paymentId: razorpay_payment_id
        },
        read: false
      })
    } catch (notifError) {
      console.error('Failed to create notification:', notifError)
    }

    // Send invoice email to customer
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      const planDisplayName = plan.charAt(0).toUpperCase() + plan.slice(1)
      const adminCCEmail = process.env.ADMIN_CC_EMAIL

      // Optional PDF download URL template (set in env):
      // INVOICE_PDF_URL_TEMPLATE=https://certistage.com/api/invoices/{invoiceNumber}/pdf
      // Supported placeholders: {invoiceNumber}, {paymentId}, {userId}
      const invoiceUrlTemplate = process.env.INVOICE_PDF_URL_TEMPLATE
      const invoiceUrl = invoiceUrlTemplate
        ? invoiceUrlTemplate
            .replace('{invoiceNumber}', encodeURIComponent(invoiceNumber))
            .replace('{paymentId}', encodeURIComponent(razorpay_payment_id))
            .replace('{userId}', encodeURIComponent(String(userId)))
        : defaultInvoiceUrl
      
      // Send professional invoice email with CC
      const invoiceTemplate = emailTemplates.invoice({
        invoiceNumber,
        customerName: user.name,
        customerEmail: user.email,
        customerPhone: user.phone,
        customerOrganization: user.organization,
        planName: planDisplayName,
        amount: baseAmount,
        gatewayFee: gatewayFee,
        totalAmount: amount,
        paymentId: razorpay_payment_id,
        paymentDate: now,
        validUntil: planExpiresAt,
        invoiceUrl
      })
      
      await sendEmail({
        to: user.email,
        subject: invoiceTemplate.subject,
        html: invoiceTemplate.html,
        cc: adminCCEmail, // Add CC
        template: "invoice",
        metadata: {
          userId: userId,
          userName: user.name,
          type: "payment_invoice",
          plan: planDisplayName,
          amount: amount,
          paymentId: razorpay_payment_id
        }
      })
      
      // Send admin notification with CC
      if (process.env.ADMIN_EMAIL) {
        const adminTemplate = emailTemplates.adminNotification('payment', {
          userName: user.name,
          userEmail: user.email,
          plan: planDisplayName,
          amount: amount,
          paymentId: razorpay_payment_id
        })
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          cc: adminCCEmail, // Add CC
          template: "adminNotification",
          metadata: {
            userId: userId,
            userName: user.name,
            type: "payment_notification",
            plan: planDisplayName,
            amount: amount
          }
        })
      }
    } catch (emailError) {
      console.error('Failed to send invoice email:', emailError)
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

