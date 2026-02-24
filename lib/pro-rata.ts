// Pro-rata upgrade pricing calculations
import { PLAN_PRICES, type PlanId } from "./razorpay"

export interface ProRataResult {
  originalPrice: number      // Full price of new plan (in paise)
  unusedCredit: number       // Credit from current plan (in paise)
  finalAmount: number        // Amount to pay (in paise)
  daysRemaining: number      // Days left in current plan
  totalDays: number          // Total days in billing cycle (365)
  savings: number            // How much user saves (in paise)
  savingsPercent: number     // Savings percentage
}

/**
 * Calculate pro-rata upgrade pricing
 * User gets credit for unused days of their current plan
 */
export function calculateProRataUpgrade(
  currentPlan: PlanId,
  newPlan: PlanId,
  planStartDate: Date | null,
  planExpiresAt: Date | null
): ProRataResult {
  const newPlanPrice = PLAN_PRICES[newPlan]
  const currentPlanPrice = PLAN_PRICES[currentPlan]
  
  // If free plan or no dates, pay full price
  if (currentPlan === "free" || !planStartDate || !planExpiresAt) {
    return {
      originalPrice: newPlanPrice,
      unusedCredit: 0,
      finalAmount: newPlanPrice,
      daysRemaining: 0,
      totalDays: 365,
      savings: 0,
      savingsPercent: 0
    }
  }
  
  const now = new Date()
  const startDate = new Date(planStartDate)
  const expiryDate = new Date(planExpiresAt)
  
  // Calculate total days and remaining days
  const totalDays = Math.ceil((expiryDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)))
  
  // Calculate unused credit (pro-rata of current plan)
  const dailyRate = currentPlanPrice / totalDays
  const unusedCredit = Math.round(dailyRate * daysRemaining)
  
  // Final amount = new plan price - unused credit
  const finalAmount = Math.max(0, newPlanPrice - unusedCredit)
  const savings = newPlanPrice - finalAmount
  const savingsPercent = newPlanPrice > 0 ? Math.round((savings / newPlanPrice) * 100) : 0
  
  return {
    originalPrice: newPlanPrice,
    unusedCredit,
    finalAmount,
    daysRemaining,
    totalDays,
    savings,
    savingsPercent
  }
}

/**
 * Format amount from paise to rupees display
 */
export function formatProRataAmount(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN")}`
}

/**
 * Check if user is eligible for pro-rata upgrade
 */
export function isEligibleForProRata(
  currentPlan: PlanId,
  planStartDate: Date | null,
  planExpiresAt: Date | null
): boolean {
  if (currentPlan === "free" || !planStartDate || !planExpiresAt) {
    return false
  }
  
  const now = new Date()
  const expiryDate = new Date(planExpiresAt)
  
  // Must have at least 1 day remaining
  return expiryDate > now
}

