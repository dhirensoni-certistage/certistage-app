import { NextRequest, NextResponse } from "next/server"
import { cookies } from "next/headers"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

// GET - Get admin profile
export async function GET() {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { adminId: string }
    
    await connectDB()
    const admin = await Admin.findById(decoded.adminId).select("-password").lean()

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    return NextResponse.json(admin)
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PATCH - Update admin profile
export async function PATCH(request: NextRequest) {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get("admin_token")?.value

    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { adminId: string }
    const body = await request.json()

    await connectDB()
    const admin = await Admin.findById(decoded.adminId)

    if (!admin) {
      return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    }

    // Update name
    if (body.name) {
      admin.name = body.name
    }

    // Change password
    if (body.currentPassword && body.newPassword) {
      const isMatch = await bcrypt.compare(body.currentPassword, admin.password)
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      admin.password = await bcrypt.hash(body.newPassword, 10)
    }

    await admin.save()

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
