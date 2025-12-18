import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import crypto from "crypto"

// POST - User signup (Email verification step)
export async function POST(request: NextRequest) {
  try {
    // Connect to DB with timeout
    const dbPromise = connectDB()
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Database connection timeout')), 10000)
    )
    
    await Promise.race([dbPromise, timeoutPromise])
    
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

    // Send verification email
    let emailSent = false
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      const verificationTemplate = emailTemplates.emailVerification(name, verificationLink)
      const result = await sendEmail({
        to: email,
        subject: verificationTemplate.subject,
        html: verificationTemplate.html
      })
      emailSent = result.success
      if (!result.success) {
        console.error('Email sending failed:', result.error)
      }
    } catch (emailError) {
      console.error('Email service error:', emailError)
    }

    return NextResponse.json({
      success: true,
      message: emailSent 
        ? "Verification email sent! Please check your inbox and click the link to complete your registration."
        : "Account created! Please check your email for verification link.",
      emailSent
    })
  } catch (error: any) {
    console.error("Signup error:", error)
    
    if (error.message === 'Database connection timeout') {
      return NextResponse.json({ error: "Server is busy, please try again" }, { status: 503 })
    }
    
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 })
  }
}

// Background email sending function
async function sendVerificationEmail(email: string, name: string, verificationLink: string) {
  try {
    const { sendEmail, emailTemplates } = await import('@/lib/email')
    const verificationTemplate = emailTemplates.emailVerification(name, verificationLink)
    
    // Add timeout to email sending
    const emailPromise = sendEmail({
      to: email,
      subject: verificationTemplate.subject,
      html: verificationTemplate.html
    })
    
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Email sending timeout')), 15000)
    )
    
    await Promise.race([emailPromise, timeoutPromise])
    console.log('Verification email sent to:', email)
  } catch (error) {
    console.error('Email sending failed:', error)
  }
}
