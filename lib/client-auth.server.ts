import { NextResponse } from "next/server"
import jwt from "jsonwebtoken"

/**
 * Server-side client (organizer) session.
 *
 * Email/password logins get a signed, httpOnly cookie. Google logins carry a
 * NextAuth session cookie instead. API routes call requireClientUser() and use
 * the returned userId; they never trust a userId sent by the browser.
 */
export const CLIENT_SESSION_COOKIE = "clientSession"
export const CLIENT_SESSION_MAX_AGE = 60 * 60 * 24 * 30 // 30 days

interface ClientSessionPayload {
  sub: string
  email: string
  type: "client"
}

function getSessionSecret(): string {
  const secret = process.env.JWT_SECRET || process.env.NEXTAUTH_SECRET
  if (!secret) {
    throw new Error("JWT_SECRET or NEXTAUTH_SECRET must be set to sign client sessions")
  }
  return secret
}

export function signClientSessionToken(user: { id: string; email: string }): string {
  const payload: ClientSessionPayload = { sub: user.id, email: user.email, type: "client" }
  return jwt.sign(payload, getSessionSecret(), { expiresIn: CLIENT_SESSION_MAX_AGE })
}

const cookieOptions = {
  path: "/",
  httpOnly: true,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production"
}

export function setClientSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(CLIENT_SESSION_COOKIE, token, { ...cookieOptions, maxAge: CLIENT_SESSION_MAX_AGE })
}

export function clearClientSessionCookie(response: NextResponse): void {
  response.cookies.set(CLIENT_SESSION_COOKIE, "", { ...cookieOptions, maxAge: 0 })
}

function readCookie(request: Request, name: string): string | null {
  const header = request.headers.get("cookie")
  if (!header) return null
  for (const part of header.split(";")) {
    const [key, ...rest] = part.trim().split("=")
    if (key === name) return decodeURIComponent(rest.join("="))
  }
  return null
}

/** Resolve the logged-in organizer's user id from the request, or null. */
export async function getClientUserId(request: Request): Promise<string | null> {
  const token = readCookie(request, CLIENT_SESSION_COOKIE)
  if (token) {
    try {
      const payload = jwt.verify(token, getSessionSecret()) as ClientSessionPayload
      if (payload?.type === "client" && typeof payload.sub === "string") {
        return payload.sub
      }
    } catch {
      // invalid or expired token: fall through to NextAuth
    }
  }

  // Google sign-in users are authenticated by NextAuth
  try {
    const { getServerSession } = await import("next-auth")
    const { authOptions } = await import("@/lib/auth-config")
    const session = await getServerSession(authOptions)
    const id = (session?.user as { id?: string } | undefined)?.id
    if (id) return id
    if (session?.user?.email) {
      const connectDB = (await import("@/lib/mongodb")).default
      const User = (await import("@/models/User")).default
      await connectDB()
      const user = await User.findOne({ email: session.user.email.toLowerCase() }).select("_id").lean()
      if (user?._id) return user._id.toString()
    }
  } catch {
    // no NextAuth session
  }

  return null
}

type AuthResult = { userId: string; response?: undefined } | { userId?: undefined; response: NextResponse }

/** Use at the top of a client API handler: `const auth = await requireClientUser(request); if (auth.response) return auth.response` */
export async function requireClientUser(request: Request): Promise<AuthResult> {
  const userId = await getClientUserId(request)
  if (!userId) {
    return { response: NextResponse.json({ error: "Not authenticated" }, { status: 401 }) }
  }
  return { userId }
}
