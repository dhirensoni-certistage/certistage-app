import { NextRequest, NextResponse } from "next/server"
import { clearClientSessionCookie } from "@/lib/client-auth.server"

// NextAuth (Google sign-in) session cookies, including split ".0", ".1" parts of a large session
const NEXTAUTH_COOKIE = /^(__Secure-)?next-auth\.session-token(\.\d+)?$/

// POST - Sign out: clear the organizer session cookie and the Google (NextAuth) session
export async function POST(request: NextRequest) {
  const response = NextResponse.json({ success: true })
  clearClientSessionCookie(response)
  for (const { name } of request.cookies.getAll()) {
    if (NEXTAUTH_COOKIE.test(name)) {
      response.cookies.set(name, "", { path: "/", maxAge: 0, httpOnly: true, sameSite: "lax", secure: name.startsWith("__Secure-") })
    }
  }
  return response
}
