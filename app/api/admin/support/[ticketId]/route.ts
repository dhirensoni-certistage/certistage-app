import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import SupportTicket from "@/models/SupportTicket"
export async function GET(_request: NextRequest, { params }: { params: Promise<{ ticketId: string }> }) {
  try {
    const { ticketId } = await params
    if (!/^[a-f0-9]{24}$/i.test(ticketId)) return NextResponse.json({ error: "Invalid ticket ID" }, { status: 400 })
    await connectDB(); const ticket = await SupportTicket.findById(ticketId).lean()
    if (!ticket) return NextResponse.json({ error: "Ticket not found" }, { status: 404 })
    return NextResponse.json({ ticket })
  } catch (error) { console.error("Support ticket detail error:", error); return NextResponse.json({ error: "Unable to load this ticket" }, { status: 500 }) }
}
