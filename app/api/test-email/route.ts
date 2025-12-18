import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function GET() {
  try {
    const result = await sendEmail({
      to: "radhanpuradhiren@gmail.com", // Test email
      subject: "CertiStage Test Email",
      html: `
        <h1>Test Email</h1>
        <p>This is a test email from CertiStage.</p>
        <p>Time: ${new Date().toISOString()}</p>
        <p>If you received this, email is working!</p>
      `
    })

    return NextResponse.json({
      success: result.success,
      error: result.error,
      smtpConfig: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER ? "configured" : "missing",
        pass: process.env.SMTP_PASS ? "configured" : "missing",
        from: process.env.FROM_EMAIL
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 })
  }
}
