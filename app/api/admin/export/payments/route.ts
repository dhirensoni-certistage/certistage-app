import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Payment from "@/models/Payment"

export async function GET() {
  try {
    await connectDB()

    const payments = await Payment.find().populate("userId", "name email").lean()

    const headers = ["ID", "User Name", "User Email", "Plan", "Amount", "Currency", "Status", "Order ID", "Payment ID", "Created At"]
    const rows = payments.map((p: any) => [
      p._id.toString(),
      p.userId?.name || "Unknown",
      p.userId?.email || "",
      p.plan,
      p.amount,
      p.currency,
      p.status,
      p.orderId,
      p.paymentId || "",
      new Date(p.createdAt).toISOString()
    ])

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments_export_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Export payments error:", error)
    return NextResponse.json({ error: "Failed to export payments" }, { status: 500 })
  }
}