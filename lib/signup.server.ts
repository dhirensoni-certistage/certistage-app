import crypto from "crypto"
import bcrypt from "bcryptjs"
import { NextResponse } from "next/server"
import User from "@/models/User"
import { signClientSessionToken, setClientSessionCookie } from "@/lib/client-auth.server"

export const SIGNUP_CODE_TTL_MS = 15 * 60 * 1000 // 15 minutes
export const SIGNUP_CODE_MAX_ATTEMPTS = 5

interface VerificationRecord {
  email: string
  userData: { name: string; phone: string; organization?: string; plan?: string }
}

/**
 * Creates the user from a verified signup record, sends the welcome and admin
 * emails, and records the admin notification. Shared by the in-page code flow
 * and the older email-link flow.
 *
 * When no password is given (code flow) a random one is stored so the account
 * can only be entered via email code, Google, or after a password reset.
 */
export async function createVerifiedUser(record: VerificationRecord, password?: string) {
  const hashedPassword = await bcrypt.hash(password || crypto.randomBytes(32).toString("hex"), 10)
  const selectedPlan = record.userData.plan || "free"
  const isPaidPlan = selectedPlan !== "free"

  const user = await User.create({
    name: record.userData.name,
    email: record.email,
    password: hashedPassword,
    phone: record.userData.phone,
    organization: record.userData.organization || "",
    plan: "free", // paid plans activate after payment
    pendingPlan: isPaidPlan ? selectedPlan : null,
    isActive: true,
    isEmailVerified: true
  })

  await notifyNewSignup(user)

  return user
}

/**
 * Admin panel notification, welcome email to the new user and "new signup" email to
 * ADMIN_EMAIL. Used by email sign-up and Google sign-up. Never throws.
 */
export async function notifyNewSignup(user: {
  _id: { toString(): string }
  name: string
  email: string
  phone?: string
  organization?: string
}): Promise<void> {
  try {
    const Notification = (await import("@/models/Notification")).default
    await Notification.create({
      type: "signup",
      title: "New User Signup",
      description: `${user.name} (${user.email}) joined`,
      userId: user._id,
      metadata: { userName: user.name, userEmail: user.email, phone: user.phone, organization: user.organization },
      read: false
    })
  } catch (err) {
    console.error("Failed to create signup notification:", err)
  }

  try {
    const { sendEmail, emailTemplates } = await import("@/lib/email")
    const adminCCEmail = process.env.ADMIN_CC_EMAIL
    const welcome = emailTemplates.welcome(user.name)
    await sendEmail({
      to: user.email,
      subject: welcome.subject,
      html: welcome.html,
      cc: adminCCEmail,
      template: "welcome",
      metadata: { userId: user._id.toString(), userName: user.name, type: "signup_welcome" }
    })
    if (process.env.ADMIN_EMAIL) {
      const admin = emailTemplates.adminNotification("signup", {
        name: user.name,
        email: user.email,
        phone: user.phone,
        organization: user.organization
      })
      await sendEmail({
        to: process.env.ADMIN_EMAIL,
        subject: admin.subject,
        html: admin.html,
        cc: adminCCEmail,
        template: "adminNotification",
        metadata: { userId: user._id.toString(), userName: user.name, type: "new_signup_notification" }
      })
    }
  } catch (err) {
    console.error("Failed to send signup emails:", err)
  }
}

/** Response for a freshly created account: same user payload the login routes return, plus the session cookie. */
export function buildSignupResponse(user: any): NextResponse {
  const response = NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      organization: user.organization,
      plan: user.plan,
      pendingPlan: user.pendingPlan || null
    },
    pendingPlan: user.pendingPlan || null,
    message: "Account created successfully"
  })
  setClientSessionCookie(response, signClientSessionToken({ id: user._id.toString(), email: user.email }))
  return response
}
