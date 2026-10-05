"use client"

import { useCallback, useEffect, useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Search, RefreshCw, Loader2, Mail, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface Ticket {
  _id: string
  number: string
  name: string
  email: string
  phone?: string
  organization?: string
  plan: string
  subject: string
  message: string
  eventName?: string
  pageUrl?: string
  status: "open" | "in_progress" | "closed"
  adminNote?: string
  emailSent: boolean
  emailError?: string
  createdAt: string
  closedAt?: string
}

const STATUS_LABEL: Record<Ticket["status"], string> = { open: "Open", in_progress: "In progress", closed: "Closed" }
const STATUS_CLASS: Record<Ticket["status"], string> = {
  open: "bg-amber-50 text-amber-800 border-amber-200",
  in_progress: "bg-blue-50 text-blue-800 border-blue-200",
  closed: "bg-neutral-100 text-neutral-600 border-neutral-200"
}
const fmt = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })

export default function AdminSupportPage() {
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [counts, setCounts] = useState({ open: 0, in_progress: 0, closed: 0 })
  const [status, setStatus] = useState("open")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Ticket | null>(null)
  const [note, setNote] = useState("")
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ status, search })
      const res = await fetch(`/api/admin/support?${params}`)
      if (res.ok) {
        const data = await res.json()
        setTickets(data.tickets || [])
        setCounts(data.counts || { open: 0, in_progress: 0, closed: 0 })
      }
    } catch {}
    setLoading(false)
  }, [status, search])

  useEffect(() => { load() }, [load])

  const update = async (id: string, patch: { status?: Ticket["status"]; adminNote?: string }) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/support", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, ...patch }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not update"); return }
      toast.success("Ticket updated")
      setSelected(data.ticket)
      load()
    } catch { toast.error("Could not update") }
    setSaving(false)
  }

  return (
    <>
      <AdminHeader title="Support" description="Requests sent from the customer Support page" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Breadcrumbs />

          <div className="grid grid-cols-3 gap-4">
            {(["open", "in_progress", "closed"] as const).map((s) => (
              <button key={s} type="button" onClick={() => setStatus(s)} className={cn("rounded-xl border p-4 text-left transition-colors", status === s ? "border-foreground" : "border-border hover:border-neutral-400")}>
                <p className="text-xs uppercase tracking-wider text-muted-foreground">{STATUS_LABEL[s]}</p>
                <p className="text-2xl font-semibold mt-1 tabular-nums">{counts[s]}</p>
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Ticket, subject, name, email or organisation" className="pl-9" />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[160px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="in_progress">In progress</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="all">All</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={load} disabled={loading}><RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} /> Refresh</Button>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Ticket</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Plan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Received</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && tickets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin inline mr-2" />Loading</TableCell></TableRow>
                  ) : tickets.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="py-10 text-center text-muted-foreground">No tickets here.</TableCell></TableRow>
                  ) : tickets.map((t) => (
                    <TableRow key={t._id} className="cursor-pointer" onClick={() => { setSelected(t); setNote(t.adminNote || "") }}>
                      <TableCell className="font-mono text-xs">{t.number}</TableCell>
                      <TableCell className="font-medium max-w-[320px] truncate">{t.subject}</TableCell>
                      <TableCell>
                        <div className="text-sm">{t.name || t.email}</div>
                        <div className="text-xs text-muted-foreground">{t.organization || t.email}</div>
                      </TableCell>
                      <TableCell className="capitalize text-sm">{t.plan}</TableCell>
                      <TableCell>
                        <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] font-medium", STATUS_CLASS[t.status])}>{STATUS_LABEL[t.status]}</span>
                        {!t.emailSent && <AlertTriangle className="inline h-3.5 w-3.5 ml-1.5 text-amber-600" aria-label="Email to admin failed" />}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground whitespace-nowrap">{fmt(t.createdAt)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-2xl">
          {selected && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2"><span className="font-mono text-sm text-muted-foreground">{selected.number}</span> {selected.subject}</DialogTitle>
                <DialogDescription>
                  {selected.name || selected.email} · {selected.organization || "no organisation"} · {selected.plan} plan · {fmt(selected.createdAt)}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div className="rounded-lg border bg-muted/40 p-4 text-sm whitespace-pre-wrap leading-relaxed">{selected.message}</div>
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <p><span className="text-muted-foreground">Email: </span><a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: [${selected.number}] ${selected.subject}`)}`} className="underline underline-offset-4">{selected.email}</a></p>
                  <p><span className="text-muted-foreground">Phone: </span>{selected.phone || "-"}</p>
                  <p><span className="text-muted-foreground">Event: </span>{selected.eventName || "-"}</p>
                  <p><span className="text-muted-foreground">Admin email: </span>{selected.emailSent ? "sent" : <span className="text-amber-700">failed{selected.emailError ? ` (${selected.emailError})` : ""}</span>}</p>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs uppercase tracking-wider text-muted-foreground">Internal note</label>
                  <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What was done, or what is pending" />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex gap-2">
                    {(["open", "in_progress", "closed"] as const).filter((s) => s !== selected.status).map((s) => (
                      <Button key={s} size="sm" variant={s === "closed" ? "default" : "outline"} disabled={saving} onClick={() => update(selected._id, { status: s, adminNote: note })}>
                        Mark {STATUS_LABEL[s].toLowerCase()}
                      </Button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={saving} onClick={() => update(selected._id, { adminNote: note })}>Save note</Button>
                    <Button size="sm" variant="outline" asChild>
                      <a href={`mailto:${selected.email}?subject=${encodeURIComponent(`Re: [${selected.number}] ${selected.subject}`)}`}><Mail className="h-4 w-4 mr-1.5" /> Reply by email</a>
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
