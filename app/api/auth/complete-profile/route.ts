import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import jwt from "jsonwebtoken"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

// Verify admin session
export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ valid: false, error: "No token" }, { status: 401 })
    }

    // Verify JWT
    const decoded = jwt.verify(token, JWT_SECRET) as {
      id: string
      email: string
      role: string
      type: string
    }

    if (decoded.type !== "admin") {
      return NextResponse.json({ valid: false, error: "Invalid token type" }, { status: 401 })
    }

    await connectDB()

    // Check if admin still exists and is active
    const admin = await Admin.findById(decoded.id).select("-password")
    
    if (!admin || !admin.isActive) {
      return NextResponse.json({ valid: false, error: "Admin not found or inactive" }, { status: 401 })
    }

    return NextResponse.json({
      valid: true,
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error) {
    console.error("Admin verify error:", error)
    return NextResponse.json({ valid: false, error: "Invalid token" }, { status: 401 })
  }
}

