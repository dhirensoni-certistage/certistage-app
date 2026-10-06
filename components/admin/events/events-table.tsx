"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, ExternalLink, MoreHorizontal, SearchX, ToggleLeft, ToggleRight, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import type { Pagination } from "@/components/admin/data-table"
import type { AdminEvent, EventSort } from "@/lib/admin-events"

interface Props {
  events: AdminEvent[]
  pagination: Pagination
  loading: boolean
  sort: EventSort
  direction: "asc" | "desc"
  selected: string[]
  onSelectionChange: (ids: string[]) => void
  onSort: (key: EventSort) => void
  onPageChange: (page: number) => void
  onExport: (ids?: string[]) => void
  onStatusChange: (ids: string[], isActive: boolean) => void
  onReset: () => void
}

const headers: { key: EventSort; label: string }[] = [
  { key: "name", label: "Event Name" }, { key: "owner.name", label: "Owner" },
  { key: "certificateTypesCount", label: "Cert Types" }, { key: "recipientsCount", label: "Registrations" },
  { key: "isActive", label: "Status" }, { key: "createdAt", label: "Created" },
]

export function EventsTable({ events, pagination, loading, sort, direction, selected, onSelectionChange, onSort, onPageChange, onExport, onStatusChange, onReset }: Props) {
  const allSelected = events.length > 0 && events.every(event => selected.includes(event._id))
  const totalPages = Math.max(1, pagination.totalPages)
  const firstPage = Math.max(1, Math.min(pagination.page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index)
  return <div className="space-y-4">
    {selected.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold/25 bg-gold-soft/50 px-4 py-2.5">
      <span className="text-sm font-medium text-neutral-700">{selected.length} event{selected.length === 1 ? "" : "s"} selected</span><div className="flex-1" />
      <Button variant="outline" size="sm" className="bg-white" onClick={() => onExport(selected)}><Download className="h-3.5 w-3.5" />Export selected</Button>
      <Button variant="outline" size="sm" className="bg-white" onClick={() => onStatusChange(selected, true)}><ToggleRight className="h-3.5 w-3.5" />Activate</Button>
      <Button variant="outline" size="sm" className="bg-white" onClick={() => onStatusChange(selected, false)}><ToggleLeft className="h-3.5 w-3.5" />Deactivate</Button>
      <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>Clear selection</Button>
    </div>}
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
      <Table className="min-w-[1000px] text-[13px]">
        <TableHeader><TableRow className="h-[48px] border-neutral-200 bg-neutral-50/80 hover:bg-neutral-50/80">
          <TableHead className="w-12 pl-4"><Checkbox aria-label="Select all events on this page" disabled={loading || events.length === 0} checked={allSelected ? true : selected.length ? "indeterminate" : false} onCheckedChange={() => onSelectionChange(allSelected ? [] : events.map(event => event._id))} /></TableHead>
          <TableHead className="w-12 text-[11px] font-medium text-neutral-500">#</TableHead>
          {headers.map(({ key, label }) => <TableHead key={key} aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-[10px] font-medium uppercase tracking-wide text-neutral-500">
            <button className="inline-flex items-center gap-1.5 rounded py-2 uppercase transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-gold" onClick={() => onSort(key)}>{label}{sort === key ? direction === "asc" ? <ArrowUp className="h-3 w-3 text-gold-deep" /> : <ArrowDown className="h-3 w-3 text-gold-deep" /> : <ArrowUpDown className="h-3 w-3 text-neutral-400" />}</button>
          </TableHead>)}
          <TableHead className="w-[90px] text-center text-[10px] font-medium uppercase tracking-wide text-neutral-500">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {loading ? Array.from({ length: 10 }, (_, index) => <TableRow key={index} className="h-[48px] border-neutral-100">{Array.from({ length: 9 }, (_, cell) => <TableCell key={cell} className={cell === 0 ? "pl-4" : ""}><Skeleton className={cn("h-4", cell < 2 || cell === 8 ? "w-4" : "w-full max-w-36")} /></TableCell>)}</TableRow>) : events.length === 0 ? <TableRow><TableCell colSpan={9} className="h-72 text-center"><div className="mx-auto flex max-w-xs flex-col items-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100"><SearchX className="h-5 w-5 text-neutral-400" /></div><p className="font-medium text-neutral-900">No events found</p><p className="mt-1 text-xs text-neutral-500">Try a different search or reset your filters.</p><Button variant="outline" size="sm" className="mt-4" onClick={onReset}>Reset filters</Button></div></TableCell></TableRow> : events.map((event, index) => <TableRow key={event._id} data-state={selected.includes(event._id) ? "selected" : undefined} className="h-[48px] border-neutral-100 transition-colors hover:bg-neutral-50/70 data-[state=selected]:bg-gold-soft/40">
            <TableCell className="pl-4"><Checkbox aria-label={`Select ${event.name}`} checked={selected.includes(event._id)} onCheckedChange={() => onSelectionChange(selected.includes(event._id) ? selected.filter(id => id !== event._id) : [...selected, event._id])} /></TableCell>
            <TableCell className="tabular-nums text-neutral-600">{(pagination.page - 1) * pagination.limit + index + 1}</TableCell>
            <TableCell><Link href={`/admin/events/${event._id}`} className="font-medium text-neutral-800 hover:text-gold-deep">{event.name}</Link></TableCell>
            <TableCell>{event.owner?._id ? <Link href={`/admin/users/${event.owner._id}`} className="group block"><span className="block font-medium text-neutral-700 group-hover:text-gold-deep">{event.owner.name || "Unnamed user"}</span><span className="block text-xs text-neutral-400">{event.owner.email}</span></Link> : <span className="text-neutral-400">Unknown owner</span>}</TableCell>
            <TableCell className="tabular-nums text-neutral-700"><Link href={`/admin/events/${event._id}`} className="hover:text-gold-deep hover:underline">{event.certificateTypesCount}</Link></TableCell>
            <TableCell className="tabular-nums text-neutral-700">{event.recipientsCount.toLocaleString("en-IN")}</TableCell>
            <TableCell><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none", event.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}><span className={cn("h-1.5 w-1.5 rounded-full", event.isActive ? "bg-emerald-600" : "bg-neutral-400")} />{event.isActive ? "Active" : "Inactive"}</span></TableCell>
            <TableCell className="whitespace-nowrap text-neutral-600">{event.createdAt ? new Date(event.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—"}</TableCell>
            <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-7 w-8 rounded-md border-neutral-200 shadow-none" aria-label={`Actions for ${event.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end" className="w-44">
              <DropdownMenuItem asChild><Link href={`/admin/events/${event._id}`}><ExternalLink className="mr-2 h-4 w-4" />View event</Link></DropdownMenuItem>
              {event.owner?._id && <DropdownMenuItem asChild><Link href={`/admin/users/${event.owner._id}`}><UserRound className="mr-2 h-4 w-4" />View owner</Link></DropdownMenuItem>}
              <DropdownMenuItem onClick={() => onExport([event._id])}><Download className="mr-2 h-4 w-4" />Export event</DropdownMenuItem>
              <DropdownMenuSeparator /><DropdownMenuItem onClick={() => onStatusChange([event._id], !event.isActive)}>{event.isActive ? <ToggleLeft className="mr-2 h-4 w-4" /> : <ToggleRight className="mr-2 h-4 w-4" />}{event.isActive ? "Deactivate event" : "Activate event"}</DropdownMenuItem>
            </DropdownMenuContent></DropdownMenu></TableCell>
          </TableRow>)}
        </TableBody>
      </Table>
    </div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[13px] text-neutral-500" aria-live="polite">{loading ? "Loading events…" : `Showing ${pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} results`}</p>
      <nav aria-label="Events pagination" className="flex flex-wrap items-center gap-2">
        <Button variant="outline" size="sm" className="h-9 bg-white text-xs" disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}><ChevronLeft className="h-3.5 w-3.5" />Previous</Button><span className="mx-1 text-xs text-neutral-500">Page {pagination.page} of {totalPages}</span>
        {pages.map(page => <Button key={page} variant="outline" size="sm" aria-label={`Go to page ${page}`} aria-current={page === pagination.page ? "page" : undefined} disabled={loading} onClick={() => onPageChange(page)} className={cn("h-9 w-9 bg-white px-0 text-xs", page === pagination.page && "border-gold text-gold-deep bg-gold-soft/40")}>{page}</Button>)}
        <Button variant="outline" size="sm" className="h-9 bg-white text-xs" disabled={loading || pagination.page >= totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next<ChevronRight className="h-3.5 w-3.5" /></Button>
      </nav>
    </div>
  </div>
}
