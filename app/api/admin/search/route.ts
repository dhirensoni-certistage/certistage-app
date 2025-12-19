import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import Payment from "@/models/Payment"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const query = searchParams.get("q") || ""

    if (query.length < 2) {
      return NextResponse.json({ users: [], events: [], payments: [] })
    }

    const searchRegex = new RegExp(query, "i")

    // Search users
    const users = await User.find({
      $or: [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ]
    })
      .select("name email plan")
      .limit(5)
      .lean()

    // Search events
    const events = await Event.find({ name: searchRegex })
      .populate("userId", "name")
      .select("name status userId")
      .limit(5)
      .lean()

    // Search payments by user
    const paymentUsers = await User.find({
      $or: [{ name: searchRegex }, { email: searchRegex }]
    }).select("_id").limit(10).lean()

    const userIds = paymentUsers.map(u => u._id)
    
    const payments = await Payment.find({
      userId: { $in: userIds }
    })
      .populate("userId", "name email")
      .select("plan amount status userId createdAt")
      .sort({ createdAt: -1 })
      .limit(5)
      .lean()

    return NextResponse.json({
      users: users.map((u: any) => ({
        _id: u._id.toString(),
        name: u.name,
        email: u.email,
        plan: u.plan || "free"
      })),
      events: events.map((e: any) => ({
        _id: e._id.toString(),
        name: e.name,
        userName: e.userId?.name || "Unknown",
        status: e.status || "active"
      })),
      payments: payments.map((p: any) => ({
        _id: p._id.toString(),
        userName: p.userId?.name || "Unknown",
        plan: p.plan,
        amount: Math.round(p.amount / 100),
        status: p.status
      }))
    })
  } catch (error) {
    console.error("Search API error:", error)
    return NextResponse.json({ error: "Search failed" }, { status: 500 })
  }
}
