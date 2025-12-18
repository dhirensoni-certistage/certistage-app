import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Admin from "@/models/Admin"
import bcrypt from "bcryptjs"

export async function GET() {
  try {
    await connectDB()
    const admins = await Admin.find().select("-password").lean()
    return NextResponse.json({ admins })
  } catch (error) {
    console.error("Get admins error:", error)
    return NextResponse.json({ error: "Failed to fetch admins" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    await connectDB()
    const { username, password } = await request.json()

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password required" }, { status: 400 })
    }

    const existing = await Admin.findOne({ username })
    if (existing) {
      return NextResponse.json({ error: "Username already exists" }, { status: 400 })
    }

    const hashedPassword = await bcrypt.hash(password, 10)
    const admin = await Admin.create({ username, password: hashedPassword })

    return NextResponse.json({ 
      success: true, 
      admin: { _id: admin._id, username: admin.username, createdAt: admin.createdAt } 
    })
  } catch (error) {
    console.error("Create admin error:", error)
    return NextResponse.json({ error: "Failed to create admin" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    await connectDB()
    const { searchParams } = new URL(request.url)
    const adminId = searchParams.get("id")

    if (!adminId) {
      return NextResponse.json({ error: "Admin ID required" }, { status: 400 })
    }

    // Don't allow deleting the last admin
    const count = await Admin.countDocuments()
    if (count <= 1) {
      return NextResponse.json({ error: "Cannot delete the last admin" }, { status: 400 })
    }

    await Admin.findByIdAndDelete(adminId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete admin error:", error)
    return NextResponse.json({ error: "Failed to delete admin" }, { status: 500 })
  }
}