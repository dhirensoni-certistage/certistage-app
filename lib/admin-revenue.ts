export type PaymentStatus = "success" | "pending" | "failed" | "refunded"
export type RevenueSort = "createdAt" | "amount" | "status" | "user.name"
export interface RevenuePayment {
  _id: string
  user: { _id?: string; name: string; email: string }
  plan: string
  kind: "plan" | "addon"
  itemName: string
  amountPaise: number
  refundPaise: number
  currency: string
  status: PaymentStatus
  orderId: string
  paymentId?: string
  invoiceNumber?: string
  failureReason?: string
  createdAt: string
  refundedAt?: string
}
export interface RevenueSummary {
  period: { range: string; from: string | null; to: string; interval: "day" | "month" }
  totals: { grossPaise: number; refundPaise: number; netPaise: number; capturedCount: number; pendingCount: number; pendingPaise: number; failedCount: number; refundedCount: number; averagePaise: number; payingCustomers: number; successRate: number | null; netChange: number | null }
  series: { date: string; grossPaise: number; refundPaise: number; netPaise: number }[]
  breakdown: { id: string; name: string; netPaise: number; count: number }[]
  plans: { id: string; name: string }[]
  gatewayConfigured: boolean
  pendingAllCount: number
  asOf: string
}
export const paymentStatusLabels: Record<PaymentStatus, string> = { success: "Paid", pending: "Pending", failed: "Failed", refunded: "Refunded" }
export function formatMoney(paise: number, currency = "INR") {
  const safeCurrency = /^[A-Z]{3}$/.test(currency) ? currency : "INR"
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: safeCurrency, minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(paise / 100)
}
