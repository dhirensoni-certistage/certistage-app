import Payment from "@/models/Payment"
import User from "@/models/User"
import { calculateProRataUpgrade } from "@/lib/pro-rata"
import { isOneTimePlan, type PlanConfig } from "@/lib/plan-config"

/** How long after a one-event purchase its price can still be credited against an annual plan */
export const ONE_EVENT_CREDIT_DAYS = 180

export interface PlanCredit {
  amount: number // paise
  label: string
  kind: "one-event" | "unused-days"
  /** Payment whose price is being credited (one-event credit only) */
  sourcePaymentId?: string
  daysRemaining?: number
}

/**
 * Credit a customer gets when buying `target`:
 * - a one-event plan bought in the last 180 days and not yet credited: its full price
 *   ("the second one-event purchase is an annual plan with the first ₹799 credited"), or
 * - the unused days of the current paid plan (pro-rata).
 * The bigger of the two applies, never both. Nothing is credited towards another one-time plan.
 */
export async function planCreditFor(userId: string, target: PlanConfig, priceMap: Record<string, number>): Promise<PlanCredit | null> {
  if (isOneTimePlan(target) || target.price <= 0) return null
  const user = await User.findById(userId).select("plan planStartDate planExpiresAt").lean<{ plan?: string; planStartDate?: Date; planExpiresAt?: Date }>()
  if (!user) return null

  let best: PlanCredit | null = null

  const since = new Date(Date.now() - ONE_EVENT_CREDIT_DAYS * 24 * 60 * 60 * 1000)
  const oneEvent = await Payment.findOne({
    userId,
    plan: "event",
    status: "success",
    kind: { $ne: "addon" },
    creditedToOrderId: { $exists: false },
    createdAt: { $gte: since }
  }).sort({ createdAt: -1 }).select("_id amount").lean<{ _id: unknown; amount: number }>()
  if (oneEvent && oneEvent.amount > 0) {
    best = { amount: Math.min(oneEvent.amount, target.price), label: "One-event plan credited", kind: "one-event", sourcePaymentId: String(oneEvent._id) }
  }

  if (user.plan && user.plan !== "free" && user.plan !== "event" && user.planStartDate && user.planExpiresAt) {
    const proRata = calculateProRataUpgrade(user.plan, target.id, user.planStartDate, user.planExpiresAt, priceMap)
    if (proRata.unusedCredit > 0 && (!best || proRata.unusedCredit > best.amount)) {
      best = { amount: Math.min(proRata.unusedCredit, target.price), label: `Unused ${proRata.daysRemaining} days of your ${user.plan} plan`, kind: "unused-days", daysRemaining: proRata.daysRemaining }
    }
  }
  return best
}

/** Marks the one-event payment as spent on this order, so it is never credited twice */
export async function consumeOneEventCredit(sourcePaymentId: string | undefined, orderId: string) {
  if (!sourcePaymentId) return
  await Payment.updateOne({ _id: sourcePaymentId, creditedToOrderId: { $exists: false } }, { $set: { creditedToOrderId: orderId } })
}
