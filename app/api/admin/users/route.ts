import { NextRequest, NextResponse } from "next/server"
import { planExpiryFrom } from "@/lib/plan-config"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import bcrypt from "bcryptjs"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { backfillOAuthUsers } from "@/lib/oauth-user.server"
import { buildAdminUsersQuery, parseUsersPagination } from "@/lib/admin-users-query"
import type { PipelineStage } from "mongoose"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    // Google users created before the fix had no "Joined" date and sorted last
    await backfillOAuthUsers()

    const { searchParams } = new URL(request.url)
    let { page } = parseUsersPagination(searchParams)
    const { limit } = parseUsersPagination(searchParams)
    const query = buildAdminUsersQuery(searchParams)
    const allowedSorts = new Set(["name", "email", "plan", "isActive", "eventsCount", "createdAt"])
    const requestedSort = searchParams.get("sort") || "createdAt"
    const sortField = allowedSorts.has(requestedSort) ? requestedSort : "createdAt"
    const direction = searchParams.get("direction") === "asc" ? 1 : -1

    // Get total count
    const total = await User.countDocuments(query)
    const totalPages = Math.ceil(total / limit)
    page = Math.min(page, Math.max(1, totalPages))

    // Get users
    let users = await User.find(query)
      .select("_id name email plan isActive createdAt")
      .sort({ [sortField === "eventsCount" ? "createdAt" : sortField]: direction, _id: direction })
      .collation({ locale: "en", strength: 2 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean()

    if (sortField === "eventsCount") {
      const pipeline: PipelineStage[] = [
        { $match: query },
        { $lookup: {
          from: Event.collection.name,
          localField: "_id",
          foreignField: "ownerId",
          pipeline: [{ $count: "count" }],
          as: "eventCount",
        } },
        { $set: { eventsCount: { $ifNull: [{ $arrayElemAt: ["$eventCount.count", 0] }, 0] } } },
        { $sort: { eventsCount: direction, _id: direction } },
        { $skip: (page - 1) * limit },
        { $limit: limit },
        { $project: { _id: 1, name: 1, email: 1, plan: 1, isActive: 1, createdAt: 1 } },
      ]
      users = await User.aggregate(pipeline)
    }

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

    const planConfig = await getPlanConfigFromDb()
    const validPlans = new Set(planConfig.map(p => p.id))
    const selectedPlan = validPlans.has(plan) ? plan : "free"

    // Calculate plan dates if paid plan
    let planStartDate = null
    let planExpiresAt = null
    
    if (selectedPlan && selectedPlan !== "free") {
      planStartDate = new Date()
      if (planDuration) {
        planExpiresAt = new Date()
        planExpiresAt.setMonth(planExpiresAt.getMonth() + Number(planDuration))
      } else {
        // The plan's own term: 1 year, or 60 days for the one-event plan
        planExpiresAt = planExpiryFrom(getPlanMap(planConfig)[selectedPlan], planStartDate)
      }
    }

    // Create user
    const user = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone.trim(),
      organization: organization?.trim() || "",
      password: hashedPassword,
      plan: selectedPlan || "free",
      planStartDate,
      planExpiresAt,
      isActive: true,
      isEmailVerified: true // Admin created users are auto-verified
    })

    // Send welcome email
    try {
      const { sendEmail, emailTemplates } = await import("@/lib/email")
      const welcomeEmail = emailTemplates.welcome(user.name)
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
