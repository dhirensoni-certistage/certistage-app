import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { mergeAddonConfig } from "@/lib/addons"
import { ADDON_CONFIG_KEY, getAddonConfigFromDb } from "@/lib/addons.server"

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
    const body = await request.json().catch(() => ({}))
    const config = mergeAddonConfig(body)
    await Settings.findOneAndUpdate({ key: ADDON_CONFIG_KEY }, { key: ADDON_CONFIG_KEY, value: config }, { upsert: true, new: true })
    return NextResponse.json({ success: true, ...config })
  } catch (error) {
    console.error("Save add-on config error:", error)
    return NextResponse.json({ error: "Failed to save add-on packs" }, { status: 500 })
  }
}
