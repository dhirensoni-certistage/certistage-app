import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { findEmailPack, emailPackName } from "@/lib/addons"
import { getRazorpayKeys } from "@/lib/addon-payments.server"
import { generateReceipt } from "@/lib/razorpay"
import Payment from "@/models/Payment"
import User from "@/models/User"

// POST - start buying an add-on (a pack of certificate emails): creates the Razorpay order
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const { packId } = await request.json().catch(() => ({}))
    const pack = findEmailPack(packId)
    if (!pack) return NextResponse.json({ error: "Choose an email pack" }, { status: 400 })

    const { keyId, keySecret } = await getRazorpayKeys()
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })

    const user = await User.findById(auth.userId).select("name email").lean<{ name?: string; email?: string }>()
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
      },
      body: JSON.stringify({
        amount: pack.price,
        currency: "INR",
        receipt: generateReceipt(),
        // No "plan" note: the plan webhook paths must never treat this as a plan purchase
        notes: { kind: "addon", addonId: pack.id, emails: String(pack.emails), userId: auth.userId, userEmail: user?.email || "" }
      })
    })
    if (!res.ok) {
      console.error("Razorpay add-on order failed:", await res.json().catch(() => ({})))
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 })
    }
    const order = await res.json()

    await Payment.create({
      userId: auth.userId,
      orderId: order.id,
      plan: "addon",
      kind: "addon",
      addonId: pack.id,
      addonEmails: pack.emails,
      amount: pack.price,
      currency: "INR",
      status: "pending"
    })

    return NextResponse.json({
      order: { id: order.id, amount: order.amount, currency: order.currency },
      razorpayKeyId: keyId,
      description: emailPackName(pack),
      prefill: { name: user?.name || "", email: user?.email || "" }
    })
  } catch (error) {
    console.error("Add-on order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
