import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import Payment from "@/models/Payment"

export async function GET() {
  try {
    await connectDB()

    const [users, events, certificates, recipients, payments] = await Promise.all([
      User.countDocuments(),
      Event.countDocuments(),
      CertificateType.countDocuments(),
      Recipient.countDocuments(),
      Payment.countDocuments()
    ])

    return NextResponse.json({
      users,
      events,
      certificates,
      recipients,
      payments
    })
  } catch (error) {
    console.error("Data counts error:", error)
    return NextResponse.json({ error: "Failed to fetch data counts" }, { status: 500 })
  }
}
