"use client"

import { ArrowDownRight, ArrowUpRight, Crown, Monitor, UserRoundPlus, Users } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"

interface Metric {
  value: number
  recentCount: number
  change: number | null
}

export interface UsersStats {
  total: Metric
  professional: Metric
  free: Metric
  newSignups: Metric
  growth: { date: string; count: number }[]
}

export function UsersMetrics({ stats, loading }: { stats: UsersStats | null; loading: boolean }) {
  const cards = [
    { key: "total" as const, title: "Total Users", icon: Users },
    { key: "professional" as const, title: "Professional Users", icon: Crown },
    { key: "free" as const, title: "Free Users", icon: Monitor },
    { key: "newSignups" as const, title: "New Signups (This Month)", icon: UserRoundPlus },
  ]
  const counts = stats?.growth.map(point => point.count) || []
  const min = Math.min(...counts)
  const max = Math.max(...counts)
  const line = counts.map((count, index) => `${index * 120 / Math.max(1, counts.length - 1)},${48 - (count - min) / Math.max(1, max - min) * 40}`).join(" ")

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map(({ key, title, icon: Icon }) => {
        const metric = stats?.[key]
        const negative = metric?.change !== null && (metric?.change || 0) < 0
        const TrendIcon = negative ? ArrowDownRight : ArrowUpRight
        return (
          <div key={key} className="relative flex min-h-[146px] gap-4 overflow-hidden rounded-lg border border-neutral-200/90 bg-white p-5">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-gold-soft/70">
              <Icon className="h-[22px] w-[22px] text-gold-deep" strokeWidth={1.65} />
            </div>
            <div className="relative z-10 min-w-0 flex-1">
              <p className="text-[13px] font-medium text-neutral-600">{title}</p>
              {loading ? (
                <div className="mt-3 space-y-2"><Skeleton className="h-7 w-16" /><Skeleton className="h-3 w-24" /></div>
              ) : (
                <>
                  <p className="mt-2 text-[27px] font-semibold leading-none tracking-tight text-neutral-950">{metric ? metric.value.toLocaleString("en-IN") : "—"}</p>
                  <div className={cn("mt-2.5 flex items-center gap-1 text-[13px] font-medium", negative ? "text-red-600" : "text-emerald-600")}>
                    {metric && <TrendIcon className="h-3.5 w-3.5" />}
                    {metric ? metric.change === null ? `+${metric.recentCount} new` : `${metric.change > 0 ? "+" : ""}${metric.change}%` : "Unavailable"}
                  </div>
                  <p className="mt-0.5 text-[10px] text-neutral-400">{key === "newSignups" ? "vs last calendar month" : "signups vs previous 30 days"}</p>
                </>
              )}
            </div>
            {key === "total" && !loading && counts.length > 0 && (
              <svg viewBox="0 0 120 60" className="absolute bottom-5 right-4 hidden h-16 w-[100px] min-[1600px]:block" role="img" aria-label="Cumulative user signups over the last 30 days">
                <defs><linearGradient id="users-growth-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#b98216" stopOpacity="0.18" /><stop offset="100%" stopColor="#b98216" stopOpacity="0" /></linearGradient></defs>
                <polygon points={`0,60 ${line} 120,60`} fill="url(#users-growth-fill)" />
                <polyline points={line} fill="none" stroke="#b98216" strokeWidth="1.4" strokeLinejoin="round" />
              </svg>
            )}
          </div>
        )
      })}
    </div>
  )
}
