import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const eventId = searchParams.get("eventId")
    const typeId = searchParams.get("typeId")

    console.log("🔍 Debug API called with:", { eventId, typeId })

    await connectDB()
    console.log("✅ DB Connected")

    if (!eventId || !typeId) {
      return NextResponse.json({ 
        error: "Missing parameters",
        received: { eventId, typeId }
      }, { status: 400 })
    }

    const event = await Event.findById(eventId).lean()
    console.log("📦 Event found:", event ? "Yes" : "No")

    const certType = await CertificateType.findById(typeId).lean()
    console.log("📦 CertType found:", certType ? "Yes" : "No")

    return NextResponse.json({
      success: true,
      event: event ? {
        id: event._id.toString(),
        name: event.name,
        isActive: event.isActive
      } : null,
      certificateType: certType ? {
        id: certType._id.toString(),
        name: certType.name,
        templateImage: certType.templateImage,
        hasTemplate: !!certType.templateImage
      } : null
    })
  } catch (error: any) {
    console.error("❌ Debug API Error:", error)
    return NextResponse.json({ 
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
