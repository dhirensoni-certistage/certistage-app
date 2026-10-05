import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { findEmailPack, emailPackName, parseCustomEmails, customEmailPrice, CUSTOM_EMAILS, findCertPack, certPackName } from "@/lib/addons"
import { getRazorpayKeys } from "@/lib/addon-payments.server"
import { generateReceipt } from "@/lib/razorpay"
import Payment from "@/models/Payment"
import User from "@/models/User"

// POST - start buying an add-on (a pack of certificate emails, or of extra certificates): creates the Razorpay order
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const { packId, emails: customEmails } = await request.json().catch(() => ({}))

    const certPack = findCertPack(packId)
    if (certPack) return createOrder(auth.userId, { id: certPack.id, price: certPack.price, description: certPackName(certPack), notes: { certificates: String(certPack.certificates) }, record: { addonCertificates: certPack.certificates } })

    // A listed pack, or any quantity priced by volume (lib/addons); the price is always computed here
    let pack = findEmailPack(packId)
    if (!pack && customEmails !== undefined) {
      const emails = parseCustomEmails(customEmails)
      if (!emails) {
        return NextResponse.json({
          error: `Enter ${CUSTOM_EMAILS.min.toLocaleString("en-IN")} to ${CUSTOM_EMAILS.max.toLocaleString("en-IN")} emails, in steps of ${CUSTOM_EMAILS.step}`
        }, { status: 400 })
      }
      pack = { id: "emails_custom", emails, price: customEmailPrice(emails) }
    }
    if (!pack) return NextResponse.json({ error: "Choose a pack" }, { status: 400 })
    return createOrder(auth.userId, { id: pack.id, price: pack.price, description: emailPackName(pack), notes: { emails: String(pack.emails) }, record: { addonEmails: pack.emails } })
  } catch (error) {
    console.error("Add-on order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}

async function createOrder(
  userId: string,
  item: { id: string; price: number; description: string; notes: Record<string, string>; record: { addonEmails?: number; addonCertificates?: number } }
) {
  try {
    const { keyId, keySecret } = await getRazorpayKeys()
    if (!keyId || !keySecret) return NextResponse.json({ error: "Payment gateway not configured" }, { status: 500 })

    const user = await User.findById(userId).select("name email").lean<{ name?: string; email?: string }>()
    const res = await fetch("https://api.razorpay.com/v1/orders", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Basic ${Buffer.from(`${keyId}:${keySecret}`).toString("base64")}`
      },
      body: JSON.stringify({
        amount: item.price,
        currency: "INR",
        receipt: generateReceipt(),
        // No "plan" note: the plan webhook paths must never treat this as a plan purchase
        notes: { kind: "addon", addonId: item.id, ...item.notes, userId, userEmail: user?.email || "" }
      })
    })
    if (!res.ok) {
      console.error("Razorpay add-on order failed:", await res.json().catch(() => ({})))
      return NextResponse.json({ error: "Failed to create payment order" }, { status: 500 })
    }
    const order = await res.json()

    await Payment.create({
      userId,
      orderId: order.id,
      plan: "addon",
      kind: "addon",
      addonId: item.id,
      ...item.record,
      amount: item.price,
      currency: "INR",
      status: "pending"
    })

    return NextResponse.json({
      order: { id: order.id, amount: order.amount, currency: order.currency },
      razorpayKeyId: keyId,
      description: item.description,
      prefill: { name: user?.name || "", email: user?.email || "" }
    })
  } catch (error) {
    console.error("Add-on order error:", error)
    return NextResponse.json({ error: "Failed to create order" }, { status: 500 })
  }
}
