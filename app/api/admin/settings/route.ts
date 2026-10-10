import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"
import { z } from "zod"

const paymentConfigSchema = z.object({
  activeGateway: z.enum(["razorpay", "stripe"]),
  razorpay: z.object({ keyId: z.string().max(500), keySecret: z.string().max(1000), isLive: z.boolean() }),
  stripe: z.object({ publishableKey: z.string().max(500), secretKey: z.string().max(1000), isLive: z.boolean() }),
}).refine(value => value.activeGateway === "razorpay" ? !!value.razorpay.keyId.trim() && !!value.razorpay.keySecret.trim() : !!value.stripe.publishableKey.trim() && !!value.stripe.secretKey.trim())

// GET - Get settings
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const key = searchParams.get("key")
    
    if (key) {
      const setting = await Settings.findOne({ key })
      return NextResponse.json({ success: true, value: setting?.value || null })
    }
    
    // Get all settings
    const settings = await Settings.find({})
    const settingsMap: Record<string, any> = {}
    settings.forEach(s => {
      settingsMap[s.key] = s.value
    })
    
    return NextResponse.json({ success: true, settings: settingsMap })
  } catch (error) {
    console.error("Get settings error:", error)
    return NextResponse.json({ error: "Failed to get settings" }, { status: 500 })
  }
}

// POST - Save settings
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const body = await request.json().catch(() => null)
    const key = body?.key
    let value = body?.value
    
    if (typeof key !== "string" || !key.trim() || key.length > 100 || value === undefined) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
    }
    if (key === "payment_config") {
      const result = paymentConfigSchema.safeParse(value)
      if (!result.success) return NextResponse.json({ error: "Enter a valid payment configuration with both keys for the selected gateway" }, { status: 400 })
      value = result.data
    }
    
    await Settings.findOneAndUpdate(
      { key },
      { key, value },
      { upsert: true, new: true }
    )
    
    return NextResponse.json({ success: true, message: "Settings saved" })
  } catch (error) {
    console.error("Save settings error:", error)
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 })
  }
}
