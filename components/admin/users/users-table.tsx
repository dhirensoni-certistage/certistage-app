"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Copy, Download, ExternalLink, MoreHorizontal, SearchX } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { Pagination } from "@/components/admin/data-table"
import type { PlanConfig } from "@/lib/plan-config"

export interface DirectoryUser {
  _id: string
  name: string
  email: string
  plan: string
  isActive: boolean
  eventsCount: number
  createdAt: string
}

export type UserSort = "name" | "email" | "plan" | "isActive" | "eventsCount" | "createdAt"

interface Props {
  users: DirectoryUser[]
  plans: PlanConfig[]
  pagination: Pagination
  loading: boolean
  sort: UserSort
  direction: "asc" | "desc"
  selected: string[]
  onSelectionChange: (ids: string[]) => void
  onSort: (key: UserSort) => void
  onPageChange: (page: number) => void
  onExport: (ids?: string[]) => void
  onReset: () => void
}

const headers: { key: UserSort; label: string }[] = [
  { key: "name", label: "Name" }, { key: "email", label: "Email" },
  { key: "plan", label: "Plan" }, { key: "isActive", label: "Status" },
  { key: "eventsCount", label: "Events" }, { key: "createdAt", label: "Joined" },
]

export function UsersTable({ users, plans, pagination, loading, sort, direction, selected, onSelectionChange, onSort, onPageChange, onExport, onReset }: Props) {
  const allSelected = users.length > 0 && users.every(user => selected.includes(user._id))
  const totalPages = Math.max(1, pagination.totalPages)
  const firstPage = Math.max(1, Math.min(pagination.page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index)
  const toggleUser = (id: string) => onSelectionChange(selected.includes(id) ? selected.filter(value => value !== id) : [...selected, id])
  const copyEmail = async (email: string) => {
    try { await navigator.clipboard.writeText(email); toast.success("Email copied") }
    catch { toast.error("Unable to copy email") }
  }

  return (
    <div className="space-y-4">
      {selected.length > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold/25 bg-gold-soft/50 px-4 py-2.5">
          <span className="text-sm font-medium text-neutral-700">{selected.length} user{selected.length === 1 ? "" : "s"} selected</span>
          <div className="flex-1" />
          <Button variant="outline" size="sm" className="bg-white" onClick={() => onExport(selected)}><Download className="h-3.5 w-3.5" />Export selected</Button>
          <Button variant="ghost" size="sm" onClick={() => onSelectionChange([])}>Clear selection</Button>
        </div>
      )}
      <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white">
        <Table className="min-w-[950px] text-[13px]">
          <TableHeader>
            <TableRow className="h-[52px] border-neutral-200 bg-neutral-50/80 hover:bg-neutral-50/80">
              <TableHead className="w-12 pl-4"><Checkbox aria-label="Select all users on this page" disabled={loading || users.length === 0} checked={allSelected ? true : selected.length ? "indeterminate" : false} onCheckedChange={() => onSelectionChange(allSelected ? [] : users.map(user => user._id))} /></TableHead>
              <TableHead className="w-12 text-xs font-medium text-neutral-500">#</TableHead>
              {headers.map(({ key, label }) => (
                <TableHead key={key} aria-sort={sort === key ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-xs font-medium text-neutral-500">
                  <button className="inline-flex items-center gap-2 rounded py-2 transition-colors hover:text-neutral-950 focus-visible:outline-2 focus-visible:outline-gold" onClick={() => onSort(key)}>
                    {label}{sort === key ? direction === "asc" ? <ArrowUp className="h-3 w-3 text-gold-deep" /> : <ArrowDown className="h-3 w-3 text-gold-deep" /> : <ArrowUpDown className="h-3 w-3 text-neutral-400" />}
                  </button>
                </TableHead>
              ))}
              <TableHead className="w-[90px] text-center text-xs font-medium text-neutral-500">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? Array.from({ length: 10 }, (_, index) => (
              <TableRow key={index} className="h-[47px] border-neutral-100">
                {Array.from({ length: 9 }, (_, cell) => <TableCell key={cell} className={cell === 0 ? "pl-4" : ""}><Skeleton className={cn("h-4", cell < 2 || cell === 8 ? "w-4" : "w-full max-w-36")} /></TableCell>)}
              </TableRow>
            )) : users.length === 0 ? (
              <TableRow><TableCell colSpan={9} className="h-72 text-center">
                <div className="mx-auto flex max-w-xs flex-col items-center"><div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100"><SearchX className="h-5 w-5 text-neutral-400" /></div><p className="font-medium text-neutral-900">No users found</p><p className="mt-1 text-xs text-neutral-500">Try a different search or reset your filters.</p><Button variant="outline" size="sm" className="mt-4" onClick={onReset}>Reset filters</Button></div>
              </TableCell></TableRow>
            ) : users.map((user, index) => {
              const paid = !["free", "test"].includes(user.plan)
              const planName = plans.find(plan => plan.id === user.plan)?.name || user.plan
              return (
                <TableRow key={user._id} data-state={selected.includes(user._id) ? "selected" : undefined} className="h-[47px] border-neutral-100 transition-colors hover:bg-neutral-50/70 data-[state=selected]:bg-gold-soft/40">
                  <TableCell className="pl-4"><Checkbox aria-label={`Select ${user.name}`} checked={selected.includes(user._id)} onCheckedChange={() => toggleUser(user._id)} /></TableCell>
                  <TableCell className="tabular-nums text-neutral-600">{(pagination.page - 1) * pagination.limit + index + 1}</TableCell>
                  <TableCell><Link href={`/admin/users/${user._id}`} className="group inline-flex items-center gap-3 whitespace-nowrap"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4ecde] text-xs font-medium text-[#926416]">{(user.name || user.email).charAt(0).toUpperCase()}</span><span className="font-medium text-neutral-800 group-hover:text-gold-deep">{user.name || "Unnamed user"}</span></Link></TableCell>
                  <TableCell className="text-neutral-600">{user.email}</TableCell>
                  <TableCell><span className={cn("inline-flex rounded-full px-2.5 py-1 text-[11px] font-medium leading-none", paid ? "bg-amber-50 text-amber-700" : "bg-neutral-100 text-neutral-600")}>{planName}</span></TableCell>
                  <TableCell><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium leading-none", user.isActive ? "bg-emerald-50 text-emerald-700" : "bg-neutral-100 text-neutral-500")}><span className={cn("h-1.5 w-1.5 rounded-full", user.isActive ? "bg-emerald-600" : "bg-neutral-400")} />{user.isActive ? "Active" : "Inactive"}</span></TableCell>
                  <TableCell><Link href={`/admin/users/${user._id}`} aria-label={`View ${user.eventsCount} events for ${user.name}`} className={cn("tabular-nums hover:underline", user.eventsCount > 0 ? "text-teal-700" : "text-neutral-500")}>{user.eventsCount}</Link></TableCell>
                  <TableCell className="whitespace-nowrap text-neutral-600">{user.createdAt ? new Date(user.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" }) : "—"}</TableCell>
                  <TableCell className="text-center">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-7 w-8 rounded-md border-neutral-200 shadow-none" aria-label={`Actions for ${user.name}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem asChild><Link href={`/admin/users/${user._id}`}><ExternalLink className="mr-2 h-4 w-4" />View / manage user</Link></DropdownMenuItem>
                        <DropdownMenuItem onClick={() => copyEmail(user.email)}><Copy className="mr-2 h-4 w-4" />Copy email</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onExport([user._id])}><Download className="mr-2 h-4 w-4" />Export user</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[13px] text-neutral-500" aria-live="polite">{loading ? "Loading users…" : `Showing ${pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} results`}</p>
        <nav aria-label="Users pagination" className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="sm" className="h-9 bg-white text-xs" disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)}><ChevronLeft className="h-3.5 w-3.5" />Previous</Button>
          <span className="mx-1 text-xs text-neutral-500">Page {pagination.page} of {totalPages}</span>
          {pages.map(page => <Button key={page} variant="outline" size="sm" aria-label={`Go to page ${page}`} aria-current={page === pagination.page ? "page" : undefined} disabled={loading} onClick={() => onPageChange(page)} className={cn("h-9 w-9 bg-white px-0 text-xs", page === pagination.page && "border-gold text-gold-deep bg-gold-soft/40")}>{page}</Button>)}
          <Button variant="outline" size="sm" className="h-9 bg-white text-xs" disabled={loading || pagination.page >= totalPages} onClick={() => onPageChange(pagination.page + 1)}>Next<ChevronRight className="h-3.5 w-3.5" /></Button>
        </nav>
      </div>
    </div>
  )
}
