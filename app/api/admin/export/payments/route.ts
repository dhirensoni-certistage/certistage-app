import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"

export const dynamic = "force-dynamic"

export async function GET() {
  try {
    await connectDB()

    const payments = await Payment.find().populate("userId", "name email").lean()

    const headers = ["ID", "User Name", "User Email", "Plan", "Amount (Paise)", "Amount (INR)", "Currency", "Status", "Order ID", "Payment ID", "Created At"]
    const rows = payments.map((p: any) => [
      p._id?.toString() || "",
      p.userId?.name || "Unknown",
      p.userId?.email || "",
      p.plan || "",
      p.amount || 0,
      p.amount ? (p.amount / 100).toFixed(2) : "0.00",
      p.currency || "INR",
      p.status || "",
      p.orderId || "",
      p.paymentId || "",
      p.createdAt ? new Date(p.createdAt).toISOString() : ""
    ])

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v || "").replace(/"/g, '""')}"`).join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments_export_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error: any) {
    console.error("Export payments error:", error?.message || error)
    return NextResponse.json({ error: "Failed to export payments", details: error?.message }, { status: 500 })
  }
}