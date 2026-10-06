"use client"

import { ArrowDownRight, ArrowUpRight, Clock3, ReceiptText, Wallet, CheckCircle2 } from "lucide-react"
import { BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer, type TooltipProps } from "recharts"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { formatMoney, type RevenueSummary } from "@/lib/admin-revenue"

function CollectionTooltip({ active, payload, label }: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null
  return <div className="rounded-lg border border-neutral-200 bg-white p-3 shadow-sm"><p className="mb-2 text-xs text-neutral-500">{label}</p>{payload.map(item => <p key={item.dataKey} className="flex items-center justify-between gap-6 text-xs"><span>{item.name}</span><span className="font-medium">{formatMoney(Number(item.value || 0))}</span></p>)}</div>
}

export function RevenueMetrics({ summary, loading }: { summary: RevenueSummary | null; loading: boolean }) {
  const totals = summary?.totals
  const cards = [
    { title: "Net Collections", icon: Wallet, value: totals ? formatMoney(totals.netPaise) : "—", sub: "After recorded refunds · before fees", color: "text-gold-deep" },
    { title: "Captured Payments", icon: ReceiptText, value: totals?.capturedCount.toLocaleString("en-IN") || "—", sub: totals ? `${totals.payingCustomers} paying customers` : "Customers with completed payments", color: "text-gold-deep" },
    { title: "Pending Payments", icon: Clock3, value: totals?.pendingCount.toLocaleString("en-IN") || "—", sub: totals ? `${formatMoney(totals.pendingPaise)} awaiting payment` : "Awaiting confirmation", color: "text-amber-600" },
    { title: "Payment Success Rate", icon: CheckCircle2, value: totals?.successRate !== null && totals?.successRate !== undefined ? `${totals.successRate}%` : "—", sub: "Captured / resolved orders · excludes pending", color: "text-emerald-600" },
  ]
  return <div className="space-y-3">
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">{cards.map(({ title, icon: Icon, value, sub, color }, index) => <div key={title} className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="flex items-center justify-between gap-2"><p className="text-xs font-medium text-neutral-500">{title}</p><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gold-soft/70"><Icon className={cn("h-4 w-4", color)} strokeWidth={1.75} /></span></div>
      {loading ? <div className="mt-3 space-y-3"><Skeleton className="h-8 w-28" /><Skeleton className="h-3 w-40" /></div> : <><p className="mt-2 text-[27px] font-semibold leading-tight tracking-tight text-neutral-950">{value}</p><p className="mt-2 text-[10px] leading-relaxed text-neutral-400">{sub}</p>{index === 0 && totals?.netChange !== null && totals?.netChange !== undefined && <span className={cn("mt-2 inline-flex items-center gap-1 text-[11px] font-medium", totals.netChange >= 0 ? "text-emerald-600" : "text-red-600")}>{totals.netChange >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}{totals.netChange > 0 ? "+" : ""}{totals.netChange}% vs previous equal-length period</span>}</>}
    </div>)}</div>
    <div className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-lg border border-neutral-200/80 bg-white px-5 py-3.5 md:grid-cols-4">{[
      ["Gross collections", totals ? formatMoney(totals.grossPaise) : "—"], ["Recorded refunds", totals ? formatMoney(totals.refundPaise) : "—"], ["Average captured payment", totals ? formatMoney(totals.averagePaise) : "—"], ["Refunded orders", totals?.refundedCount.toLocaleString("en-IN") || "—"],
    ].map(([label, value]) => <div key={label}><p className="text-[10px] text-neutral-400">{label}</p>{loading ? <Skeleton className="mt-1 h-4 w-20" /> : <p className="mt-1 text-[13px] font-medium tabular-nums text-neutral-700">{value}</p>}</div>)}</div>
  </div>
}

export function RevenueCharts({ summary, loading }: { summary: RevenueSummary | null; loading: boolean }) {
  const chartData = (summary?.series || []).map(item => ({ ...item, label: new Date(item.date + (item.date.length === 7 ? "-01" : "") + "T12:00:00+05:30").toLocaleDateString("en-IN", item.date.length === 7 ? { month: "short", year: "2-digit", timeZone: "Asia/Kolkata" } : { day: "numeric", month: "short", timeZone: "Asia/Kolkata" }) }))
  const hasCollections = chartData.some(item => item.grossPaise > 0)
  const breakdown = summary?.breakdown || []
  const colors = ["#C8961E", "#DFC178", "#6B7280", "#D6D3D1", "#B08D57"]
  return <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
    <section className="rounded-xl border border-neutral-200 bg-white p-5 lg:col-span-2" aria-label="Collections chart">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-semibold text-neutral-900">Collections over time</h2><p className="mt-1 text-[11px] text-neutral-400">{summary?.period.interval === "day" ? "Daily" : "Monthly"} collections in the selected period · INR</p></div><div className="flex gap-4 text-[10px] text-neutral-500"><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-[#C8961E]" />Retained</span><span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-neutral-300" />Refunded</span></div></div>
      <div className="mt-5 h-[225px] min-w-0">{loading ? <Skeleton className="h-full w-full" /> : !hasCollections ? <div className="flex h-full flex-col items-center justify-center gap-2 text-neutral-400"><Wallet className="h-7 w-7 text-neutral-300" /><p className="text-xs">No captured payments in this period</p></div> : <ResponsiveContainer width="100%" height="100%" minWidth={0}>
        <BarChart data={chartData} margin={{ top: 10, right: 0, left: -10, bottom: 0 }} barSize={chartData.length > 40 ? 8 : 24}>
          <CartesianGrid vertical={false} stroke="#efefef" strokeDasharray="3 3" /><XAxis dataKey="label" tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} minTickGap={24} interval="preserveStartEnd" /><YAxis tick={{ fill: "#9ca3af", fontSize: 10 }} tickLine={false} axisLine={false} width={58} tickFormatter={value => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 }).format(value / 100)} />
          <Tooltip content={<CollectionTooltip />} cursor={{ fill: "#faf8f2" }} /><Bar dataKey="netPaise" name="Retained" stackId="collections" fill="#C8961E" isAnimationActive={false} /><Bar dataKey="refundPaise" name="Refunded" stackId="collections" fill="#D6D3D1" radius={[3, 3, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>}</div>
    </section>
    <section className="rounded-xl border border-neutral-200 bg-white p-5" aria-label="Revenue breakdown"><h2 className="text-sm font-semibold text-neutral-900">Revenue mix</h2><p className="mt-1 text-[11px] text-neutral-400">Net collections by plan and add-ons</p>
      {loading ? <div className="mt-6 space-y-5">{[0, 1, 2].map(item => <Skeleton key={item} className="h-10 w-full" />)}</div> : !breakdown.length || !summary?.totals.netPaise ? <div className="flex h-[245px] items-center justify-center text-xs text-neutral-400">No retained collections in this period</div> : <div className="mt-6 max-h-[245px] space-y-5 overflow-y-auto pr-1">{breakdown.map((item, index) => { const share = summary.totals.netPaise ? item.netPaise / summary.totals.netPaise * 100 : 0; return <div key={item.id}><div className="flex items-center justify-between gap-2 text-xs"><span className="truncate font-medium text-neutral-600">{item.name}</span><span className="shrink-0 font-semibold tabular-nums text-neutral-800">{formatMoney(item.netPaise)}</span></div><div className="mt-2 h-1.5 overflow-hidden rounded-full bg-neutral-100"><div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: colors[index % colors.length] }} /></div><div className="mt-1.5 flex justify-between text-[10px] text-neutral-400"><span>{item.count} captured payment{item.count === 1 ? "" : "s"}</span><span>{share.toFixed(1)}%</span></div></div> })}</div>}
    </section>
  </div>
}
