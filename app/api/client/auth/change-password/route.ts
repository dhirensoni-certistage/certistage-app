import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import bcrypt from "bcryptjs"

// POST - Change password for logged-in user
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { userId, currentPassword, newPassword } = await request.json()
    
    if (!userId || !currentPassword || !newPassword) {
      return NextResponse.json({ 
        error: "User ID, current password and new password are required" 
      }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return NextResponse.json({ 
        error: "New password must be at least 6 characters" 
      }, { status: 400 })
    }

    if (currentPassword === newPassword) {
      return NextResponse.json({ 
        error: "New password must be different from current password" 
      }, { status: 400 })
    }

    // Find user
    const user = await User.findById(userId)
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Verify current password
    const isValidPassword = await bcrypt.compare(currentPassword, user.password)
    if (!isValidPassword) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 })
    }

    // Hash and update new password
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    user.password = hashedPassword
    await user.save()

    return NextResponse.json({
      success: true,
      message: "Password changed successfully"
    })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}
