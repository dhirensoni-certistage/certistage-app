import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import Notification from "@/models/Notification"
import { requireClientUser } from "@/lib/client-auth.server"
import { checkRateLimit, getClientIP, rateLimitResponse } from "@/lib/rate-limit"
import { sendEmail, renderInternalEmail } from "@/lib/email"
import { ADDONS } from "@/lib/addons"

const APP_URL = (process.env.NEXT_PUBLIC_APP_URL || "https://www.certistage.com").replace(/\/$/, "")

// POST { addonId } - "Request early access" on an upcoming add-on.
// Records the request on the user, adds an admin notification and emails the admin inbox.
// The request is saved even if the email fails, so the customer never sees an error for
// a mail problem on our side.
export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response

    const limit = await checkRateLimit("contact", `addon-request:${auth.userId}:${getClientIP(request)}`)
    if (!limit.success) return rateLimitResponse(limit, "Too many requests. Please wait a few minutes and try again.")

    const body = await request.json().catch(() => ({}))
    const addon = ADDONS.find((a) => a.id === body.addonId && a.status === "soon")
    if (!addon) return NextResponse.json({ error: "This add-on cannot be requested" }, { status: 400 })

    await connectDB()
    const user = await User.findById(auth.userId).select("name email phone organization plan addonRequests")
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const existing = (user.addonRequests || []).find((r: { addonId: string }) => r.addonId === addon.id)
    if (existing) {
      return NextResponse.json({ success: true, alreadyRequested: true, requestedAt: existing.requestedAt })
    }

    const requestedAt = new Date()
    await User.updateOne({ _id: user._id }, { $push: { addonRequests: { addonId: addon.id, requestedAt } } })

    await Notification.create({
      type: "addon_request",
      title: `Add-on request: ${addon.title}`,
      description: `${user.name || user.email} (${user.organization || user.plan || "free"}) asked for early access to ${addon.title}`,
      userId: user._id,
      metadata: { userName: user.name, userEmail: user.email, organization: user.organization, plan: user.plan, addonId: addon.id, addonTitle: addon.title },
      read: false
    }).catch((e) => console.error("Add-on request notification failed:", e))

    const to = process.env.ADMIN_EMAIL || "support@certistage.com"
    const html = renderInternalEmail({
      title: `Early access request: ${addon.title}`,
      rows: [
        ["Add-on", addon.title],
        ["Name", user.name || "-"],
        ["Email", user.email],
        ["Phone", user.phone || "-"],
        ["Organization", user.organization || "-"],
        ["Plan", user.plan || "free"],
        ["Requested", requestedAt.toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })]
      ],
      note: `Reply to the customer at ${user.email}. Open their account in the <a href="${APP_URL}/admin/users/${user._id}">admin panel</a>.`
    })
    sendEmail({
      to,
      cc: process.env.ADMIN_CC_EMAIL || undefined,
      subject: `[Add-on request] ${addon.title}: ${user.name || user.email}`,
      html,
      template: "addon_request",
      metadata: { type: "addon_request", userId: auth.userId, addonId: addon.id }
    }).catch((e) => console.error("Add-on request email failed:", e))

    return NextResponse.json({ success: true, requestedAt })
  } catch (error) {
    console.error("Add-on request POST error:", error)
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 })
  }
}
