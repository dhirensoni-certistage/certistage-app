import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergePlanConfigWithDefaults, planExpiryFrom, type PlanConfig } from "./plan-config"

export async function getPlanConfigFromDb(): Promise<PlanConfig[]> {
  await connectDB()
  const setting = await Settings.findOne({ key: "plan_config" }).lean()
  return mergePlanConfigWithDefaults(setting?.value)
}

export function getPlanMap(plans: PlanConfig[]): Record<string, PlanConfig> {
  return plans.reduce<Record<string, PlanConfig>>((acc, plan) => {
    acc[plan.id] = plan
    return acc
  }, {})
}


export async function getPlanById(planId: string): Promise<PlanConfig | null> {
  return getPlanMap(await getPlanConfigFromDb())[planId] || null
}

/** When a payment made now (or at `from`) for this plan runs out: 365 days for annual plans, 60 for the one-event plan */
export async function planExpiresAtFor(planId: string, from: Date = new Date()): Promise<Date> {
  return planExpiryFrom(await getPlanById(planId), from)
}
