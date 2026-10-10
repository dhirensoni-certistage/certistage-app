import { randomBytes } from "node:crypto"
import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import AdminCaptcha from "@/models/AdminCaptcha"
import { CAPTCHA_COOKIE, CAPTCHA_SECONDS, captchaHash, createCaptchaImage } from "@/lib/admin-captcha"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

export async function GET(request: NextRequest) {
  try {
    await connectDB()
    const { answer, image } = await createCaptchaImage()
    const token = randomBytes(32).toString("hex")
    const expiresAt = new Date(Date.now() + CAPTCHA_SECONDS * 1000)
    const previous = request.cookies.get(CAPTCHA_COOKIE)?.value
    if (previous) await AdminCaptcha.deleteOne({ token: previous })
    await AdminCaptcha.create({ token, answerHash: captchaHash(token, answer), expiresAt })
    const response = NextResponse.json({ image, expiresAt }, { headers: { "Cache-Control": "no-store" } })
    response.cookies.set(CAPTCHA_COOKIE, token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/login", maxAge: CAPTCHA_SECONDS })
    return response
  } catch {
    return NextResponse.json({ error: "Unable to load CAPTCHA. Please try again." }, { status: 503, headers: { "Cache-Control": "no-store" } })
  }
}
