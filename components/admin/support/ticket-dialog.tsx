"use client"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Loader2, Send, MessageSquare, User, FileText, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { emailLogDate } from "@/lib/admin-email-logs"
import { TICKET_LABELS, TICKET_STATUSES, type AdminTicket, type TicketStatus } from "@/lib/admin-support"

const actionStyle = "border-gold/35 bg-white text-gold-deep hover:bg-gold-soft"
export function TicketDialog({ id, onClose, onUpdated }: { id: string | null; onClose: () => void; onUpdated: () => void }) {
  const [ticket, setTicket] = useState<AdminTicket | null>(null); const [loading, setLoading] = useState(false); const [error, setError] = useState("")
  const [note, setNote] = useState(""); const [reply, setReply] = useState(""); const [status, setStatus] = useState<TicketStatus>("open")
  const [saving, setSaving] = useState<"reply" | "note" | "status" | null>(null); const [retry, setRetry] = useState(0)
  useEffect(() => {
    if (!id) return
    const controller = new AbortController(); setTicket(null); setReply(""); setNote(""); setLoading(true); setError("")
    fetch(`/api/admin/support/${id}`, { signal: controller.signal }).then(async res => { const data = await res.json(); if (!res.ok) throw Error(data.error || "Unable to load ticket"); return data.ticket }).then(ticket => { setTicket(ticket); setNote(ticket.adminNote || ""); setStatus(ticket.status) }).catch(err => { if (!controller.signal.aborted) setError(err.message) }).finally(() => { if (!controller.signal.aborted) setLoading(false) })
    return () => controller.abort()
  }, [id, retry])
  function close() {
    if (saving) return
    if ((reply.trim() || (ticket && note !== (ticket.adminNote || ""))) && !window.confirm("Discard your unsaved reply or internal note?")) return
    onClose()
  }
  async function update(action: "reply" | "note" | "status") {
    if (!ticket || saving) return
    setSaving(action)
    try {
      const patch = action === "reply" ? { reply: reply.trim() } : action === "note" ? { adminNote: note } : { status }
      const res = await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: ticket._id, ...patch }) })
      const data = await res.json(); if (!res.ok) throw Error(data.error || "Unable to update ticket")
      setTicket(data.ticket); setStatus(data.ticket.status)
      if (action === "reply") { setReply(""); if (data.emailSent) toast.success("Reply saved and emailed to the customer"); else toast.warning("Reply saved on the ticket, but the customer email failed") }
      else toast.success(action === "note" ? "Internal note saved" : "Ticket status updated")
      onUpdated()
    } catch (err) { toast.error(err instanceof Error ? err.message : "Unable to update ticket") } finally { setSaving(null) }
  }
  return <Dialog open={!!id} onOpenChange={open => { if (!open) close() }}><DialogContent className="w-[96vw] sm:max-w-6xl max-h-[92vh] overflow-y-auto p-4 md:p-6" onEscapeKeyDown={event => { if (saving) event.preventDefault() }} onInteractOutside={event => { if (saving) event.preventDefault() }}>
    <DialogHeader><DialogTitle className="flex items-center gap-2"><MessageSquare className="h-5 w-5 text-gold-deep"/>Support ticket</DialogTitle><DialogDescription>{ticket ? `${ticket.number} · Created ${emailLogDate(ticket.createdAt)} IST` : "Review the conversation and manage this request."}</DialogDescription></DialogHeader>
    {loading ? <div className="py-20 text-center"><Loader2 className="mx-auto mb-3 h-6 w-6 animate-spin text-gold-deep"/>Loading conversation...</div> : error ? <div className="py-12 text-center"><p className="mb-3 text-destructive">{error}</p><Button variant="outline" onClick={() => setRetry(value => value + 1)}>Try again</Button></div> : ticket ? <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0 space-y-5"><h2 className="break-words text-xl font-semibold">{ticket.subject}</h2><div className="space-y-3 rounded-xl border bg-slate-50/50 p-3 md:p-4">
        <div className="rounded-lg border bg-white p-4"><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs"><span className="font-medium">{ticket.name || "Customer"}<span className="ml-2 text-muted-foreground">Customer</span></span><span className="text-muted-foreground">{emailLogDate(ticket.createdAt)} IST</span></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{ticket.message}</p></div>
        {(ticket.replies || []).map((item, index) => <div key={index} className={cn("rounded-lg border p-4", item.author === "admin" ? "border-gold/20 bg-gold-soft/50" : "bg-white")}><div className="mb-2 flex flex-wrap justify-between gap-2 text-xs"><span className="font-medium">{item.name || (item.author === "admin" ? "CertiStage Support" : ticket.name)}<span className="ml-2 text-muted-foreground">{item.author === "admin" ? "Support" : "Customer"}</span></span><span className="text-muted-foreground">{emailLogDate(item.at)} IST</span></div><p className="whitespace-pre-wrap break-words text-sm leading-relaxed">{item.message}</p>{item.author === "admin" && item.emailSent === false && <p className="mt-3 flex items-center gap-1.5 text-xs text-amber-700"><AlertTriangle className="h-3.5 w-3.5"/>Saved to the ticket; email delivery failed.</p>}</div>)}
      </div><div className="space-y-3"><Label htmlFor="support-reply">Reply to customer</Label><Textarea id="support-reply" className="min-h-[140px]" rows={5} maxLength={5000} disabled={!!saving} placeholder="Write a helpful response..." value={reply} onChange={event => setReply(event.target.value)} /><div className="flex flex-wrap items-center justify-between gap-3"><p className="text-xs text-muted-foreground">Saved to the ticket and emailed to {ticket.email}.</p><Button variant="outline" className={actionStyle} disabled={!!saving || !reply.trim()} onClick={() => update("reply")}>{saving === "reply" ? <Loader2 className="h-4 w-4 animate-spin"/> : <Send className="h-4 w-4"/>}{saving === "reply" ? "Sending…" : "Send reply"}</Button></div><p className="text-xs text-muted-foreground">{reply.length.toLocaleString()} / 5,000 characters{ticket.status === "open" ? " · Sending a reply moves this ticket to In progress." : ""}</p></div></div>
      <aside className="min-w-0 space-y-5"><div className="space-y-3 rounded-xl border p-4"><h3 className="flex items-center gap-2 text-sm font-semibold"><User className="h-4 w-4 text-gold-deep"/>Customer details</h3>{[["Name", ticket.name || "—"], ["Email", ticket.email], ["Organization", ticket.organization || "—"], ["Phone", ticket.phone || "—"], ["Plan at submission", ticket.plan], ["Event", ticket.eventName || "—"]].map(([label, value]) => <div key={label}><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 break-words text-sm">{value}</p></div>)}{ticket.userId && <Link className="inline-block text-sm text-gold-deep hover:underline" href={`/admin/users/${ticket.userId}`}>View customer account →</Link>}{ticket.pageUrl && <div><p className="text-xs text-muted-foreground">Page reported</p><p className="mt-1 break-all text-xs">{ticket.pageUrl}</p></div>}</div>
        <div className="space-y-3 rounded-xl border p-4"><Label>Ticket status</Label><Select value={status} disabled={!!saving} onValueChange={value => setStatus(value as TicketStatus)}><SelectTrigger className="w-full" aria-label="Ticket status"><SelectValue/></SelectTrigger><SelectContent>{TICKET_STATUSES.map(value => <SelectItem key={value} value={value}>{TICKET_LABELS[value]}</SelectItem>)}</SelectContent></Select><Button variant="outline" className={cn("w-full", actionStyle)} disabled={!!saving || status === ticket.status} onClick={() => update("status")}>{saving === "status" ? "Updating…" : "Update status"}</Button>{ticket.closedAt && <p className="text-xs text-muted-foreground">Closed {emailLogDate(ticket.closedAt)} IST</p>}</div>
        <div className="space-y-3 rounded-xl border p-4"><Label htmlFor="support-note" className="flex items-center gap-2"><FileText className="h-4 w-4 text-gold-deep"/>Internal note</Label><p className="text-xs text-muted-foreground">Visible only to admins.</p><Textarea id="support-note" rows={4} maxLength={2000} value={note} disabled={!!saving} onChange={event => setNote(event.target.value)} placeholder="Record context or next steps..."/><Button className="w-full" variant="outline" disabled={!!saving || note === (ticket.adminNote || "")} onClick={() => update("note")}>{saving === "note" ? "Saving…" : "Save note"}</Button></div>
        {!ticket.emailSent && <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800"><p className="font-medium">Admin notification email failed</p><p className="mt-1 break-words">{ticket.emailError || "The ticket was saved successfully."}</p></div>}
      </aside>
    </div> : null}
  </DialogContent></Dialog>
}

