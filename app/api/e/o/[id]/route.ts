import { NextRequest } from "next/server"
import connectDB from "@/lib/mongodb"
import { recordEmailEvent } from "@/lib/email-events"

// 1x1 transparent GIF that records a certificate email being opened (Email log)
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64")

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  try {
    await connectDB()
    await recordEmailEvent(id, { type: "open" })
  } catch (error) {
    console.error("Email open tracking failed:", error)
  }
  return new Response(PIXEL, {
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(PIXEL.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private"
    }
  })
}
