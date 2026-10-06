import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Payment, paymentDirectoryPipeline, paymentDirectorySort, paymentDirectoryProjection, paymentItemName } from "@/lib/admin-revenue.server"
import { getPlanConfigFromDb } from "@/lib/plan-config.server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = request.nextUrl.searchParams
    const [payments, plans] = await Promise.all([
      Payment.aggregate([...paymentDirectoryPipeline(params), { $sort: paymentDirectorySort(params) }, paymentDirectoryProjection]).collation({ locale: "en", strength: 2 }),
      getPlanConfigFromDb(),
    ])
    const names = new Map(plans.map(plan => [plan.id, plan.name]))
    const headers = ["ID", "Customer", "Email", "Type", "Item", "Amount (Minor Units)", "Amount", "Refund", "Currency", "Status", "Order ID", "Payment ID", "Invoice", "Order Date", "Refund Date"]
    const rows = payments.map(payment => [String(payment._id), payment.user?.name || "Deleted customer", payment.user?.email || "", payment.kind, paymentItemName(payment, names), payment.amountPaise, (payment.amountPaise / 100).toFixed(2), (payment.refundPaise / 100).toFixed(2), payment.currency, payment.status, payment.orderId || "", payment.paymentId || "", payment.invoiceNumber || "", payment.createdAt ? new Date(payment.createdAt).toISOString() : "", payment.refundedAt ? new Date(payment.refundedAt).toISOString() : ""])
    const escape = (value: unknown) => {
      const text = String(value ?? "")
      const safe = /^[=+\-@\t\r\n]/.test(text) ? `'${text}` : text
      return `"${safe.replace(/"/g, '""')}"`
    }
    const csv = "\uFEFF" + [headers.join(","), ...rows.map(row => row.map(escape).join(","))].join("\r\n")
    return new NextResponse(csv, { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="certistage-payments-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" } })
  } catch (error) {
    console.error("Export payments error:", error)
    const invalid = error instanceof Error && error.message.startsWith("Invalid ")
    return NextResponse.json({ error: invalid ? error.message : "Failed to export transactions" }, { status: invalid ? 400 : 500 })
  }
}
