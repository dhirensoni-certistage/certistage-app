import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import EmailLog from "@/models/EmailLog"

// GET - Get single email log with full content (for preview)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    await connectDB()
    const { logId } = await params

    const log = await EmailLog.findById(logId).lean()

    if (!log) {
      return NextResponse.json({ error: "Email log not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: (log as any)._id.toString(),
      to: (log as any).to,
      subject: (log as any).subject,
      template: (log as any).template,
      htmlContent: (log as any).htmlContent,
      status: (log as any).status,
      errorMessage: (log as any).errorMessage,
      metadata: (log as any).metadata,
      sentAt: (log as any).sentAt,
      readAt: (log as any).readAt,
      createdAt: (log as any).createdAt
    })
  } catch (error) {
    console.error("Error fetching email log:", error)
    return NextResponse.json({ error: "Failed to fetch email log" }, { status: 500 })
  }
}

// DELETE - Delete email log
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ logId: string }> }
) {
  try {
    await connectDB()
    const { logId } = await params

    await EmailLog.findByIdAndDelete(logId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting email log:", error)
    return NextResponse.json({ error: "Failed to delete email log" }, { status: 500 })
  }
}
