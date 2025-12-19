import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Payment from "@/models/Payment"

export async function GET() {
  try {
    await connectDB()

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const [pendingPayments, newUsersToday, activeEvents] = await Promise.all([
      Payment.countDocuments({ status: "pending" }),
      User.countDocuments({ createdAt: { $gte: today } }),
      Event.countDocuments({ status: "active" })
    ])

    return NextResponse.json({
      pendingPayments,
      newUsersToday,
      activeEvents
    })
  } catch (error) {
    console.error("Sidebar counts error:", error)
    return NextResponse.json({ pendingPayments: 0, newUsersToday: 0, activeEvents: 0 })
  }
}
