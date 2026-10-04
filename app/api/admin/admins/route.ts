import { NextRequest, NextResponse } from "next/server"
import mongoose from "mongoose"
import bcrypt from "bcryptjs"
import Admin from "@/models/Admin"
import { requireAdmin } from "@/lib/admin-auth"

const MIN_PASSWORD = 8
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// GET - all admin accounts, plus who is signed in
export async function GET(request: NextRequest) {
  try {
    const auth = await requireAdmin(request)
    if (auth.response) return auth.response

    const admins = await Admin.find()
      .select("name email role isActive lastLogin createdAt")
      .sort({ role: -1, createdAt: 1 })
      .lean()
    return NextResponse.json({ admins, currentAdminId: String(auth.admin._id), currentRole: auth.admin.role })
  } catch (error) {
    console.error("Get admins error:", error)
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 })
  }
}

// POST - add an admin (super admin only). New accounts are always "admin", never super admin.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireAdmin(request, "super_admin")
    if (auth.response) return auth.response

    const body = await request.json()
    const name = typeof body.name === "string" ? body.name.trim().slice(0, 100) : ""
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body.password === "string" ? body.password : ""

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password are required" }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Enter a valid email address" }, { status: 400 })
    }
    if (password.length < MIN_PASSWORD) {
      return NextResponse.json({ error: `Password must be at least ${MIN_PASSWORD} characters` }, { status: 400 })
    }
    if (await Admin.exists({ email })) {
      return NextResponse.json({ error: "An admin with this email already exists" }, { status: 400 })
    }

    const admin = await Admin.create({
      name,
      email,
      password: await bcrypt.hash(password, 12),
      role: "admin",
      isActive: true
    })

    return NextResponse.json({
      success: true,
      admin: { _id: admin._id, name: admin.name, email: admin.email, role: admin.role, createdAt: admin.createdAt }
    })
  } catch (error) {
    console.error("Create admin error:", error)
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 })
  }
}

// DELETE - remove an admin (super admin only). Super admins and your own account can't be removed.
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireAdmin(request, "super_admin")
    if (auth.response) return auth.response

    const adminId = new URL(request.url).searchParams.get("id")
    if (!adminId || !mongoose.isValidObjectId(adminId)) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 })
    }
    if (adminId === String(auth.admin._id)) {
      return NextResponse.json({ error: "You can't remove your own account" }, { status: 400 })
    }

    const target = await Admin.findById(adminId).select("role")
    if (!target) return NextResponse.json({ error: "Admin not found" }, { status: 404 })
    if (target.role === "super_admin") {
      return NextResponse.json({ error: "A super admin can't be removed here" }, { status: 400 })
    }

    await Admin.deleteOne({ _id: adminId })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete admin error:", error)
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 })
  }
}
