import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import bcrypt from "bcryptjs"
import { isDisposableEmail } from "@/lib/disposable-email"
import { signClientSessionToken, setClientSessionCookie } from "@/lib/client-auth.server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"

// POST - User login
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
    }

    // Slow down password guessing: per IP and per account
    const ip = getClientIP(request)
    const limit = await checkRateLimit("login", `${ip}:${String(email).toLowerCase().trim()}`)
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many login attempts. Please wait a few minutes and try again.")
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Disposable email addresses are not supported. Please use your registered real email address." },
        { status: 400 }
      )
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    if (!user) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check if user is active
    if (!user.isActive) {
      return NextResponse.json({ error: "Account is disabled. Contact support." }, { status: 403 })
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    // Check plan expiry
    let planStatus = "active"
    if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
      // Plan expired, downgrade to free
      user.plan = "free"
      await user.save()
      planStatus = "expired"
    }

    // Get user's first event (if any)
    const firstEvent = await Event.findOne({ ownerId: user._id, isActive: true })
      .sort({ createdAt: 1 })
      .lean()

    const response = NextResponse.json({
      success: true,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization,
        plan: user.plan,
        pendingPlan: user.pendingPlan || null,
        planStartDate: user.planStartDate,
        planExpiresAt: user.planExpiresAt,
        planStatus
      },
      event: firstEvent ? {
        id: firstEvent._id.toString(),
        name: firstEvent.name
      } : null
    })

    // Signed, httpOnly session cookie: API routes identify the user from this
    setClientSessionCookie(response, signClientSessionToken({ id: user._id.toString(), email: user.email }))

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
