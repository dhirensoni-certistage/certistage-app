import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EmailVerificationToken from "@/models/EmailVerificationToken"

// POST - Verify email token
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { token } = await request.json()
    
    if (!token) {
      return NextResponse.json({ error: "Token is required" }, { status: 400 })
    }

    // Find the verification token
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

    return NextResponse.json({
      success: true,
      userData: {
        email: verificationRecord.email,
        name: verificationRecord.userData.name,
        phone: verificationRecord.userData.phone,
        organization: verificationRecord.userData.organization
      },
      message: "Email verified successfully"
    })
  } catch (error) {
    console.error("Email verification error:", error)
    return NextResponse.json({ error: "Verification failed" }, { status: 500 })
  }
}