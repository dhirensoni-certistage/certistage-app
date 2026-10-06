import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergeAddonConfig } from "@/lib/addons"
import { ADDON_CONFIG_KEY, getAddonConfigFromDb } from "@/lib/addons.server"
import { z } from "zod"

const positive = z.number().int().positive().max(1000000000)
const configSchema = z.object({
  emailPacks: z.array(z.object({ id: z.string().min(1), emails: positive, price: positive })).min(1).max(50),
  certPacks: z.array(z.object({ id: z.string().min(1), certificates: positive, price: positive })).min(1).max(50),
  emailRateTiers: z.array(z.object({ from: z.number().int().min(0).max(500000), paise: z.number().positive().max(100000) })).min(1).max(20),
})

// Admin session is checked by proxy.ts for every /api/admin route

export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await getAddonConfigFromDb()) })
  } catch (error) {
    console.error("Get add-on config error:", error)
    return NextResponse.json({ error: "Failed to load add-on packs" }, { status: 500 })
  }
}

// POST { emailPacks, certPacks } - quantities and prices (paise) per pack id
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const result = configSchema.safeParse(await request.json().catch(() => null))
    if (!result.success) return NextResponse.json({ error: "Invalid add-on quantities or pricing" }, { status: 400 })
    const body = result.data
    const uniqueIds = (packs: { id: string }[]) => new Set(packs.map(pack => pack.id)).size === packs.length
    if (!uniqueIds(body.emailPacks) || !uniqueIds(body.certPacks) || !body.emailRateTiers.some(tier => tier.from === 0) || new Set(body.emailRateTiers.map(tier => tier.from)).size !== body.emailRateTiers.length) return NextResponse.json({ error: "Pack IDs and tier thresholds must be unique; rates must start at zero." }, { status: 400 })
    const config = mergeAddonConfig(body)
    await Settings.findOneAndUpdate({ key: ADDON_CONFIG_KEY }, { key: ADDON_CONFIG_KEY, value: config }, { upsert: true, new: true })
    return NextResponse.json({ success: true, ...config })
  } catch (error) {
    console.error("Save add-on config error:", error)
    return NextResponse.json({ error: "Failed to save add-on packs" }, { status: 500 })
  }
}
