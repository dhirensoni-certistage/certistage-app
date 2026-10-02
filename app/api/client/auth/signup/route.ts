import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { getPlanConfigFromDb } from "@/lib/plan-config.server"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import crypto from "crypto"
import { isDisposableEmail } from "@/lib/disposable-email"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { generateOtpCode, hashOtpCode } from "@/lib/login-otp.server"
import { SIGNUP_CODE_TTL_MS } from "@/lib/signup.server"

// POST - User signup: store the details and email a 6-digit verification code
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

    const limit = await checkRateLimit("signup", getClientIP(request))
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many signup attempts from this network. Please try again later.")
    }

    if (isDisposableEmail(email)) {
      return NextResponse.json(
        { error: "Disposable email addresses are not allowed. Please use your real email address." },
        { status: 400 }
      )
    }

    // Validate plan
    const planConfig = await getPlanConfigFromDb()
    const enabledPlans = new Set(
      planConfig.filter(p => p.enabled !== false).map(p => p.id)
    )
    const selectedPlan = enabledPlans.has(plan) ? plan : "free"

    // Check if email already exists
    const existingUser = await User.findOne({ email: email.toLowerCase().trim() })
    if (existingUser) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 })
    }

    // Delete any existing verification tokens for this email
    await EmailVerificationToken.deleteMany({ email: email.toLowerCase().trim() })

    // Verification code (hashed at rest) plus a token kept for the record id
    const code = generateOtpCode()
    const normalizedEmail = email.toLowerCase().trim()
    await EmailVerificationToken.create({
      email: normalizedEmail,
      token: crypto.randomBytes(32).toString("hex"),
      codeHash: hashOtpCode(normalizedEmail, code),
      expiresAt: new Date(Date.now() + SIGNUP_CODE_TTL_MS),
      userData: {
        name,
        phone,
        organization: organization || "",
        plan: selectedPlan
      }
    })

    // Send in-request: fire-and-forget gets dropped on serverless
    const emailResult = await sendCodeEmail(normalizedEmail, name, code)
    if (!emailResult.success) {
      return NextResponse.json(
        { error: "We could not send the verification code right now. Please try again in a minute.", emailSent: false },
        { status: 502 }
      )
    }

    return NextResponse.json({
      success: true,
      message: "We emailed a 6-digit verification code to " + normalizedEmail,
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

async function sendCodeEmail(email: string, name: string, code: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { sendEmail, emailTemplates } = await import("@/lib/email")
    const template = emailTemplates.signupOtp(name, code)
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      template: "signup_otp",
      metadata: { userName: name, type: "signup_verification" }
    })
    if (!result.success) {
      return { success: false, error: typeof result.error === "string" ? result.error : "Email send failed" }
    }
    return { success: true }
  } catch (error) {
    console.error("Verification code email failed:", error)
    return { success: false, error: error instanceof Error ? error.message : "Email send failed" }
  }
}
