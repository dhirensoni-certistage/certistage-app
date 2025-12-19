import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import Payment from "@/models/Payment"

export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { collections } = await request.json()

    if (!collections || !Array.isArray(collections) || collections.length === 0) {
      return NextResponse.json({ error: "No collections specified" }, { status: 400 })
    }

    const deleted: string[] = []
    const results: Record<string, number> = {}

    // Delete in order to respect foreign key relationships
    // Recipients first (depends on CertificateType)
    if (collections.includes("recipients")) {
      const result = await Recipient.deleteMany({})
      results.recipients = result.deletedCount
      deleted.push(`${result.deletedCount} recipients`)
    }

    // Certificate Types (depends on Event)
    if (collections.includes("certificates")) {
      const result = await CertificateType.deleteMany({})
      results.certificates = result.deletedCount
      deleted.push(`${result.deletedCount} certificate types`)
    }

    // Events (depends on User)
    if (collections.includes("events")) {
      const result = await Event.deleteMany({})
      results.events = result.deletedCount
      deleted.push(`${result.deletedCount} events`)
    }

    // Payments (depends on User)
    if (collections.includes("payments")) {
      const result = await Payment.deleteMany({})
      results.payments = result.deletedCount
      deleted.push(`${result.deletedCount} payments`)
    }

    // Users last
    if (collections.includes("users")) {
      const result = await User.deleteMany({})
      results.users = result.deletedCount
      deleted.push(`${result.deletedCount} users`)
    }

    return NextResponse.json({
      success: true,
      deleted,
      results
    })
  } catch (error) {
    console.error("Clear data error:", error)
    return NextResponse.json({ error: "Failed to clear data" }, { status: 500 })
  }
}
