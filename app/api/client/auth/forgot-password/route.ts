import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import PasswordResetToken from "@/models/PasswordResetToken"
import crypto from "crypto"

// POST - Request password reset
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { email } = await request.json()
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase().trim() })
    
    // Always return success to prevent email enumeration
    if (!user) {
      return NextResponse.json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link."
      })
    }

    // Delete any existing tokens for this user
    await PasswordResetToken.deleteMany({ userId: user._id })

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString("hex")
    const tokenExpiry = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

    // Store token in database
    await PasswordResetToken.create({
      userId: user._id,
      token: resetToken,
      expiresAt: tokenExpiry,
      used: false
    })

    // Build reset link
    const resetLink = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`
    
    // Log for development (remove in production or use proper logging)
    if (process.env.NODE_ENV === "development") {
      console.log("Password reset link:", resetLink)
    }

    // Send password reset email
    try {
      const { sendEmail, emailTemplates } = await import('@/lib/email')
      const resetTemplate = emailTemplates.passwordReset(user.name, resetLink)
      await sendEmail({
        to: user.email,
        subject: resetTemplate.subject,
        html: resetTemplate.html,
        template: "passwordReset",
        metadata: {
          userId: user._id.toString(),
          userName: user.name,
          type: "password_reset"
        }
      })
    } catch (emailError) {
      console.error('Failed to send password reset email:', emailError)
      // Continue anyway - user will see success message
    }

    return NextResponse.json({
      success: true,
      message: "If an account exists with this email, you will receive a password reset link.",
      // Only include token in development for testing
      ...(process.env.NODE_ENV === "development" && { resetToken, resetLink })
    })
  } catch (error) {
    console.error("Forgot password error:", error)
    return NextResponse.json({ error: "Failed to process request" }, { status: 500 })
  }
}
