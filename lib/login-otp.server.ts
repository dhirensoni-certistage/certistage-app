import crypto from "crypto"
import { NextResponse } from "next/server"
import Event from "@/models/Event"
import { signClientSessionToken, setClientSessionCookie } from "@/lib/client-auth.server"

export const OTP_LENGTH = 6
export const OTP_TTL_MS = 10 * 60 * 1000 // 10 minutes
export const OTP_MAX_ATTEMPTS = 5

export function generateOtpCode(): string {
  // crypto.randomInt avoids modulo bias; zero-padded to 6 digits
  return String(crypto.randomInt(0, 10 ** OTP_LENGTH)).padStart(OTP_LENGTH, "0")
}

// Codes are stored hashed with a server secret, so a database read alone cannot log in
export function hashOtpCode(email: string, code: string): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET || ""
  return crypto.createHmac("sha256", secret).update(`${email.toLowerCase().trim()}:${code}`).digest("hex")
}

export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a)
  const bb = Buffer.from(b)
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb)
}

/** Same response shape and cookie as the password login, so the client handles both identically. */
export async function buildLoginResponse(user: any): Promise<NextResponse> {
  let planStatus = "active"
  if (user.planExpiresAt && new Date(user.planExpiresAt) < new Date()) {
    user.plan = "free"
    await user.save()
    planStatus = "expired"
  }

  const firstEvent = await Event.findOne({ ownerId: user._id, isActive: true }).sort({ createdAt: 1 }).lean()

  const response = NextResponse.json({
    success: true,
    user: {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      phone: user.phone,
      organization: user.organization,
      plan: user.plan,
      pendingPlan: user.pendingPlan || null,
      planStartDate: user.planStartDate,
      planExpiresAt: user.planExpiresAt,
      planStatus
    },
    event: firstEvent ? { id: firstEvent._id.toString(), name: firstEvent.name } : null
  })
  setClientSessionCookie(response, signClientSessionToken({ id: user._id.toString(), email: user.email }))
  return response
}
