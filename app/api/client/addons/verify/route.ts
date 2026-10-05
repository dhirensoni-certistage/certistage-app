import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { completeAddonPayment, getRazorpayKeys } from "@/lib/addon-payments.server"
import { emailQuota } from "@/lib/email-delivery"
import Payment from "@/models/Payment"

// POST - confirm an add-on payment from Razorpay Checkout and add the emails to the account
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = await request.json().catch(() => ({}))
    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return NextResponse.json({ error: "Missing payment details" }, { status: 400 })
    }

    const payment = await Payment.findOne({ orderId: razorpay_order_id, userId: auth.userId, kind: "addon" })
    if (!payment) return NextResponse.json({ error: "Order not found" }, { status: 404 })

    const { keySecret } = await getRazorpayKeys()
    if (!keySecret) return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })
    const expected = crypto.createHmac("sha256", keySecret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex")
    const valid =
      typeof razorpay_signature === "string" &&
      expected.length === razorpay_signature.length &&
      crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(razorpay_signature))
    if (!valid) {
      if (payment.status !== "success") {
        await Payment.updateOne({ _id: payment._id }, { $set: { status: "failed", failureReason: "Invalid signature", paymentId: razorpay_payment_id } })
      }
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 })
    }

    await Payment.updateOne({ _id: payment._id }, { $set: { razorpaySignature: razorpay_signature } })
    const { payment: done } = await completeAddonPayment(razorpay_order_id, razorpay_payment_id, "verify")
    const quota = await emailQuota(auth.userId)
    return NextResponse.json({
      success: true,
      emails: done?.addonEmails || payment.addonEmails || 0,
      invoiceNumber: done?.invoiceNumber || null,
      quota
    })
  } catch (error) {
    console.error("Add-on verify error:", error)
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 })
  }
}
