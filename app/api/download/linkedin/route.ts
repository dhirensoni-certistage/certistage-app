import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"
import CertificateType from "@/models/CertificateType"
import Event from "@/models/Event"
import User from "@/models/User"
import { buildLinkedInAddUrl, individualCertificateUrl } from "@/lib/linkedin"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

// GET /api/download/linkedin?r=<recipientId>
// The "Add to LinkedIn profile" button in the certificate email points here, so the
// click is counted like one on the download page, then the person lands on LinkedIn.
export async function GET(request: NextRequest) {
  const recipientId = new URL(request.url).searchParams.get("r") || ""
  if (!mongoose.isValidObjectId(recipientId)) return NextResponse.redirect(APP_URL)
  try {
    await connectDB()
    const recipient = await Recipient.findByIdAndUpdate(
      recipientId,
      { $inc: { linkedinClicks: 1 }, $set: { lastLinkedinClickAt: new Date() } },
      { projection: { eventId: 1, certificateTypeId: 1, regNo: 1, createdAt: 1 } }
    ).lean<{ eventId: mongoose.Types.ObjectId; certificateTypeId: mongoose.Types.ObjectId; regNo?: string; createdAt?: Date }>()
    if (!recipient) return NextResponse.redirect(APP_URL)

    const [certType, event] = await Promise.all([
      CertificateType.findById(recipient.certificateTypeId).select("name").lean<{ name?: string }>(),
      Event.findById(recipient.eventId).select("name ownerId").lean<{ name?: string; ownerId?: mongoose.Types.ObjectId }>()
    ])
    const owner = event?.ownerId ? await User.findById(event.ownerId).select("organization").lean<{ organization?: string }>() : null
    const eventId = String(recipient.eventId)
    const certUrl = recipient.regNo
      ? individualCertificateUrl(APP_URL, eventId, recipient.regNo)
      : `${APP_URL}/download/${eventId}/${String(recipient.certificateTypeId)}`

    return NextResponse.redirect(buildLinkedInAddUrl({
      name: `${certType?.name || "Certificate"} certificate - ${event?.name || ""}`.replace(/ - $/, ""),
      organizationName: owner?.organization?.trim() || event?.name || "",
      issuedAt: recipient.createdAt,
      certUrl,
      certId: recipient.regNo
    }))
  } catch (error) {
    console.error("LinkedIn redirect error:", error)
    return NextResponse.redirect(APP_URL)
  }
}

// POST - Record that a recipient opened "Add to LinkedIn profile".
// The organiser dashboard counts recipients with at least one click, so repeat clicks
// by the same person do not inflate the number.
export async function POST(request: NextRequest) {
  try {
    const { recipientId } = await request.json().catch(() => ({}))
    if (typeof recipientId !== "string" || !mongoose.isValidObjectId(recipientId)) {
      return NextResponse.json({ error: "Recipient ID required" }, { status: 400 })
    }

    await connectDB()
    const updated = await Recipient.findByIdAndUpdate(
      recipientId,
      { $inc: { linkedinClicks: 1 }, $set: { lastLinkedinClickAt: new Date() } },
      { projection: { _id: 1 } }
    )
    if (!updated) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("LinkedIn click error:", error)
    return NextResponse.json({ error: "Failed to record click" }, { status: 500 })
  }
}
