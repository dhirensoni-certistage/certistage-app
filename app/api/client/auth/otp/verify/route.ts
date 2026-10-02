import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import LoginOtp from "@/models/LoginOtp"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { buildLoginResponse, hashOtpCode, safeEqual, OTP_LENGTH, OTP_MAX_ATTEMPTS } from "@/lib/login-otp.server"

// POST - Verify a one-time login code and start a session
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()
    const code = String(body.code || "").replace(/\D/g, "")

    if (!email || code.length !== OTP_LENGTH) {
      return NextResponse.json({ error: `Enter the ${OTP_LENGTH}-digit code from your email` }, { status: 400 })
    }

    const limit = await checkRateLimit("login", `otp-verify:${getClientIP(request)}:${email}`)
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many attempts. Please request a new code in a few minutes.")
    }

    const otp = await LoginOtp.findOne({ email, used: false }).sort({ createdAt: -1 })
    if (!otp || otp.expiresAt < new Date()) {
      return NextResponse.json({ error: "This code has expired. Request a new one.", expired: true }, { status: 400 })
    }
    if (otp.attempts >= OTP_MAX_ATTEMPTS) {
      await LoginOtp.deleteOne({ _id: otp._id })
      return NextResponse.json({ error: "Too many incorrect attempts. Request a new code.", expired: true }, { status: 400 })
    }

    if (!safeEqual(otp.codeHash, hashOtpCode(email, code))) {
      otp.attempts += 1
      await otp.save()
      const left = OTP_MAX_ATTEMPTS - otp.attempts
      return NextResponse.json(
        { error: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Request a new code.", expired: left <= 0 },
        { status: 401 }
      )
    }

    otp.used = true
    await otp.save()

    const user = await User.findOne({ email })
    if (!user || !user.isActive) {
      return NextResponse.json({ error: "Account not available. Contact support." }, { status: 403 })
    }

    return await buildLoginResponse(user)
  } catch (error) {
    console.error("OTP verify error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
