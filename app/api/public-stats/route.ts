import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import type { PublicStats } from "@/lib/public-stats"

// Public, read-only aggregate numbers for the landing page.
// Cached at the CDN for an hour so visitors never hit the database directly.
const CACHE_HEADER = "public, s-maxage=3600, stale-while-revalidate=86400"

export async function GET() {
  try {
    await connectDB()

    const [certificates, downloads, events, owners, certificateTypes] = await Promise.all([
      Recipient.countDocuments(),
      Recipient.countDocuments({ downloadCount: { $gt: 0 } }),
      Event.countDocuments({ isActive: true }),
      Event.distinct("ownerId", { isActive: true }),
      CertificateType.countDocuments({ isActive: true })
    ])

    const stats: PublicStats = {
      certificates,
      downloads,
      events,
      organizations: owners.length,
      certificateTypes,
      generatedAt: new Date().toISOString()
    }

    return NextResponse.json(stats, { headers: { "Cache-Control": CACHE_HEADER } })
  } catch (error) {
    console.error("Public stats error:", error)
    return NextResponse.json({ error: "Failed to load stats" }, { status: 500 })
  }
}
