import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"
import CertificateType from "@/models/CertificateType"

// POST - Count growth-loop clicks on the public download page.
//   { kind: "whatsapp", recipientId } → a recipient opened "Share on WhatsApp"
//   { kind: "cta", typeId }           → a visitor clicked a CertiStage link (header, "Powered by", footer CTA)
// LinkedIn clicks have their own route (/api/download/linkedin).
export async function POST(request: NextRequest) {
  try {
    const { kind, recipientId, typeId } = await request.json().catch(() => ({}))

    if (kind === "whatsapp") {
      if (typeof recipientId !== "string" || !mongoose.isValidObjectId(recipientId)) {
        return NextResponse.json({ error: "Recipient ID required" }, { status: 400 })
      }
      await connectDB()
      await Recipient.updateOne({ _id: recipientId }, { $inc: { whatsappShares: 1 } })
      return NextResponse.json({ success: true })
    }

    if (kind === "cta") {
      if (typeof typeId !== "string" || !mongoose.isValidObjectId(typeId)) {
        return NextResponse.json({ error: "Certificate type ID required" }, { status: 400 })
      }
      await connectDB()
      await CertificateType.updateOne({ _id: typeId }, { $inc: { ctaClicks: 1 } })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: "Unknown event" }, { status: 400 })
  } catch (error) {
    console.error("Download track error:", error)
    return NextResponse.json({ error: "Failed to record" }, { status: 500 })
  }
}
