import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Event from "@/models/Event"
import bcrypt from "bcryptjs"
import { isDisposableEmail } from "@/lib/disposable-email"

// POST - User login
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required" }, { status: 400 })
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

    // Set cookie for middleware to recognize authenticated session
    response.cookies.set('clientSession', 'true', {
      path: '/',
      httpOnly: false, // Accessible by client-side if needed, but middleware needs it
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Login failed" }, { status: 500 })
  }
}
