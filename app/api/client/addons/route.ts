import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { emailQuota } from "@/lib/email-delivery"
import Payment from "@/models/Payment"
import User from "@/models/User"

// GET - emails left and past add-on purchases, for Plans > Add-ons and the "Buy emails" dialog
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const [quota, purchases, user] = await Promise.all([
      emailQuota(auth.userId),
      Payment.find({ userId: auth.userId, kind: "addon", status: "success" })
        .sort({ createdAt: -1 })
        .limit(20)
        .select("addonId addonEmails amount invoiceNumber createdAt")
        .lean(),
      User.findById(auth.userId).select("addonRequests").lean<{ addonRequests?: { addonId: string; requestedAt: Date }[] }>()
    ])
    return NextResponse.json({ quota, purchases, requests: user?.addonRequests || [] })
  } catch (error) {
    console.error("Add-ons GET error:", error)
    return NextResponse.json({ error: "Failed to load add-ons" }, { status: 500 })
  }
}
