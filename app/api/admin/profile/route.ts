import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import Admin from "@/models/Admin"
import { requireAdmin } from "@/lib/admin-auth"

const MIN_PASSWORD = 8

// GET - the signed-in admin's profile
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.response) return auth.response
    return NextResponse.json(auth.admin.toObject())
  } catch (error) {
    console.error("Profile GET error:", error)
    return NextResponse.json({ error: "Failed to fetch profile" }, { status: 500 })
  }
}

// PATCH - change the signed-in admin's name and/or password
export async function PATCH(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.response) return auth.response

    const body = await request.json()
    // The helper leaves out the password hash; load it only here
    const admin = await Admin.findById(auth.admin._id)
    if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 })

    if (typeof body.name === "string" && body.name.trim()) {
      admin.name = body.name.trim().slice(0, 100)
    }

    if (body.currentPassword || body.newPassword) {
      if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
        return NextResponse.json({ error: "Current and new password are required" }, { status: 400 })
      }
      if (body.newPassword.length < MIN_PASSWORD) {
        return NextResponse.json({ error: `New password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
      }
      const isMatch = await bcrypt.compare(body.currentPassword, admin.password)
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      admin.password = await bcrypt.hash(body.newPassword, 12)
    }

    await admin.save()
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
