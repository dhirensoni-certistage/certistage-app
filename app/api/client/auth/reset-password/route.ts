import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import PasswordResetToken from "@/models/PasswordResetToken"
import bcrypt from "bcryptjs"

// POST - Reset password with token
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { token, newPassword } = await request.json()
    
    if (!token || !newPassword) {
      return NextResponse.json({ error: "Token and new password are required" }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Find token in database
    const tokenDoc = await PasswordResetToken.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    })
    
    if (!tokenDoc) {
      return NextResponse.json({ error: "Invalid or expired reset token" }, { status: 400 })
    }

    // Find user and update password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const user = await User.findByIdAndUpdate(
      tokenDoc.userId,
      { password: hashedPassword },
      { new: true }
    )

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Mark token as used
    tokenDoc.used = true
    await tokenDoc.save()

    return NextResponse.json({
      success: true,
      message: "Password reset successfully. You can now login with your new password."
    })
  } catch (error) {
    console.error("Reset password error:", error)
    return NextResponse.json({ error: "Failed to reset password" }, { status: 500 })
  }
}

// GET - Verify token is valid
export async function GET(request: NextRequest) {
  try {
    await connectDB()
    
    const { searchParams } = new URL(request.url)
    const token = searchParams.get("token")
    
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    const tokenDoc = await PasswordResetToken.findOne({ 
      token,
      used: false,
      expiresAt: { $gt: new Date() }
    })
    
    if (!tokenDoc) {
      return NextResponse.json({ valid: false, error: "Invalid or expired token" }, { status: 400 })
    }

    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error("Verify token error:", error)
    return NextResponse.json({ error: "Failed to verify token" }, { status: 500 })
  }
}
