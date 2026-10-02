import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import LoginOtp from "@/models/LoginOtp"
import { sendEmail, emailTemplates } from "@/lib/email"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { generateOtpCode, hashOtpCode, OTP_TTL_MS } from "@/lib/login-otp.server"

// POST - Email a one-time login code
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const body = await request.json()
    const email = String(body.email || "").trim().toLowerCase()

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "Please enter a valid email address" }, { status: 400 })
    }

    const limit = await checkRateLimit("login", `otp-request:${getClientIP(request)}:${email}`)
    if (!limit.success) {
      return rateLimitResponse(limit, "Too many code requests. Please wait a few minutes and try again.")
    }

    const user = await User.findOne({ email })
    if (!user) {
      // Deliberate product choice: tell new visitors to sign up instead of
      // silently "sending" a code that never arrives.
      return NextResponse.json(
        { error: "No account found with this email. Create a free account first.", notFound: true },
        { status: 404 }
      )
    }
    if (!user.isActive) {
      return NextResponse.json(
        { error: "This account is deactivated. Contact support to restore access." },
        { status: 403 }
      )
    }

    const code = generateOtpCode()
    await LoginOtp.deleteMany({ email })
    await LoginOtp.create({
      email,
      codeHash: hashOtpCode(email, code),
      expiresAt: new Date(Date.now() + OTP_TTL_MS)
    })

    const template = emailTemplates.loginOtp(user.name || "there", code)
    const result = await sendEmail({
      to: email,
      subject: template.subject,
      html: template.html,
      template: "login_otp",
      metadata: { userId: user._id.toString(), type: "login_otp" }
    })

    if (!result.success) {
      console.error("OTP email failed:", result.error)
      return NextResponse.json({ error: "We could not send the code right now. Please try again in a minute." }, { status: 502 })
    }

    return NextResponse.json({ success: true, message: "We emailed a 6-digit login code to " + email })
  } catch (error) {
    console.error("OTP request error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
