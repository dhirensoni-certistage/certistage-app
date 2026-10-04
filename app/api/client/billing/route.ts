import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { requireClientUser } from "@/lib/client-auth.server"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import Payment from "@/models/Payment"
import User from "@/models/User"

// GET - the signed-in organizer's current plan and successful payments (with receipts)
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const [user, payments, planConfig] = await Promise.all([
      User.findById(auth.userId).select("plan planStartDate planExpiresAt").lean<{ plan?: string; planStartDate?: Date; planExpiresAt?: Date }>(),
      Payment.find({ userId: auth.userId, status: { $in: ["success", "refunded"] } })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean<any[]>(),
      getPlanConfigFromDb()
    ])
    const planMap = getPlanMap(planConfig)
    const planName = (id?: string) => (id ? planMap[id]?.name || id.charAt(0).toUpperCase() + id.slice(1) : "Free")

    return NextResponse.json({
      plan: {
        id: user?.plan || "free",
        name: planName(user?.plan || "free"),
        startedAt: user?.planStartDate || null,
        expiresAt: user?.planExpiresAt || null
      },
      payments: payments.map((p) => ({
        id: String(p._id),
        description: p.kind === "addon"
          ? `${Number(p.addonEmails || 0).toLocaleString("en-IN")} certificate emails (add-on)`
          : `${planName(p.plan)}${/\bplan$/i.test(planName(p.plan)) ? "" : " plan"}, 1 year`,
        amount: p.amount,
        currency: p.currency || "INR",
        status: p.status,
        refundAmount: p.refundAmount || 0,
        paidAt: p.invoiceIssuedAt || p.createdAt,
        invoiceNumber: p.invoiceNumber || null,
        paymentId: p.paymentId || null
      }))
    })
  } catch (error) {
    console.error("Billing GET error:", error)
    return NextResponse.json({ error: "Failed to load billing" }, { status: 500 })
  }
}
