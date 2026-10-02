import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { hashOtpCode, safeEqual, OTP_LENGTH } from "@/lib/login-otp.server"
import { createVerifiedUser, buildSignupResponse, SIGNUP_CODE_MAX_ATTEMPTS } from "@/lib/signup.server"

// POST - Verify the signup code, create the account and start a session
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const code = String(body.code || "").replace(/\D/g, "")

    if (!email || code.length !== OTP_LENGTH) {
      return NextResponse.json({ error: `Enter the ${OTP_LENGTH}-digit code from your email` }, { status: 400 })
    }

    const limit = await checkRateLimit("login", `signup-verify:${getClientIP(request)}:${email}`)
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many attempts. Please request a new code in a few minutes.")
    }

    const record = await EmailVerificationToken.findOne({ email, used: false, codeHash: { $exists: true } }).sort({ createdAt: -1 })
    if (!record || record.expiresAt < new Date()) {
      return NextResponse.json({ error: "This code has expired. Request a new one.", expired: true }, { status: 400 })
    }
    if (record.attempts >= SIGNUP_CODE_MAX_ATTEMPTS) {
      await EmailVerificationToken.deleteOne({ _id: record._id })
      return NextResponse.json({ error: "Too many incorrect attempts. Request a new code.", expired: true }, { status: 400 })
    }

    if (!safeEqual(record.codeHash, hashOtpCode(email, code))) {
      record.attempts += 1
      await record.save()
      const left = SIGNUP_CODE_MAX_ATTEMPTS - record.attempts
      return NextResponse.json(
        { error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code.", expired: left <= 0 },
        { status: 401 }
      )
    }

    const existing = await User.findOne({ email })
    if (existing) {
      return NextResponse.json({ error: "This email already has an account. Please log in." }, { status: 409 })
    }

    const user = await createVerifiedUser(record)
    record.used = true
    await record.save()
    await EmailVerificationToken.deleteMany({ email, used: false })

    return buildSignupResponse(user)
  } catch (error) {
    console.error("Signup verify error:", error)
    return NextResponse.json({ error: "Could not verify the code. Please try again." }, { status: 500 })
  }
}
