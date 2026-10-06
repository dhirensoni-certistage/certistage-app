"use client"

import Link from "next/link"
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Download, Eye, MoreHorizontal, RefreshCw, SearchX, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Skeleton } from "@/components/ui/skeleton"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { Pagination } from "@/components/admin/data-table"
import { formatMoney, paymentStatusLabels, type PaymentStatus, type RevenuePayment, type RevenueSort } from "@/lib/admin-revenue"
import { cn } from "@/lib/utils"

export const paymentStatusStyles: Record<PaymentStatus, string> = { success: "bg-emerald-50 text-emerald-700", pending: "bg-amber-50 text-amber-700", failed: "bg-red-50 text-red-600", refunded: "bg-neutral-100 text-neutral-600" }

interface Props {
  payments: RevenuePayment[]
  pagination: Pagination
  loading: boolean
  selected: string[]
  onSelection: (ids: string[]) => void
  onPage: (page: number) => void
  onExport: (ids?: string[]) => void
  onDetails: (payment: RevenuePayment) => void
  onReconcile: (payment: RevenuePayment) => void
  gatewayConfigured: boolean
  sort: RevenueSort
  direction: "asc" | "desc"
  onSort: (sort: RevenueSort) => void
  onReset: () => void
}

export function PaymentsTable({ payments, pagination, loading, selected, onSelection, onPage, onExport, onDetails, onReconcile, gatewayConfigured, sort, direction, onSort, onReset }: Props) {
  const allSelected = payments.length > 0 && payments.every(payment => selected.includes(payment._id))
  const totalPages = Math.max(1, pagination.totalPages)
  const firstPage = Math.max(1, Math.min(pagination.page - 2, totalPages - 4))
  const pages = Array.from({ length: Math.min(5, totalPages) }, (_, index) => firstPage + index)
  const header = (label: string, key: RevenueSort) => <button className="inline-flex items-center gap-2 py-2 hover:text-neutral-900" onClick={() => onSort(key)}>{label}{sort === key ? direction === "asc" ? <ArrowUp className="h-3 w-3 text-gold-deep" /> : <ArrowDown className="h-3 w-3 text-gold-deep" /> : <ArrowUpDown className="h-3 w-3 text-neutral-400" />}</button>
  return <div className="space-y-4">
    {selected.length > 0 && <div className="flex flex-wrap items-center gap-3 rounded-lg border border-gold/25 bg-gold-soft/40 px-4 py-2.5"><span className="text-xs font-medium text-neutral-700">{selected.length} transaction{selected.length === 1 ? "" : "s"} selected</span><div className="flex-1" /><Button variant="outline" size="sm" className="bg-white" onClick={() => onExport(selected)}><Download className="h-3.5 w-3.5" />Export selected</Button><Button variant="ghost" size="sm" onClick={() => onSelection([])}>Clear selection</Button></div>}
    <div className="overflow-hidden rounded-lg border border-neutral-200 bg-white"><Table className="min-w-[900px] text-[13px]">
      <TableHeader><TableRow className="h-11 border-neutral-200 bg-neutral-50/70 hover:bg-neutral-50/70">
        <TableHead className="w-12 pl-4"><Checkbox checked={allSelected ? true : selected.length ? "indeterminate" : false} disabled={loading || !payments.length} onCheckedChange={() => onSelection(allSelected ? [] : payments.map(payment => payment._id))} aria-label="Select all transactions on this page" /></TableHead>
        <TableHead aria-sort={sort === "user.name" ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-xs font-medium text-neutral-500">{header("Customer", "user.name")}</TableHead><TableHead className="text-xs font-medium text-neutral-500">Purchase</TableHead>
        <TableHead aria-sort={sort === "amount" ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-xs font-medium text-neutral-500">{header("Amount", "amount")}</TableHead><TableHead aria-sort={sort === "status" ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-xs font-medium text-neutral-500">{header("Status", "status")}</TableHead>
        <TableHead aria-sort={sort === "createdAt" ? direction === "asc" ? "ascending" : "descending" : "none"} className="text-xs font-medium text-neutral-500">{header("Order Date", "createdAt")}</TableHead><TableHead className="w-20 text-center text-xs font-medium text-neutral-500">Actions</TableHead>
      </TableRow></TableHeader>
      <TableBody>{loading ? Array.from({ length: 5 }, (_, index) => <TableRow key={index} className="h-16 border-neutral-100">{Array.from({ length: 7 }, (_, cell) => <TableCell key={cell}><Skeleton className={cn("h-4", cell === 0 || cell === 6 ? "w-4" : "w-full max-w-32")} /></TableCell>)}</TableRow>) : !payments.length ? <TableRow><TableCell colSpan={7} className="h-52 text-center"><div className="flex flex-col items-center gap-2"><SearchX className="mb-1 h-7 w-7 text-neutral-300" /><p className="text-sm font-medium text-neutral-700">No transactions found</p><p className="text-xs text-neutral-400">Try another period, search or filter.</p><Button variant="outline" size="sm" className="mt-2" onClick={onReset}>Reset transaction filters</Button></div></TableCell></TableRow> : payments.map(payment => <TableRow key={payment._id} className="h-16 border-neutral-100 hover:bg-neutral-50/60" data-state={selected.includes(payment._id) ? "selected" : undefined}>
        <TableCell className="pl-4"><Checkbox checked={selected.includes(payment._id)} onCheckedChange={() => onSelection(selected.includes(payment._id) ? selected.filter(id => id !== payment._id) : [...selected, payment._id])} aria-label={`Select transaction ${payment.orderId}`} /></TableCell>
        <TableCell><div className="flex items-center gap-3"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[#f4ecde] text-xs font-medium text-gold-deep">{payment.user.name.charAt(0).toUpperCase()}</span><div className="min-w-0">{payment.user._id ? <Link href={`/admin/users/${payment.user._id}`} className="font-medium text-neutral-700 hover:text-gold-deep">{payment.user.name}</Link> : <span className="font-medium text-neutral-700">{payment.user.name}</span>}<p className="mt-0.5 text-[11px] text-neutral-400">{payment.user.email || "Account unavailable"}</p></div></div></TableCell>
        <TableCell><p className="font-medium text-neutral-700">{payment.itemName}</p><p className="mt-0.5 text-[10px] text-neutral-400">{payment.kind === "addon" ? "Add-on purchase" : "Plan purchase"}</p></TableCell>
        <TableCell><button className="font-medium tabular-nums text-neutral-800 hover:text-gold-deep" onClick={() => onDetails(payment)}>{formatMoney(payment.amountPaise, payment.currency)}</button>{payment.refundPaise > 0 && <p className="mt-0.5 text-[10px] text-amber-600">{formatMoney(payment.refundPaise, payment.currency)} refunded</p>}</TableCell>
        <TableCell><span className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium", paymentStatusStyles[payment.status])}><span className="h-1.5 w-1.5 rounded-full bg-current" />{paymentStatusLabels[payment.status]}</span></TableCell>
        <TableCell className="whitespace-nowrap"><p className="text-xs text-neutral-600">{new Date(payment.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Kolkata" })}</p><p className="mt-0.5 text-[10px] text-neutral-400">{new Date(payment.createdAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Kolkata" })} IST</p></TableCell>
        <TableCell className="text-center"><DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="icon" className="h-7 w-8 border-neutral-200 shadow-none" aria-label={`Actions for transaction ${payment.orderId}`}><MoreHorizontal className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent align="end"><DropdownMenuItem onClick={() => onDetails(payment)}><Eye className="mr-2 h-4 w-4" />View transaction</DropdownMenuItem>{payment.user._id && <DropdownMenuItem asChild><Link href={`/admin/users/${payment.user._id}`}><UserRound className="mr-2 h-4 w-4" />View customer</Link></DropdownMenuItem>}<DropdownMenuItem onClick={() => onExport([payment._id])}><Download className="mr-2 h-4 w-4" />Export transaction</DropdownMenuItem>{payment.status === "pending" && /^order_[A-Za-z0-9]+$/.test(payment.orderId) && <DropdownMenuItem disabled={!gatewayConfigured} onClick={() => onReconcile(payment)}><RefreshCw className="mr-2 h-4 w-4" />Reconcile payment</DropdownMenuItem>}</DropdownMenuContent></DropdownMenu></TableCell>
      </TableRow>)}</TableBody>
    </Table></div>
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-neutral-400" aria-live="polite">{loading ? "Loading transactions…" : `Showing ${pagination.total ? (pagination.page - 1) * pagination.limit + 1 : 0} to ${Math.min(pagination.page * pagination.limit, pagination.total)} of ${pagination.total} transactions`}</p><nav aria-label="Transaction pagination" className="flex flex-wrap items-center gap-2"><Button variant="outline" size="sm" className="h-8 bg-white text-xs" disabled={loading || pagination.page <= 1} onClick={() => onPage(pagination.page - 1)}><ChevronLeft className="h-3.5 w-3.5" />Previous</Button><span className="text-xs text-neutral-400">{pagination.page} / {totalPages}</span>{pages.map(page => <Button variant="outline" key={page} size="sm" disabled={loading} aria-current={page === pagination.page ? "page" : undefined} aria-label={`Go to transaction page ${page}`} onClick={() => onPage(page)} className={cn("h-8 w-8 bg-white px-0 text-xs", page === pagination.page && "border-gold text-gold-deep")}>{page}</Button>)}<Button variant="outline" size="sm" className="h-8 bg-white text-xs" disabled={loading || pagination.page >= totalPages} onClick={() => onPage(pagination.page + 1)}>Next<ChevronRight className="h-3.5 w-3.5" /></Button></nav></div>
  </div>
}
