import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"

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
    const body = await request.json()
    const rawPlans = Array.isArray(body?.plans) ? body.plans : []
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
