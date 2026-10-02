import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import EmailVerificationToken from "@/models/EmailVerificationToken"
import { createVerifiedUser, buildSignupResponse } from "@/lib/signup.server"

// POST - Complete signup with password
export async function POST(request: NextRequest) {
  try {
    await connectDB()

    const { token, password } = await request.json()

    if (!token || !password) {
      return NextResponse.json({ error: "Token and password are required" }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: "Password must be at least 6 characters" }, { status: 400 })
    }

    // Find and validate the verification token
    const verificationRecord = await EmailVerificationToken.findOne({
      token,
      used: false
    })

    if (!verificationRecord) {
      return NextResponse.json({ error: "Invalid or already used token" }, { status: 400 })
    }

    // Check if token is expired
    if (verificationRecord.expiresAt < new Date()) {
      return NextResponse.json({ error: "Token expired" }, { status: 400 })
    }

    // Check if user already exists (double check)
    const existingUser = await User.findOne({ email: verificationRecord.email })
    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 409 })
    }

    const user = await createVerifiedUser(verificationRecord, password)

    verificationRecord.used = true
    await verificationRecord.save()

    return buildSignupResponse(user)
  } catch (error) {
    console.error("Complete signup error:", error)
    return NextResponse.json({ error: "Failed to complete signup" }, { status: 500 })
  }
}