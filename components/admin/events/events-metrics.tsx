"use client"

import { useId } from "react"
import { ArrowDownRight, ArrowUpRight, Award, CalendarDays, Layers, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { EventMetric, EventsStats } from "@/lib/admin-events"

function Sparkline({ metric, title }: { metric: EventMetric; title: string }) {
  const id = useId().replace(/:/g, "")
  const counts = metric.growth.map(point => point.count)
  if (!counts.length) return null
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  const line = counts.map((count, index) => `${index * 120 / Math.max(1, counts.length - 1)},${48 - (count - min) / Math.max(1, max - min) * 40}`).join(" ")
  return <svg viewBox="0 0 120 60" className="pointer-events-none absolute bottom-5 right-4 hidden h-16 w-[110px] min-[1500px]:block" role="img" aria-label={`${title}: cumulative registration or creation cohorts over 30 days`}>
    <defs><linearGradient id={id} x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b98216" stopOpacity="0.2" /><stop offset="100%" stopColor="#b98216" stopOpacity="0" /></linearGradient></defs>
    <polygon points={`0,60 ${line} 120,60`} fill={`url(#${id})`} /><polyline points={line} fill="none" stroke="#b98216" strokeWidth="1.4" strokeLinejoin="round" />
  </svg>
}

export function EventsMetrics({ stats, loading }: { stats: EventsStats | null; loading: boolean }) {
  const cards = [
    { key: "totalEvents" as const, title: "Total Events", icon: CalendarDays, label: "created vs previous 30 days", help: "All events. Growth compares events created in the last 30 days with the preceding 30 days." },
    { key: "totalRegistrations" as const, title: "Total Registrations", icon: Users, label: "added vs previous 30 days", help: "Recipient registrations across all current events, including inactive events." },
    { key: "certificatesIssued" as const, title: "Certificates Issued", icon: Award, label: "cohorts vs previous 30 days", help: "Unique recipient certificates downloaded or successfully emailed. Growth and chart group these records by registration date; repeat downloads or emails count once." },
    { key: "activeEvents" as const, title: "Active Events", icon: Layers, label: "created vs previous 30 days", help: "Currently active events. Growth compares creation dates of events that are active now." },
  ]
  return <TooltipProvider><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
    {cards.map(({ key, title, icon: Icon, label, help }) => {
      const metric = stats?.[key]
      const negative = (metric?.change || 0) < 0
      const TrendIcon = negative ? ArrowDownRight : ArrowUpRight
      return <div key={key} className="relative flex min-h-[144px] gap-4 overflow-hidden rounded-lg border border-neutral-200/90 bg-white p-5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold-soft/70"><Icon className="h-[22px] w-[22px] text-gold-deep" strokeWidth={1.65} /></div>
        <div className="relative z-10 min-w-0 flex-1">
          <Tooltip><TooltipTrigger asChild><button className="text-left text-[13px] font-medium text-neutral-700" aria-label={`${title}: ${help}`}>{title}</button></TooltipTrigger><TooltipContent className="max-w-72 text-xs">{help}</TooltipContent></Tooltip>
          {loading ? <div className="mt-3 space-y-2"><Skeleton className="h-7 w-16" /><Skeleton className="h-3 w-24" /></div> : <>
            <p className="mt-2 text-[27px] font-semibold leading-none tracking-tight text-neutral-950">{metric ? metric.value.toLocaleString("en-IN") : "—"}</p>
            <div className={cn("mt-2.5 flex items-center gap-1 text-[13px] font-medium", negative ? "text-red-600" : "text-emerald-600")}>
              {metric && <TrendIcon className="h-3.5 w-3.5" />}{metric ? metric.change === null ? `+${metric.recentCount} new` : `${metric.change > 0 ? "+" : ""}${metric.change}%` : "Unavailable"}
            </div><p className="mt-0.5 text-[10px] text-neutral-400">{label}</p>
          </>}
        </div>
        {!loading && metric && <Sparkline metric={metric} title={title} />}
      </div>
    })}
  </div></TooltipProvider>
}
