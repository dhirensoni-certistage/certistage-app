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
      database: "unknown"
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
