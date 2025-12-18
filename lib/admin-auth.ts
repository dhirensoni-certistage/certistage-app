import { NextRequest } from "next/server"
import jwt from "jsonwebtoken"
import Admin from "@/models/Admin"
import connectDB from "@/lib/mongodb"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

export interface AdminPayload {
  id: string
  email: string
  role: "super_admin" | "admin"
  type: "admin"
}

// Verify admin token from request
export async function verifyAdminToken(request: NextRequest): Promise<AdminPayload | null> {
  try {
    const token = request.cookies.get("admin_token")?.value

    if (!token) {
      return null
    }

    const decoded = jwt.verify(token, JWT_SECRET) as AdminPayload

    if (decoded.type !== "admin") {
      return null
    }

    return decoded
  } catch (error) {
    return null
  }
}

// Get admin from token (with DB check)
export async function getAdminFromToken(request: NextRequest) {
  const payload = await verifyAdminToken(request)
  
  if (!payload) {
    return null
  }

  await connectDB()
  
  const admin = await Admin.findById(payload.id).select("-password")
  
  if (!admin || !admin.isActive) {
    return null
  }

  return admin
}

// Check if admin has required role
export function hasRole(admin: AdminPayload | null, requiredRole: "super_admin" | "admin"): boolean {
  if (!admin) return false
  
  if (requiredRole === "admin") {
    return admin.role === "admin" || admin.role === "super_admin"
  }
  
  return admin.role === requiredRole
}

// Generate admin JWT token
export function generateAdminToken(admin: { _id: string; email: string; role: string }): string {
  return jwt.sign(
    {
      id: admin._id,
      email: admin.email,
      role: admin.role,
      type: "admin"
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  )
}
