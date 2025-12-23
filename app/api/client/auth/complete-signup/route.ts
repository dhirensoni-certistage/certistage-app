import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import bcrypt from "bcryptjs"

// POST - Complete signup with password
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { token, password } = await request.json()
    
    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Find and validate the verification token
    const verificationRecord = await EmailVerificationToken.findOne({ 
      token,
      used: false
    })

    if (!verificationRecord) {
      return NextResponse.json({ error: "Invalid or already used token" }, { status: 400 })
    }

    // Check if token is expired
    if (verificationRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 })
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ email: verificationRecord.email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10)

    // Check if paid plan selected - if yes, create with free plan and pending payment
    const selectedPlan = verificationRecord.userData.plan || "free"
    const isPaidPlan = selectedPlan !== "free"

    // Create user - for paid plans, start with free and set pending payment
    const user = await User.create({
      name: verificationRecord.userData.name,
      email: verificationRecord.email,
      password: hashedPassword,
      phone: verificationRecord.userData.phone,
      organization: verificationRecord.userData.organization,
      plan: isPaidPlan ? "free" : "free", // Always start with free
      pendingPlan: isPaidPlan ? selectedPlan : null, // Store selected paid plan
      isActive: true
    })

    // Mark token as used
    verificationRecord.used = true
    await verificationRecord.save()

    // Send welcome email and admin notification
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      
      // Welcome email
      const welcomeTemplate = emailTemplates.welcome(user.name, user.email)
      await sendEmail({
        to: user.email,
        subject: welcomeTemplate.subject,
        html: welcomeTemplate.html,
        template: "welcome",
        metadata: {
          userId: user._id.toString(),
          userName: user.name,
          type: "signup_welcome"
        }
      })
      
      // Admin notification
      if (process.env.ADMIN_EMAIL) {
        const adminTemplate = emailTemplates.adminNotification('signup', {
          name: user.name,
          email: user.email,
          phone: user.phone,
          organization: user.organization
        })
        await sendEmail({
          to: process.env.ADMIN_EMAIL,
          subject: adminTemplate.subject,
          html: adminTemplate.html,
          template: "adminNotification",
          metadata: {
            userId: user._id.toString(),
            userName: user.name,
            type: "new_signup_notification"
          }
        })
      }
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError)
      // Don't fail signup if email fails
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
        pendingPlan: user.pendingPlan || null
      },
      pendingPlan: user.pendingPlan || null,
      message: "Account created successfully"
    })
  } catch (error) {
    console.error("Complete signup error:", error)
    return NextResponse.json({ error: "Failed to complete signup" }, { status: 500 })
  }
}