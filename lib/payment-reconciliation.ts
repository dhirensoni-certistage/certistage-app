interface GatewayPayment {
  id: string
  order_id: string
  status: string
  amount: number
  currency: string
  amount_refunded?: number
  refunded?: boolean
  created_at?: number
}

/** An attempted order remains pending; only a matching captured payment confirms collection. */
export class ReconciliationReviewError extends Error {}

export function matchingCapturedPayment(items: GatewayPayment[], expected: { orderId: string; amount: number; currency: string }) {
  const captured = items.find(payment => payment.status === "captured")
  if (!captured) throw new ReconciliationReviewError("No captured payment found. The order needs review.")
  if (captured.order_id !== expected.orderId || captured.amount !== expected.amount || captured.currency !== expected.currency) {
    throw new ReconciliationReviewError("Gateway amount, currency or order does not match. Review this payment in Razorpay.")
  }
  if ((captured.amount_refunded || 0) > 0 || captured.refunded) throw new ReconciliationReviewError("Gateway reports a refund. Review the refund before reconciling.")
  return captured
}
