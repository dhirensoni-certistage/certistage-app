import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"

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
