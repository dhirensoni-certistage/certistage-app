import { NextResponse } from "next/server"
import { getAddonConfigFromDb } from "@/lib/addons.server"
import { mergeAddonConfig } from "@/lib/addons"

// Public: pack quantities and prices for the Add-ons page and the buy dialogs
export async function GET() {
  try {
    return NextResponse.json({ success: true, ...(await getAddonConfigFromDb()) })
  } catch {
    return NextResponse.json({ success: false, ...mergeAddonConfig(null) }, { status: 500 })
  }
}
