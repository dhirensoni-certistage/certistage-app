import { NextResponse } from "next/server"
import { sendEmail } from "@/lib/email"

export async function GET() {
  try {
    const result = await sendEmail({
      to: "radhanpuradhiren@gmail.com", // Your actual email
      subject: "Test Email - SMTP Configuration",
      html: `
        <h1>SMTP Test Email</h1>
        <p>If you're reading this, your SMTP configuration is working correctly!</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
        <p>Port: ${process.env.SMTP_PORT || '587'}</p>
        <p>Host: ${process.env.SMTP_HOST || 'smtp.hostinger.com'}</p>
      `,
      template: "test"
    })

    return NextResponse.json({
      success: result.success,
      message: result.success ? "Test email sent successfully!" : "Failed to send test email",
      error: result.error,
      data: result.data,
      smtpConfig: {
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: process.env.SMTP_PORT || '587',
        user: process.env.SMTP_USER ? 'configured' : 'missing',
        pass: process.env.SMTP_PASS ? 'configured' : 'missing',
        from: process.env.FROM_EMAIL || `CertiStage <${process.env.SMTP_USER}>`
      }
    })
  } catch (error: any) {
    return NextResponse.json({
      success: false,
      error: error.message,
      smtpConfig: {
        host: process.env.SMTP_HOST || 'smtp.hostinger.com',
        port: process.env.SMTP_PORT || '587',
        user: process.env.SMTP_USER ? 'configured' : 'missing',
        pass: process.env.SMTP_PASS ? 'configured' : 'missing',
        from: process.env.FROM_EMAIL || `CertiStage <${process.env.SMTP_USER}>`
      }
    }, { status: 500 })
  }
}
