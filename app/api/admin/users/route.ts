import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import bcrypt from "bcryptjs"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "10")
    const search = searchParams.get("search") || ""
    const plan = searchParams.get("plan") || ""

    // Build query
    const query: Record<string, unknown> = {}
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } },
        { organization: { $regex: search, $options: "i" } }
      ]
    }
    
    if (plan && plan !== "all") {
      query.plan = plan
    }

    // Get total count
    const total = await User.countDocuments(query)
    const totalPages = Math.ceil(total / limit)

    // Get users
    const users = await User.find(query)
      .select("_id name email plan isActive createdAt")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    // Get events count for each user
    const userIds = users.map(u => u._id)
    const eventCounts = await Event.aggregate([
      { $match: { ownerId: { $in: userIds } } },
      { $group: { _id: "$ownerId", count: { $sum: 1 } } }
    ])
    
    // Create a map of userId -> eventCount
    const eventCountMap = new Map(
      eventCounts.map(e => [e._id.toString(), e.count])
    )

    // Format users with actual event counts
    const formattedUsers = users.map(user => ({
      ...user,
      plan: user.plan || "free",
      isActive: user.isActive ?? true,
      eventsCount: eventCountMap.get(user._id.toString()) || 0,
      createdAt: user.createdAt || null
    }))

    return NextResponse.json({
      users: formattedUsers,
      pagination: {
        total,
        page,
        limit,
        totalPages
      }
    })
  } catch (error) {
    console.error("Users API error:", error)
    return NextResponse.json(
      { error: "Failed to fetch users", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

// POST - Create new user (admin only)
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const body = await request.json()
    const { name, email, phone, organization, password, plan, planDuration } = body

    // Validate required fields
    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { error: "Name, email, phone and password are required" },
        { status: 400 }
      )
    }

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Calculate plan dates if paid plan
    let planStartDate = null
    let planExpiresAt = null
    
    if (plan && plan !== "free") {
      planStartDate = new Date()
      const durationMonths = planDuration || 12 // Default 12 months
      planExpiresAt = new Date()
      planExpiresAt.setMonth(planExpiresAt.getMonth() + durationMonths)
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      organization: organization?.trim() || "",
      password: hashedPassword,
      plan: plan || "free",
      planStartDate,
      planExpiresAt,
      isActive: true,
      isEmailVerified: true // Admin created users are auto-verified
    })

    // Send welcome email
    try {
      const { sendEmail, emailTemplates } = await import("@/lib/email")
      const welcomeEmail = emailTemplates.welcome(user.name, user.email)
      await sendEmail({
        to: user.email,
        subject: welcomeEmail.subject,
        html: welcomeEmail.html,
        template: "welcome",
        metadata: {
          userId: user._id.toString(),
          userName: user.name,
          type: "admin_created"
        }
      })
    } catch (emailError) {
      console.error("Failed to send welcome email:", emailError)
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        plan: user.plan,
        planExpiresAt: user.planExpiresAt,
        isActive: user.isActive
      }
    })
  } catch (error) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    )
  }
}