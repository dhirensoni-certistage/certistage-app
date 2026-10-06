import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import EmailDelivery from "@/models/EmailDelivery"
import { recordEmailEvent } from "@/lib/email-events"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

// The certificate email's button: records the click (Email log), then opens the recipient's page
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  let target = APP_URL
  try {
    if (mongoose.isValidObjectId(id)) {
      await connectDB()
      const log = await EmailDelivery.findById(id).select("link").lean<{ link?: string }>()
      // Only ever redirect to our own download pages
      if (log?.link?.startsWith(`${APP_URL}/download`)) target = log.link
      if (log) await recordEmailEvent(id, { type: "click" })
    }
  } catch (error) {
    console.error("Email click tracking failed:", error)
  }
  return NextResponse.redirect(target, { status: 302, headers: { "Cache-Control": "no-store" } })
}
