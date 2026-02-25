import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import crypto from "crypto"
import { isDisposableEmail } from "@/lib/disposable-email"

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

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Disposable email addresses are not allowed. Please use your real email address." },
        { status: 400 }
      )
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

    // In serverless, fire-and-forget can get dropped after response.
    // Send email in-request so delivery and logging are reliable.
    const emailResult = await sendVerificationEmail(email, name, verificationLink)

    if (!emailResult.success) {
      return NextResponse.json(
        {
          error: "Account created, but verification email could not be sent. Please try again in a minute.",
          emailSent: false
        },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "Verification email sent! Please check your inbox and click the link to complete your registration.",
      emailSent: true
    })
  } catch (error: any) {
    console.error("Signup error:", error)
    
    if (error.message === 'Database connection timeout') {
      return NextResponse.json({ error: "Server is busy, please try again" }, { status: 503 })
    }
    
    return NextResponse.json({ error: "Signup failed. Please try again." }, { status: 500 })
  }
}

async function sendVerificationEmail(email: string, name: string, verificationLink: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { sendEmail, emailTemplates } = await import('@/lib/email')
    const adminCCEmail = process.env.ADMIN_CC_EMAIL?.trim()
    const verificationTemplate = emailTemplates.emailVerification(name, verificationLink)

    const result = await sendEmail({
      to: email,
      subject: verificationTemplate.subject,
      html: verificationTemplate.html,
      cc: adminCCEmail,
      template: "emailVerification",
      metadata: {
        userName: name,
        type: "signup_verification"
      }
    })

    if (!result.success) {
      return { success: false, error: typeof result.error === "string" ? result.error : "Email send failed" }
    }

    console.log('Verification email sent to:', email)
    return { success: true }
  } catch (error) {
    console.error('Verification email failed:', error)
    return { success: false, error: error instanceof Error ? error.message : "Email send failed" }
  }
}
