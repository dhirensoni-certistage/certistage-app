import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"

export async function GET() {
  try {
    await connectDB()

    const users = await User.find().select("-password").lean()

    // Generate CSV
    const headers = ["ID", "Name", "Email", "Phone", "Organization", "Plan", "Status", "Created At"]
    const rows = users.map((u: any) => [
      u._id.toString(),
      u.name,
      u.email,
      u.phone || "",
      u.organization || "",
      u.plan,
      u.isActive ? "Active" : "Inactive",
      new Date(u.createdAt).toISOString()
    ])

    const csv = [headers.join(","), ...rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(","))].join("\n")

    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="users_export_${new Date().toISOString().split("T")[0]}.csv"`
      }
    })
  } catch (error) {
    console.error("Export users error:", error)
    return NextResponse.json({ error: "Failed to export users" }, { status: 500 })
  }
}