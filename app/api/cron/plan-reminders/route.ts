import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import { sendEmail, emailTemplates } from "@/lib/email"
import { getPlanConfigFromDb, getPlanMap } from "@/lib/plan-config.server"
import { isOneTimePlan } from "@/lib/plan-config"

export const maxDuration = 60

const DAY = 24 * 60 * 60 * 1000

/**
 * Daily (vercel.json): plan expiry emails. 15 days before, 3 days before, and the day after a
 * paid plan ends. Each is sent once per plan term (User.planReminders.key = plan:expiry), so a
 * renewal starts a fresh set. The plan itself is not changed here; login already drops an
 * expired plan to Free. Protected by CRON_SECRET like the backup cron.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) return NextResponse.json({ error: "CRON_SECRET is not set" }, { status: 500 })
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  try {
    await connectDB()
    const now = Date.now()
    const planMap = getPlanMap(await getPlanConfigFromDb())
    const users = await User.find({
      plan: { $ne: "free" },
      isActive: { $ne: false },
      planExpiresAt: { $gte: new Date(now - 2 * DAY), $lte: new Date(now + 15 * DAY) }
    }).select("name email plan planExpiresAt planReminders").limit(500)

    const sent = { d15: 0, d3: 0, expired: 0 }
    for (const user of users) {
      if (!user.email || !user.planExpiresAt) continue
      const expiresAt = new Date(user.planExpiresAt)
      const key = `${user.plan}:${expiresAt.toISOString()}`
      const reminders = user.planReminders?.key === key ? user.planReminders : { key }
      const daysLeft = Math.ceil((expiresAt.getTime() - now) / DAY)
      const cfg = planMap[user.plan]
      const planName = cfg?.name || user.plan
      const oneTime = isOneTimePlan(cfg)

      let stage: "d15At" | "d3At" | "expiredAt" | null = null
      if (daysLeft <= 0 && daysLeft >= -2 && !reminders.expiredAt) stage = "expiredAt"
      else if (daysLeft > 0 && daysLeft <= 3 && !reminders.d3At) stage = "d3At"
      else if (daysLeft > 3 && daysLeft <= 15 && !reminders.d15At) stage = "d15At"
      if (!stage) continue

      const template = stage === "expiredAt"
        ? emailTemplates.planExpired({ name: user.name || "there", planName, expiredAt: expiresAt })
        : emailTemplates.planExpiring({ name: user.name || "there", planName, expiresAt, daysLeft, oneTime })
      const result = await sendEmail({
        to: user.email,
        subject: template.subject,
        html: template.html,
        template: stage === "expiredAt" ? "plan_expired" : "plan_expiring",
        metadata: { userId: String(user._id), userName: user.name, type: "plan_reminder", stage, plan: user.plan }
      })
      if (!result.success) continue
      await User.updateOne({ _id: user._id }, { $set: { planReminders: { ...reminders, key, [stage]: new Date() } } })
      if (stage === "d15At") sent.d15++
      else if (stage === "d3At") sent.d3++
      else sent.expired++
    }

    return NextResponse.json({ success: true, checked: users.length, sent })
  } catch (error) {
    console.error("Plan reminders error:", error)
    return NextResponse.json({ error: "Plan reminders failed" }, { status: 500 })
  }
}
