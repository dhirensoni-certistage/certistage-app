import { NextResponse } from "next/server"
import { getPlanConfigFromDb } from "@/lib/plan-config.server"

export async function GET() {
  try {
    const plans = await getPlanConfigFromDb()
    return NextResponse.json({
      success: true,
      plans
    })
  } catch (error) {
    return NextResponse.json({ success: false, plans: [] }, { status: 500 })
  }
}
