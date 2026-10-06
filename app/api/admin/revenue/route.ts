import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import { Payment, paymentDirectoryPipeline, paymentDirectorySort, paymentDirectoryProjection, paymentItemName } from "@/lib/admin-revenue.server"
import { parseUsersPagination } from "@/lib/admin-users-query"
import { getPlanConfigFromDb } from "@/lib/plan-config.server"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const params = request.nextUrl.searchParams
    const base = paymentDirectoryPipeline(params)
    let { page } = parseUsersPagination(params)
    const { limit } = parseUsersPagination(params)
    const [count] = await Payment.aggregate([...base, { $count: "total" }])
    const total = count?.total || 0
    const totalPages = Math.ceil(total / limit)
    page = Math.min(page, Math.max(1, totalPages))
    const [payments, plans] = await Promise.all([
      Payment.aggregate([...base, { $sort: paymentDirectorySort(params) }, { $skip: (page - 1) * limit }, { $limit: limit }, paymentDirectoryProjection]).collation({ locale: "en", strength: 2 }),
      getPlanConfigFromDb(),
    ])
    const names = new Map(plans.map(plan => [plan.id, plan.name]))
    return NextResponse.json({ payments: payments.map(payment => ({ ...payment, itemName: paymentItemName(payment, names) })), pagination: { page, limit, total, totalPages } })
  } catch (error) {
    console.error("Revenue directory error:", error)
    const invalid = error instanceof Error && error.message.startsWith("Invalid ")
    return NextResponse.json({ error: invalid ? error.message : "Failed to load transactions" }, { status: invalid ? 400 : 500 })
  }
}
