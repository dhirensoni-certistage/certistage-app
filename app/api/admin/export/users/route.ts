import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import mongoose from "mongoose"
import { buildAdminUsersQuery } from "@/lib/admin-users-query"

export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const query = buildAdminUsersQuery(request.nextUrl.searchParams)
    const ids = request.nextUrl.searchParams.get("ids")
    if (ids) {
      const selectedIds = ids.split(",")
      if (selectedIds.length > 100 || selectedIds.some(id => !/^[a-f0-9]{24}$/i.test(id))) {
        return NextResponse.json({ error: "Invalid user selection" }, { status: 400 })
      }
      query._id = { $in: selectedIds.map(id => new mongoose.Types.ObjectId(id)) }
    }
    const users = await User.find(query).select("-password").sort({ createdAt: -1, _id: -1 }).lean()

    // Generate CSV
    const headers = ["ID", "Name", "Email", "Phone", "Organization", "Plan", "Pending Plan", "Plan Expires", "Status", "Created At"]
    const rows = users.map((u: any) => [
      u._id?.toString() || "",
      u.name || "",
      u.email || "",
      u.phone || "",
      u.organization || "",
      u.plan || "free",
      u.pendingPlan || "",
      u.planExpiresAt ? new Date(u.planExpiresAt).toLocaleDateString("en-IN") : "",
      u.isActive !== false ? "Active" : "Inactive",
      u.createdAt ? new Date(u.createdAt).toISOString() : ""
    ])

    const csv = "\uFEFF" + [headers.join(","), ...rows.map(r => r.map(v => {
      const value = String(v ?? "")
      const safe = /^[=+\-@\t\r\n]/.test(value) ? `'${value}` : value
      return `"${safe.replace(/"/g, '""')}"`
    }).join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error: any) {
    console.error("Export users error:", error?.message || error)
    return NextResponse.json({ error: "Failed to export users", details: error?.message }, { status: 500 })
  }
}
