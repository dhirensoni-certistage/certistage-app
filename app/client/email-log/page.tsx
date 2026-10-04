"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Download, Search, ChevronLeft, ChevronRight, Mail, ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClientSession } from "@/lib/auth"
import { cn } from "@/lib/utils"
import { BuyEmailsDialog } from "@/components/client/buy-emails-dialog"
import { StatusTag } from "@/components/client/addon-status-tag"

type Status = "sending" | "sent" | "delivered" | "opened" | "clicked" | "bounced" | "failed" | "spam"

interface Row {
  id: string
  sentAt: string
  recipientName: string
  to: string
  certificate: string
  kind: "certificate" | "reminder"
  status: Status
  error: string | null
  bounceType: "hard" | "soft" | null
  deliveredAt: string | null
  openedAt: string | null
  openCount: number
  clickedAt: string | null
  clickCount: number
  downloadedAt: string | true | null
}

interface Summary {
  total: number
  sent: number
  delivered: number
  opened: number
  clicked: number
  bounced: number
  failed: number
  spam: number
  recipients: number
  downloaded: number
}

interface Quota {
  planLimit: number
  planRemaining: number
  credits: number
  remaining: number
}

const STATUS_STYLE: Record<Status, { label: string; className: string }> = {
  sending: { label: "Sending", className: "bg-neutral-100 text-neutral-600" },
  sent: { label: "Sent", className: "bg-neutral-100 text-neutral-700" },
  delivered: { label: "Delivered", className: "bg-sky-50 text-sky-700" },
  opened: { label: "Opened", className: "bg-indigo-50 text-indigo-700" },
  clicked: { label: "Clicked", className: "bg-emerald-50 text-emerald-700" },
  bounced: { label: "Bounced", className: "bg-red-50 text-red-700" },
  failed: { label: "Failed", className: "bg-red-50 text-red-700" },
  spam: { label: "Marked as spam", className: "bg-amber-50 text-amber-800" },
}

const n = (v: number) => v.toLocaleString("en-IN")
const pct = (part: number, whole: number) => (whole > 0 ? `${Math.round((part / whole) * 100)}%` : "–")
const when = (v: string | null | true) =>
  v && v !== true
    ? new Date(v).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })
    : null

export default function EmailLogPage() {
  const [eventId, setEventId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [rows, setRows] = useState<Row[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [types, setTypes] = useState<{ id: string; name: string }[]>([])
  const [filtered, setFiltered] = useState(0)
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [typeId, setTypeId] = useState("all")
  const [status, setStatus] = useState("all")
  const [query, setQuery] = useState("")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
  const [reload, setReload] = useState(0)

  useEffect(() => {
    setEventId(getClientSession()?.eventId || null)
    setReady(true)
  }, [])

  // Search as you type, without a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => { setSearch(query.trim()); setPage(1) }, 300)
    return () => clearTimeout(t)
  }, [query])

  const params = useCallback(
    (extra: Record<string, string> = {}) =>
      new URLSearchParams({
        eventId: eventId || "",
        ...(typeId !== "all" ? { typeId } : {}),
        ...(status !== "all" ? { status } : {}),
        ...(search ? { q: search } : {}),
        ...extra,
      }),
    [eventId, typeId, status, search]
  )

  useEffect(() => {
    if (!eventId) { if (ready) setLoading(false); return }
    let cancelled = false
    setLoading(true)
    fetch(`/api/client/email-log?${params({ page: String(page) })}`)
      .then(async (res) => {
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to load")
        if (cancelled) return
        setRows(data.rows)
        setSummary(data.summary)
        setQuota(data.quota)
        setTypes(data.certificateTypes)
        setFiltered(data.filtered)
        setPageSize(data.pageSize)
        setError(null)
      })
      .catch((e) => { if (!cancelled) setError(e.message) })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [eventId, ready, page, params, reload])

  if (ready && !eventId) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">No event selected</h1>
        <p className="text-[15px] text-neutral-500 max-w-[380px] mb-6">Pick an event to see the certificate emails sent for it.</p>
        <Button asChild className="h-10 px-5 bg-neutral-900 hover:bg-black"><Link href="/client/events">Go to events</Link></Button>
      </div>
    )
  }

  const pages = Math.max(1, Math.ceil(filtered / pageSize))
  const tiles = summary
    ? [
        { label: "Sent", value: n(summary.sent), sub: summary.failed ? `${n(summary.failed)} failed` : `to ${n(summary.recipients)} people` },
        { label: "Delivered", value: n(summary.delivered), sub: `${pct(summary.delivered, summary.sent)} of sent` },
        { label: "Opened", value: n(summary.opened), sub: `${pct(summary.opened, summary.sent)} of sent` },
        { label: "Clicked", value: n(summary.clicked), sub: `${pct(summary.clicked, summary.sent)} of sent` },
        { label: "Downloaded", value: n(summary.downloaded), sub: `${pct(summary.downloaded, summary.recipients)} of people emailed` },
        { label: "Bounced", value: n(summary.bounced + summary.spam), sub: summary.spam ? `${n(summary.spam)} marked as spam` : "address could not receive" },
      ]
    : []

  return (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden bg-[#FDFDFD]">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 flex-shrink-0">
        <div>
          <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight leading-none flex items-center gap-2">Email log <StatusTag status="beta" /></h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">
            Every certificate email for this event and what happened to it.
            {quota && (
              <> Emails left: <span className="font-medium text-neutral-900">{quota.remaining === -1 ? "no limit" : n(quota.remaining)}</span>
                {quota.credits > 0 && <span> (incl. {n(quota.credits)} add-on)</span>}</>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 px-3 text-[13px] border-neutral-200 bg-white" onClick={() => setBuyOpen(true)}>
            <ShoppingCart className="h-3.5 w-3.5 mr-1.5" /> Buy emails
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 px-3 text-[13px] border-neutral-200 bg-white">
            <Link href="/client/recipients"><Mail className="h-3.5 w-3.5 mr-1.5" /> Send emails</Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="h-9 px-3 text-[13px] border-neutral-200 bg-white" disabled={!filtered}>
            <a href={`/api/client/email-log?${params({ format: "csv" })}`}><Download className="h-3.5 w-3.5 mr-1.5" /> Export CSV</a>
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-2.5 mb-4 flex-shrink-0">
        {(summary ? tiles : Array.from({ length: 6 }, () => null)).map((t, i) => (
          <div key={i} className="rounded-lg border border-neutral-200 bg-white px-3.5 py-3">
            {t ? (
              <>
                <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{t.label}</p>
                <p className="text-[22px] font-semibold text-neutral-900 leading-tight mt-0.5">{t.value}</p>
                <p className="text-[11px] text-neutral-500 mt-0.5 leading-snug">{t.sub}</p>
              </>
            ) : (
              <div className="h-[58px] animate-pulse rounded bg-neutral-100" />
            )}
          </div>
        ))}
      </div>

      <div className="flex-1 min-h-0 flex flex-col rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="flex flex-col md:flex-row gap-2 p-3 border-b border-neutral-100">
          <Select value={typeId} onValueChange={(v) => { setTypeId(v); setPage(1) }}>
            <SelectTrigger className="md:w-[200px] h-9 text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All certificates</SelectItem>
              {types.map((t) => <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>)}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1) }}>
            <SelectTrigger className="md:w-[170px] h-9 text-[13px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Any status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="delivered">Delivered</SelectItem>
              <SelectItem value="opened">Opened</SelectItem>
              <SelectItem value="clicked">Clicked</SelectItem>
              <SelectItem value="bounced">Bounced</SelectItem>
              <SelectItem value="spam">Marked as spam</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-neutral-400" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or email" className="h-9 pl-8 text-[13px]" />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full min-w-[980px] text-[12.5px] table-fixed">
            <thead className="sticky top-0 bg-neutral-50 z-10 border-b border-neutral-200">
              <tr>
                {[["Sent", "w-[120px]"], ["Recipient", "w-[220px]"], ["Certificate", "w-[130px]"], ["Type", "w-[90px]"], ["Status", "w-[130px]"], ["Opened", "w-[110px]"], ["Clicked", "w-[110px]"], ["Downloaded", "w-[110px]"]].map(([h, w]) => (
                  <th key={h} className={cn("text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider", w)}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && rows.length === 0 ? (
                Array.from({ length: 6 }, (_, i) => (
                  <tr key={i} className="border-b border-neutral-100"><td colSpan={8} className="px-3 py-3"><div className="h-4 rounded bg-neutral-100 animate-pulse" /></td></tr>
                ))
              ) : error ? (
                <tr><td colSpan={8} className="px-3 py-10 text-center text-red-600">{error}</td></tr>
              ) : rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-3 py-14 text-center">
                    <p className="text-[14px] font-medium text-neutral-900">{summary?.total ? "No emails match these filters" : "No certificate emails yet"}</p>
                    <p className="text-[13px] text-neutral-500 mt-1">
                      {summary?.total ? "Try another status or search." : <>Send them from <Link href="/client/recipients" className="underline">Recipients → Email certificates</Link>.</>}
                    </p>
                  </td>
                </tr>
              ) : (
                rows.map((r) => {
                  const s = STATUS_STYLE[r.status]
                  return (
                    <tr key={r.id} className={cn("border-b border-neutral-100 hover:bg-neutral-50/60", loading && "opacity-60")}>
                      <td className="px-3 py-2.5 text-neutral-600">{when(r.sentAt)}</td>
                      <td className="px-3 py-2.5">
                        <p className="font-medium text-neutral-900 truncate">{r.recipientName}</p>
                        <p className="text-neutral-500 truncate">{r.to}</p>
                      </td>
                      <td className="px-3 py-2.5 text-neutral-700 truncate">{r.certificate}</td>
                      <td className="px-3 py-2.5 text-neutral-600">{r.kind === "reminder" ? "Reminder" : "Certificate"}</td>
                      <td className="px-3 py-2.5">
                        <span className={cn("inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium", s.className)} title={r.error || undefined}>
                          {s.label}
                        </span>
                        {r.error && <p className="text-[11px] text-red-600 mt-0.5 truncate" title={r.error}>{r.error}</p>}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-600">
                        {when(r.openedAt) || <span className="text-neutral-300">–</span>}
                        {r.openCount > 1 && <span className="text-neutral-400"> · {r.openCount}×</span>}
                      </td>
                      <td className="px-3 py-2.5 text-neutral-600">
                        {when(r.clickedAt) || <span className="text-neutral-300">–</span>}
                        {r.clickCount > 1 && <span className="text-neutral-400"> · {r.clickCount}×</span>}
                      </td>
                      <td className="px-3 py-2.5">
                        {r.downloadedAt ? (
                          <span className="text-emerald-700 font-medium">{r.downloadedAt === true ? "Yes" : when(r.downloadedAt)}</span>
                        ) : (
                          <span className="text-neutral-400">Not yet</span>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-3 py-2.5 border-t border-neutral-100 text-[12.5px] text-neutral-500">
          <span>{filtered ? `${n((page - 1) * pageSize + 1)}–${n(Math.min(page * pageSize, filtered))} of ${n(filtered)}` : "0 emails"}</span>
          <div className="flex items-center gap-1">
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page <= 1} onClick={() => setPage((p) => p - 1)} aria-label="Previous page">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="px-2">{page} / {pages}</span>
            <Button variant="outline" size="icon" className="h-8 w-8" disabled={page >= pages} onClick={() => setPage((p) => p + 1)} aria-label="Next page">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <BuyEmailsDialog open={buyOpen} onOpenChange={setBuyOpen} onBought={() => setReload((r) => r + 1)} />
    </div>
  )
}
