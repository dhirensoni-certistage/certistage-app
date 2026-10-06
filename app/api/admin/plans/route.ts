import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"
import { z } from "zod"
import User from "@/models/User"

const limit = z.number().int().min(-1).max(100000000)
const planSchema = z.object({
  id: z.string().regex(/^[a-z0-9][a-z0-9_-]{0,63}$/),
  name: z.string().trim().min(1).max(100),
  enabled: z.boolean(), price: z.number().int().min(0).max(1000000000),
  currency: z.literal("INR").optional(),
  billingPeriod: z.enum(["year", "month", "one-time"]).optional(),
  validityDays: z.number().int().positive().max(36500).optional(),
  features: z.array(z.string().max(500)).max(50),
  limits: z.object({ maxEvents: limit, maxCertificateTypes: limit, maxCertificates: limit, downloadLimit: limit,
    canCreateEvent: z.boolean(), canImportData: z.boolean(), canExportReport: z.boolean(), canUpgrade: z.boolean(), canRemoveBranding: z.boolean() }),
  badge: z.string().max(100).optional(), description: z.string().max(1000).optional(),
  highlight: z.boolean().optional(), accent: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(), sortOrder: z.number().int().min(0).optional(),
})

export async function GET() {
  try {
    await connectDB()
    const setting = await Settings.findOne({ key: "plan_config" }).lean()
    const plans = mergePlanConfigWithDefaults(setting?.value)
    return NextResponse.json({ success: true, plans })
  } catch (error) {
    console.error("Get plans error:", error)
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const result = z.object({ plans: z.array(planSchema).min(1).max(100) }).safeParse(await request.json().catch(() => null))
    if (!result.success) return NextResponse.json({ error: "Invalid plan configuration. Check pricing, IDs and usage limits." }, { status: 400 })
    const rawPlans = result.data.plans
    if (new Set(rawPlans.map(plan => plan.id)).size !== rawPlans.length) return NextResponse.json({ error: "Plan IDs must be unique" }, { status: 400 })
    const existing = await Settings.findOne({ key: "plan_config" }).lean()
    const removed = mergePlanConfigWithDefaults(existing?.value).filter(plan => !rawPlans.some(next => next.id === plan.id))
    if (removed.length && await User.exists({ plan: { $in: removed.map(plan => plan.id) } })) return NextResponse.json({ error: "This plan has assigned users. Disable purchase availability instead of deleting it." }, { status: 409 })
    const plans = mergePlanConfigWithDefaults(rawPlans as PlanConfig[])

    await Settings.findOneAndUpdate(
      { key: "plan_config" },
      { key: "plan_config", value: plans },
      { upsert: true, new: true }
    )

    return NextResponse.json({ success: true, plans })
  } catch (error) {
    console.error("Save plans error:", error)
    return NextResponse.json({ error: "Failed to save plans" }, { status: 500 })
  }
}
