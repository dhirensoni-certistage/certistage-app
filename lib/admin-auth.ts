import { NextRequest, NextResponse } from "next/server"
import jwt from "jsonwebtoken"
import Admin from "@/models/Admin"
import connectDB from "@/lib/mongodb"

/** Secret for admin tokens. There is no fallback: without JWT_SECRET admin sign-in is refused. */
export function adminJwtSecret(): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error("JWT_SECRET is not set")
  return secret
}

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

    const decoded = jwt.verify(token, adminJwtSecret()) as AdminPayload

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

/**
 * The signed-in, active admin for an API route, or a ready 401/403 response.
 * Pass "super_admin" for actions only the owner may take.
 */
export async function requireAdmin(request: NextRequest, role: "super_admin" | "admin" = "admin") {
  const admin = await getAdminFromToken(request)
  if (!admin) {
    return { admin: null, response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) }
  }
  if (role === "super_admin" && admin.role !== "super_admin") {
    return { admin: null, response: NextResponse.json({ error: "Only the super admin can do this" }, { status: 403 }) }
  }
  return { admin, response: null }
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
    adminJwtSecret(),
    { expiresIn: "7d" }
  )
}
