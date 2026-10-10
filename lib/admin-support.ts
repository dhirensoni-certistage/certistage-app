export const TICKET_STATUSES = ["open", "in_progress", "closed"] as const
export type TicketStatus = typeof TICKET_STATUSES[number]
export interface AdminTicket {
  _id: string; number: string; userId: string; name: string; email: string; phone?: string; organization?: string; plan: string
  subject: string; message?: string; eventName?: string; pageUrl?: string; status: TicketStatus; adminNote?: string
  replies?: { author: "admin" | "customer"; name: string; message: string; at: string; emailSent?: boolean }[]
  lastReplyBy?: "admin" | "customer"; lastReplyAt?: string; emailSent: boolean; emailError?: string; createdAt: string; updatedAt: string; closedAt?: string
}
export const TICKET_LABELS: Record<TicketStatus, string> = { open: "Open", in_progress: "In progress", closed: "Closed" }
export function ticketNeedsReply(ticket: AdminTicket) { return ticket.status !== "closed" && ticket.lastReplyBy !== "admin" }
