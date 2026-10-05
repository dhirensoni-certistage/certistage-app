import { NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"

// Health check endpoint for monitoring
export async function GET() {
  const health = {
    status: "ok",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV,
    services: {
      database: "unknown",
      // Which mailer this deployment will use; "not configured" means OTP and receipt emails fail (502 on login)
      email: process.env.BREVO_API_KEY ? "brevo" : process.env.SENDGRID_API_KEY ? "sendgrid" : process.env.SMTP_USER && process.env.SMTP_PASS ? "smtp" : "not configured",
      certificateEmail: process.env.ZEPTOMAIL_TOKEN ? "zeptomail" : process.env.BREVO_API_KEY ? "brevo" : "not configured"
    }
  }

  try {
    // Check database connection
    await connectDB()
    health.services.database = "connected"
  } catch (error) {
    health.status = "degraded"
    health.services.database = "disconnected"
  }

  const statusCode = health.status === "ok" ? 200 : 503

  return NextResponse.json(health, { status: statusCode })
}
