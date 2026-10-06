"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { AlertCircle, ArrowRight, CalendarDays, Clock3, Download, Loader2, RefreshCw, RotateCcw, Search, ShieldCheck } from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { RevenueMetrics, RevenueCharts } from "@/components/admin/revenue/revenue-overview"
import { PaymentsTable } from "@/components/admin/revenue/payments-table"
import { PaymentDetails } from "@/components/admin/revenue/payment-details"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import type { Pagination } from "@/components/admin/data-table"
import { formatMoney, type RevenuePayment, type RevenueSort, type RevenueSummary } from "@/lib/admin-revenue"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const goldButton = "border-gold/35 bg-white text-gold-deep hover:border-gold/60 hover:bg-gold-soft/60 hover:text-gold-deep"
const ranges = [{ id: "all", label: "All time" }, { id: "30days", label: "Last 30 days" }, { id: "thisMonth", label: "This month" }, { id: "lastMonth", label: "Last month" }, { id: "90days", label: "Last 90 days" }, { id: "thisYear", label: "This year" }, { id: "custom", label: "Custom dates" }]

export default function RevenuePage() {
  const [summary, setSummary] = useState<RevenueSummary | null>(null)
  const [payments, setPayments] = useState<RevenuePayment[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [summaryLoading, setSummaryLoading] = useState(true)
  const [loading, setLoading] = useState(true)
  const [summaryError, setSummaryError] = useState("")
  const [error, setError] = useState("")
  const [range, setRange] = useState("all")
  const [dates, setDates] = useState({ from: "", to: "" })
  const [customOpen, setCustomOpen] = useState(false)
  const [draftDates, setDraftDates] = useState({ from: "", to: "" })
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [plan, setPlan] = useState("all")
  const [kind, setKind] = useState("all")
  const [sort, setSort] = useState<RevenueSort>("createdAt")
  const [direction, setDirection] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<string[]>([])
  const [details, setDetails] = useState<RevenuePayment | null>(null)
  const [refresh, setRefresh] = useState(0)
  const [exporting, setExporting] = useState(false)
  const [reconcile, setReconcile] = useState<"all" | RevenuePayment | null>(null)
  const [syncing, setSyncing] = useState(false)
  const periodQuery = new URLSearchParams({ range, ...(range === "custom" ? dates : {}) }).toString()

  const firstPage = () => setPagination(previous => ({ ...previous, page: 1 }))
  useEffect(() => {
    const timeout = setTimeout(() => { setSearch(searchInput.trim()); setPagination(previous => ({ ...previous, page: 1 })) }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setSummaryLoading(true); setSummaryError("")
      try {
        const res = await fetch(`/api/admin/revenue/summary?${periodQuery}`, { signal: controller.signal, cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Unable to load revenue overview")
        if (!controller.signal.aborted) setSummary(data)
      } catch (error) { if (!controller.signal.aborted) setSummaryError(error instanceof Error ? error.message : "Unable to load overview") }
      finally { if (!controller.signal.aborted) setSummaryLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [periodQuery, refresh])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true); setError(""); setSelected([])
      try {
        const params = new URLSearchParams(periodQuery)
        Object.entries({ page: String(pagination.page), limit: String(pagination.limit), search, status, plan, kind, sort, direction }).forEach(([key, value]) => params.set(key, value))
        const res = await fetch(`/api/admin/revenue?${params}`, { signal: controller.signal, cache: "no-store" })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Unable to load transactions")
        if (controller.signal.aborted) return
        setPayments(data.payments); setPagination(data.pagination)
      } catch (error) { if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Unable to load transactions") }
      finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [periodQuery, pagination.page, pagination.limit, search, status, plan, kind, sort, direction, refresh])

  const reset = () => { setSearchInput(""); setSearch(""); setStatus("all"); setPlan("all"); setKind("all"); setSort("createdAt"); setDirection("desc"); firstPage() }
  const exportPayments = async (ids?: string[]) => {
    if (exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams(periodQuery)
      Object.entries({ search, status, plan, kind, sort, direction }).forEach(([key, value]) => params.set(key, value))
      if (ids?.length) params.set("ids", ids.join(","))
      const res = await fetch(`/api/admin/export/payments?${params}`)
      if (!res.ok) throw new Error("Export failed")
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement("a")
      link.href = url; link.download = `certistage-payments-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(ids?.length ? `${ids.length} transaction(s) exported` : "Transactions exported")
    } catch { toast.error("Unable to export transactions. Please try again.") }
    finally { setExporting(false) }
  }
  const reconcilePayments = async () => {
    if (!reconcile || syncing) return
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/payments/sync", reconcile === "all" ? { method: "PUT" } : { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paymentId: reconcile._id }) })
      const result = await res.json()
      if (!res.ok) throw new Error(result.error || "Reconciliation failed")
      if (reconcile === "all") {
        const counts = result.results
        if (counts.errors) toast.warning(`Checked ${counts.total} orders: ${counts.success} captured, ${counts.stillPending} pending, ${counts.errors} require review`)
        else toast.success(`Checked ${counts.total} orders: ${counts.success} captured, ${counts.stillPending} still pending`)
      } else if (result.synced) toast.success("Payment reconciled successfully")
      else toast.info(result.message || "Payment is still awaiting capture")
      setReconcile(null); setRefresh(previous => previous + 1)
    } catch (error) { toast.error(error instanceof Error ? error.message : "Reconciliation failed") }
    finally { setSyncing(false) }
  }
  const applyCustom = (event: React.FormEvent) => {
    event.preventDefault()
    const today = new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10)
    if (!draftDates.from || !draftDates.to || draftDates.from > draftDates.to || draftDates.from > today) { toast.error("Select a valid start and end date"); return }
    setDates(draftDates); setRange("custom"); setCustomOpen(false); firstPage()
  }
  const totals = summary?.totals
  const statusOptions: { id: string; label: string; count: number }[] = [{ id: "all", label: "All", count: (totals?.capturedCount || 0) + (totals?.pendingCount || 0) + (totals?.failedCount || 0) }, { id: "success", label: "Paid", count: (totals?.capturedCount || 0) - (totals?.refundedCount || 0) }, { id: "pending", label: "Pending", count: totals?.pendingCount || 0 }, { id: "failed", label: "Failed", count: totals?.failedCount || 0 }, { id: "refunded", label: "Refunded", count: totals?.refundedCount || 0 }]

  return <>
    <AdminHeader title="Revenue" compact />
    <div className="flex-1 px-4 pb-8 pt-1 sm:px-6"><div className="mx-auto max-w-[1600px] space-y-5">
      <div className="flex flex-col justify-between gap-4 xl:flex-row xl:items-end"><div><h1 className="text-[28px] font-semibold leading-tight tracking-tight text-neutral-950">Revenue & Billing</h1><p className="mt-1.5 text-[13px] text-neutral-500">Track collections, monitor payment health and manage customer purchases.</p></div><div className="flex flex-wrap items-center gap-2.5">
        <Select value={range} onValueChange={value => { if (value === "custom") { setDraftDates(dates); setCustomOpen(true) } else { setRange(value); firstPage() } }}><SelectTrigger aria-label="Revenue period" className="h-10 w-[175px] rounded-lg border-neutral-200 bg-white text-xs"><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-neutral-500" /><SelectValue /></span></SelectTrigger><SelectContent>{ranges.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select>
        <Button variant="outline" className={cn("h-10 rounded-lg text-xs", goldButton)} disabled={!summary?.gatewayConfigured || !summary.pendingAllCount || syncing} title={!summary?.gatewayConfigured ? "Connect Razorpay in Settings to enable reconciliation" : "Check pending orders against Razorpay"} onClick={() => setReconcile("all")}><RefreshCw className="h-3.5 w-3.5" />Reconcile pending</Button>
        <Button variant="outline" className="h-10 rounded-lg border-neutral-200 bg-white text-xs" disabled={exporting} onClick={() => exportPayments()}>{exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}Export CSV</Button>
        <Button variant="outline" size="icon" className="h-10 w-10 rounded-lg border-neutral-200 bg-white" aria-label="Refresh revenue" onClick={() => setRefresh(previous => previous + 1)} disabled={summaryLoading || loading || syncing}><RefreshCw className={cn("h-3.5 w-3.5 text-neutral-500", (summaryLoading || loading) && "animate-spin")} /></Button>
      </div></div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] text-neutral-400"><p>{range === "custom" ? `${dates.from} – ${dates.to} · ` : ""}Overview uses payment order dates · INR collections · refunds attributed to original orders</p>{summary && <span>Updated {new Date(summary.asOf).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</span>}</div>
      {summaryError && <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700"><AlertCircle className="h-4 w-4" /><span className="flex-1">{summaryError}</span><Button variant="ghost" size="sm" onClick={() => setRefresh(previous => previous + 1)}>Retry</Button></div>}
      <RevenueMetrics summary={summaryError ? null : summary} loading={summaryLoading} />
      {summary && !summaryError && <div className="flex flex-col justify-between gap-3 rounded-lg border border-amber-200/60 bg-[#fffcf5] px-4 py-3 sm:flex-row sm:items-center"><div className="flex items-center gap-3"><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-100/60"><Clock3 className="h-4 w-4 text-amber-700" /></div><div><p className="text-xs font-medium text-neutral-700">{summary.pendingAllCount ? `${summary.pendingAllCount} pending order${summary.pendingAllCount === 1 ? "" : "s"} need follow-up` : "Your payment queue is clear"}</p><p className="mt-0.5 text-[10px] text-neutral-400">{summary.pendingAllCount ? "Across all dates. Check the gateway before following up with customers." : "No orders are awaiting payment confirmation."}</p></div></div><div className="flex items-center gap-4"><span className={cn("inline-flex items-center gap-1 text-[10px]", summary.gatewayConfigured ? "text-emerald-600" : "text-neutral-400")}><ShieldCheck className="h-3.5 w-3.5" />{summary.gatewayConfigured ? "Razorpay configured" : <Link href="/admin/settings" className="hover:text-gold-deep hover:underline">Connect Razorpay</Link>}</span>{summary.pendingAllCount > 0 && <Button variant="ghost" size="sm" className="h-7 text-xs text-gold-deep hover:bg-gold-soft" onClick={() => { setRange("all"); setStatus("pending"); setPlan("all"); setKind("all"); setSearchInput(""); setSearch(""); firstPage() }}>View pending<ArrowRight className="h-3 w-3" /></Button>}</div></div>}
      <RevenueCharts summary={summaryError ? null : summary} loading={summaryLoading} />
      <section className="space-y-4" aria-label="Transactions"><div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-base font-semibold text-neutral-900">Transactions <span className="ml-1 rounded-md bg-neutral-100 px-2 py-0.5 text-[11px] font-medium text-neutral-500">{pagination.total}</span></h2><p className="mt-1 text-[11px] text-neutral-400">Individual orders for the selected period. Filters below apply to the table and CSV export.</p></div></div>
        <div className="flex flex-wrap gap-1.5" aria-label="Payment status shortcuts">{statusOptions.map(item => <button key={item.id} onClick={() => { setStatus(item.id); firstPage() }} aria-pressed={status === item.id} className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] transition-colors", status === item.id ? "border-gold/30 bg-gold-soft/70 font-medium text-gold-deep" : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300")}><span>{item.label}</span><span className="rounded px-1 text-[10px] tabular-nums opacity-70">{summaryLoading ? "…" : item.count}</span></button>)}</div>
        <div className="grid grid-cols-2 gap-3 xl:flex xl:items-center"><div className="relative col-span-2 xl:flex-1"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><Input value={searchInput} onChange={event => setSearchInput(event.target.value)} aria-label="Search transactions" placeholder="Search customer, email, order or payment ID..." className="h-10 rounded-lg border-neutral-200 bg-white pl-10 text-xs" /></div>
          <Select value={plan} onValueChange={value => { setPlan(value); firstPage() }}><SelectTrigger aria-label="Filter transactions by plan" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-xs xl:w-[180px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Plans</SelectItem>{summary?.plans.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>
          <Select value={kind} onValueChange={value => { setKind(value); firstPage() }}><SelectTrigger aria-label="Filter transactions by type" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-xs xl:w-[160px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Purchases</SelectItem><SelectItem value="plan">Plans</SelectItem><SelectItem value="addon">Add-ons</SelectItem></SelectContent></Select>
          <Button variant="outline" className="col-span-2 h-10 rounded-lg border-neutral-200 bg-white text-xs xl:w-[105px]" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
        </div>
        {error ? <div role="alert" className="flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-xs text-red-700"><AlertCircle className="h-4 w-4" /><span className="flex-1">{error}</span><Button variant="outline" size="sm" onClick={() => setRefresh(previous => previous + 1)}>Retry</Button></div> : <PaymentsTable payments={payments} pagination={pagination} loading={loading} selected={selected} onSelection={setSelected} onPage={page => setPagination(previous => ({ ...previous, page }))} onExport={exportPayments} onDetails={setDetails} onReconcile={setReconcile} gatewayConfigured={Boolean(summary?.gatewayConfigured)} sort={sort} direction={direction} onSort={key => { setDirection(sort === key && direction === "asc" ? "desc" : "asc"); setSort(key); firstPage() }} onReset={reset} />}
      </section>
    </div></div>
    <PaymentDetails payment={details} onClose={() => setDetails(null)} />
    <Dialog open={customOpen} onOpenChange={setCustomOpen}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Choose reporting dates</DialogTitle><DialogDescription>Dates use Indian Standard Time. The end date is included.</DialogDescription></DialogHeader><form onSubmit={applyCustom} className="space-y-5"><div className="grid grid-cols-2 gap-4"><div className="space-y-2"><Label htmlFor="revenue-from">From</Label><Input id="revenue-from" type="date" value={draftDates.from} onChange={event => setDraftDates(previous => ({ ...previous, from: event.target.value }))} required /></div><div className="space-y-2"><Label htmlFor="revenue-to">To</Label><Input id="revenue-to" type="date" value={draftDates.to} onChange={event => setDraftDates(previous => ({ ...previous, to: event.target.value }))} min={draftDates.from} required /></div></div><DialogFooter><Button type="button" variant="outline" onClick={() => setCustomOpen(false)}>Cancel</Button><Button type="submit" variant="outline" className={goldButton}>Apply dates</Button></DialogFooter></form></DialogContent></Dialog>
    <Dialog open={Boolean(reconcile)} onOpenChange={open => { if (!open && !syncing) setReconcile(null) }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Reconcile {reconcile === "all" ? "pending orders" : "payment"}?</DialogTitle><DialogDescription>{reconcile === "all" ? "Checks up to 50 oldest pending Razorpay orders across all dates. Confirmed captures update payment status and customer entitlements where applicable." : "Checks this order against Razorpay. A confirmed capture updates its payment status and customer entitlements where applicable."}</DialogDescription></DialogHeader>{reconcile && reconcile !== "all" && <div className="rounded-lg border border-neutral-200 bg-neutral-50 p-3 text-xs"><p className="font-medium">{reconcile.user.name} · {formatMoney(reconcile.amountPaise, reconcile.currency)}</p><p className="mt-1 break-all font-mono text-neutral-400">{reconcile.orderId}</p></div>}<DialogFooter><Button variant="outline" disabled={syncing} onClick={() => setReconcile(null)}>Cancel</Button><Button variant="outline" className={goldButton} disabled={syncing} onClick={reconcilePayments}>{syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}{syncing ? "Reconciling…" : "Reconcile"}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
