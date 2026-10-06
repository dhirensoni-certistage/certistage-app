"use client"

import { useEffect, useState } from "react"
import { AlertCircle, CalendarDays, Download, Loader2, Plus, RotateCcw, Search } from "lucide-react"
import { AdminHeader } from "@/components/admin/admin-header"
import { EventsMetrics } from "@/components/admin/events/events-metrics"
import { EventsTable } from "@/components/admin/events/events-table"
import { CreateEventDialog } from "@/components/admin/events/create-event-dialog"
import type { Pagination } from "@/components/admin/data-table"
import type { AdminEvent, EventsStats, EventSort } from "@/lib/admin-events"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { toast } from "sonner"

export default function EventsPage() {
  const [events, setEvents] = useState<AdminEvent[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [created, setCreated] = useState("all")
  const [sort, setSort] = useState<EventSort>("createdAt")
  const [direction, setDirection] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const [stats, setStats] = useState<EventsStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [statsError, setStatsError] = useState(false)
  const [refresh, setRefresh] = useState(0)
  const [createOpen, setCreateOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [statusAction, setStatusAction] = useState<{ ids: string[]; isActive: boolean } | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination(previous => ({ ...previous, page: 1 }))
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setLoading(true); setError(""); setSelected([])
      try {
        const params = new URLSearchParams({ page: String(pagination.page), limit: String(pagination.limit), search, status, created, sort, direction })
        const res = await fetch(`/api/admin/events?${params}`, { signal: controller.signal, cache: "no-store" })
        if (!res.ok) throw new Error("Events could not be loaded. Please try again.")
        const data = await res.json()
        if (controller.signal.aborted) return
        setEvents(data.events)
        setPagination(data.pagination)
      } catch (error) {
        if (!controller.signal.aborted) setError(error instanceof Error ? error.message : "Failed to load events")
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [pagination.page, pagination.limit, search, status, created, sort, direction, refresh])

  useEffect(() => {
    const controller = new AbortController()
    const load = async () => {
      setStatsLoading(true); setStatsError(false)
      try {
        const res = await fetch("/api/admin/events/stats", { signal: controller.signal, cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load event statistics")
        const data = await res.json()
        if (!controller.signal.aborted) setStats(data)
      } catch { if (!controller.signal.aborted) setStatsError(true) }
      finally { if (!controller.signal.aborted) setStatsLoading(false) }
    }
    load()
    return () => controller.abort()
  }, [refresh])

  const reset = () => {
    setSearchInput(""); setSearch(""); setStatus("all"); setCreated("all"); setSort("createdAt"); setDirection("desc")
    setPagination(previous => ({ ...previous, page: 1 }))
  }
  const changeSort = (key: EventSort) => {
    setDirection(sort === key && direction === "asc" ? "desc" : "asc")
    setSort(key); setPagination(previous => ({ ...previous, page: 1 }))
  }
  const exportEvents = async (ids?: string[]) => {
    if (exporting) return
    setExporting(true)
    try {
      const params = new URLSearchParams({ search, status, created, sort, direction })
      if (ids?.length) params.set("ids", ids.join(","))
      const res = await fetch(`/api/admin/export/events?${params}`)
      if (!res.ok) throw new Error("Export failed")
      const url = URL.createObjectURL(await res.blob())
      const link = document.createElement("a")
      link.href = url; link.download = `certistage-events-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link); link.click(); link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(ids?.length ? `${ids.length} event(s) exported` : "Events exported")
    } catch { toast.error("Failed to export events. Please try again.") }
    finally { setExporting(false) }
  }
  const updateStatus = async () => {
    if (!statusAction) return
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/events", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(statusAction) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to update events")
      toast.success(`${statusAction.ids.length} event(s) ${statusAction.isActive ? "activated" : "deactivated"}`)
      setStatusAction(null); setRefresh(previous => previous + 1)
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to update events") }
    finally { setUpdating(false) }
  }

  return <>
    <AdminHeader title="Events" compact />
    <div className="flex-1 px-4 pb-8 pt-1 sm:px-6">
      <div className="mx-auto max-w-[1600px] space-y-5">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div><h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">Events</h1><p className="mt-1 text-[13px] leading-relaxed text-neutral-500">Manage all events across all users. Create, view and manage event details, registrations and certificates.</p></div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <Button variant="outline" className="h-10 rounded-lg border-gold/35 bg-white px-4 text-gold-deep shadow-xs hover:border-gold/60 hover:bg-gold-soft/60 hover:text-gold-deep" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" />Create Event</Button>
            <Button variant="outline" disabled={exporting} className="h-10 rounded-lg border-neutral-200 bg-white px-4 text-[13px]" onClick={() => exportEvents()}>{exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}Export CSV</Button>
          </div>
        </div>
        <EventsMetrics stats={statsError ? null : stats} loading={statsLoading} />
        {statsError && <div role="alert" className="flex items-center justify-between gap-3 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-xs text-amber-800"><span>Event statistics could not be loaded.</span><Button variant="ghost" size="sm" onClick={() => setRefresh(previous => previous + 1)}>Retry</Button></div>}
        <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
          <div className="relative col-span-2 lg:flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><Input aria-label="Search events" placeholder="Search by event name or owner email..." value={searchInput} onChange={event => setSearchInput(event.target.value)} className="h-10 rounded-lg border-neutral-200 bg-white pl-10 text-[13px] shadow-xs" /></div>
          <Select value={status} onValueChange={value => { setStatus(value); setPagination(previous => ({ ...previous, page: 1 })) }}><SelectTrigger aria-label="Filter events by status" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-[13px] lg:w-[170px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
          <Select value={created} onValueChange={value => { setCreated(value); setPagination(previous => ({ ...previous, page: 1 })) }}><SelectTrigger aria-label="Filter events by created date" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-[13px] lg:w-[195px]"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /><SelectValue /></span></SelectTrigger><SelectContent><SelectItem value="all">Created Date</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="7days">Last 7 days</SelectItem><SelectItem value="30days">Last 30 days</SelectItem><SelectItem value="thisMonth">This month</SelectItem><SelectItem value="lastMonth">Last month</SelectItem></SelectContent></Select>
          <Button variant="outline" className="h-10 rounded-lg border-neutral-200 bg-white px-5 text-[13px]" onClick={reset}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
        </div>
        {error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700"><AlertCircle className="h-5 w-5" /><span className="flex-1">{error}</span><Button variant="outline" size="sm" onClick={() => setRefresh(previous => previous + 1)}>Retry</Button></div> : <EventsTable events={events} pagination={pagination} loading={loading} sort={sort} direction={direction} selected={selected} onSelectionChange={setSelected} onSort={changeSort} onPageChange={page => setPagination(previous => ({ ...previous, page }))} onExport={exportEvents} onStatusChange={(ids, isActive) => setStatusAction({ ids: [...ids], isActive })} onReset={reset} />}
      </div>
    </div>
    <CreateEventDialog open={createOpen} onOpenChange={setCreateOpen} onCreated={() => { reset(); setRefresh(previous => previous + 1) }} />
    <Dialog open={Boolean(statusAction)} onOpenChange={open => { if (!open && !updating) setStatusAction(null) }}><DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>{statusAction?.isActive ? "Activate" : "Deactivate"} {statusAction?.ids.length === 1 ? "event" : `${statusAction?.ids.length || 0} events`}?</DialogTitle><DialogDescription>{statusAction?.isActive ? "These events will appear in their owners' active event lists." : "These events will be hidden from their owners' active event lists. Their registrations and certificates remain stored."}</DialogDescription></DialogHeader><DialogFooter><Button variant="outline" disabled={updating} onClick={() => setStatusAction(null)}>Cancel</Button><Button disabled={updating} onClick={updateStatus}>{updating && <Loader2 className="h-4 w-4 animate-spin" />}{statusAction?.isActive ? "Activate" : "Deactivate"}</Button></DialogFooter></DialogContent></Dialog>
  </>
}
