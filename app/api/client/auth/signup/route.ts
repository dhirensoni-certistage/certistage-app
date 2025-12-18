import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import crypto from "crypto"

// POST - User signup (Email verification step)
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { name, email, phone, organization, plan } = await request.json()
    
    if (!name || !email || !phone) {
      return NextResponse.json({ error: "Name, email and phone are required" }, { status: 400 })
    }

    // Validate plan
    const validPlans = ["free", "professional", "enterprise", "premium"]
    const selectedPlan = validPlans.includes(plan) ? plan : "free"

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Delete any existing verification tokens for this email
    await EmailVerificationToken.deleteMany({ email: email.toLowerCase().trim() })

    // Generate verification token
    const verificationToken = crypto.randomBytes(32).toString("hex")
    
    // Store verification data
    await EmailVerificationToken.create({
      email: email.toLowerCase().trim(),
      token: verificationToken,
      userData: {
        name,
        phone,
        organization: organization || "",
        plan: selectedPlan
      }
    })

    // Create verification link
    const verificationLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`

    // Send verification email (skip if email service not configured)
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      const verificationTemplate = emailTemplates.emailVerification(name, verificationLink)
      await sendEmail({
        to: email,
        subject: verificationTemplate.subject,
        html: verificationTemplate.html
      })
    } catch (emailError) {
      console.error('Email service not configured, skipping verification email:', emailError)
      // Continue without sending email in development
    }

    // Development mode: Send email but also provide direct access info
    if (process.env.NODE_ENV === "development") {
      console.log('🔗 Development - Verification Link:', verificationLink)
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent! Please check your inbox and click the link to complete your registration.",
      // Only include token in development for testing
      ...(process.env.NODE_ENV === "development" && { verificationToken, verificationLink })
    })
  } catch (error) {
    console.error("Signup error:", error)
    return NextResponse.json({ error: "Signup failed" }, { status: 500 })
  }
}
