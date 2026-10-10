import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import Admin from "@/models/Admin"
import { requireAdmin } from "@/lib/admin-auth"

const MIN_PASSWORD = 8
const publicProfile = (admin: { _id: unknown; name: string; email: string; role: string; lastLogin?: Date; createdAt: Date }) => ({ _id: String(admin._id), name: admin.name, email: admin.email, role: admin.role, lastLogin: admin.lastLogin, createdAt: admin.createdAt })

// GET - the signed-in admin's profile
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.response) return auth.response
    return NextResponse.json(publicProfile(auth.admin), { headers: { "Cache-Control": "no-store" } })
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

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid profile update" }, { status: 400 })
    if (body.name === undefined && body.currentPassword === undefined && body.newPassword === undefined) return NextResponse.json({ error: "No changes supplied" }, { status: 400 })
    if (body.name !== undefined && (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100)) return NextResponse.json({ error: "Name must contain 1–100 characters" }, { status: 400 })
    // The helper leaves out the password hash; load it only here
    const admin = await Admin.findById(auth.admin._id)
    if (!admin) return NextResponse.json({ error: "Admin not found" }, { status: 404 })

    if (typeof body.name === "string" && body.name.trim()) {
      admin.name = body.name.trim().slice(0, 100)
    }

    if (body.currentPassword !== undefined || body.newPassword !== undefined) {
      if (typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
        return NextResponse.json({ error: "Current and new password are required" }, { status: 400 })
      }
      if (body.newPassword.length < MIN_PASSWORD) {
        return NextResponse.json({ error: `New password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
      }
      if (!body.currentPassword || Buffer.byteLength(body.newPassword, "utf8") > 72) return NextResponse.json({ error: "Enter your current password and a new password of at most 72 bytes" }, { status: 400 })
      const isMatch = await bcrypt.compare(body.currentPassword, admin.password)
      if (!isMatch) {
        return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
      }
      admin.password = await bcrypt.hash(body.newPassword, 12)
    }

    await admin.save()
    return NextResponse.json({ success: true, profile: publicProfile(admin) })
  } catch (error) {
    console.error("Profile PATCH error:", error)
    return NextResponse.json({ error: "Failed to update profile" }, { status: 500 })
  }
}
