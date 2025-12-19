import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Settings from "@/models/Settings"

// GET - Get public payment config (only key ID, not secret)
export async function GET() {
  try {
    await connectDB()
    
    const setting = await Settings.findOne({ key: "payment_config" })
    
    if (!setting?.value) {
      // Fallback to env
      return NextResponse.json({
        success: true,
        config: {
          activeGateway: "razorpay",
          razorpayKeyId: process.env.RAZORPAY_KEY_ID || null
        }
      })
    }
    
    const config = setting.value
    
    return NextResponse.json({
      success: true,
      config: {
        activeGateway: config.activeGateway || "razorpay",
        razorpayKeyId: config.razorpay?.keyId || process.env.RAZORPAY_KEY_ID || null
      }
    })
  } catch (error) {
    console.error("Get payment config error:", error)
    return NextResponse.json({ 
      success: true,
      config: {
        activeGateway: "razorpay",
        razorpayKeyId: process.env.RAZORPAY_KEY_ID || null
      }
    })
  }
}
