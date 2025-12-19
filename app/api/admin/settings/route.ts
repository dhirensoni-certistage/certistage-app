import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"

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
    
    const { key, value } = await request.json()
    
    if (!key) {
      return NextResponse.json({ error: "Key is required" }, { status: 400 })
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
