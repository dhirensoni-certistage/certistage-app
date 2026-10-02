import { NextResponse } from "next/server"

// Retired: CertiStage sign-in uses an emailed one-time code (see /api/client/auth/otp/*).
export async function POST() {
  return NextResponse.json({ error: "Password sign-in has been retired. Request a login code instead." }, { status: 410 })
}
