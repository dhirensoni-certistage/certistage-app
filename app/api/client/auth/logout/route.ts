import { NextResponse } from "next/server"
import { clearClientSessionCookie } from "@/lib/client-auth.server"

// POST - Clear the organizer session cookie
export async function POST() {
  const response = NextResponse.json({ success: true })
  clearClientSessionCookie(response)
  return response
}
