import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergePlanConfigWithDefaults, type PlanConfig } from "./plan-config"

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

