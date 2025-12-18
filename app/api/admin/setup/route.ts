import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import bcrypt from "bcryptjs"

// One-time setup - Create first super admin
// Access: /api/admin/setup?secret=SETUP_SECRET_KEY
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get("secret")
    
    // Security check - only works with correct secret
    if (secret !== process.env.ADMIN_SETUP_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    await connectDB()

    // Check if super admin already exists
    const existingAdmin = await Admin.findOne({ role: "super_admin" })
    if (existingAdmin) {
      return NextResponse.json({ 
        error: "Super admin already exists",
        message: "Use admin panel to manage admins"
      }, { status: 400 })
    }

    const body = await request.json()
    const { name, email, password } = body

    if (!name || !email || !password) {
      return NextResponse.json({ error: "Name, email and password required" }, { status: 400 })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create super admin
    const admin = await Admin.create({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      role: "super_admin",
      isActive: true
    })

    return NextResponse.json({
      success: true,
      message: "Super admin created successfully!",
      admin: {
        id: admin._id,
        name: admin.name,
        email: admin.email,
        role: admin.role
      }
    })
  } catch (error: any) {
    console.error("Admin setup error:", error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
