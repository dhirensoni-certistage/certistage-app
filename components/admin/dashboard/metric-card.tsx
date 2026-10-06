"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { LucideIcon, ArrowUpRight, ArrowDownRight } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number | null
  trendLabel?: string
  /** "percent" renders +12%, "number" renders +2 */
  trendFormat?: "percent" | "number"
  loading?: boolean
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  trendFormat = "percent",
  loading = false,
  className
}: MetricCardProps) {
  if (loading) {
    return (
      <div className={cn("rounded-xl border border-neutral-200 bg-white p-5", className)}>
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded-xl" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-3.5 w-24" />
            <Skeleton className="h-7 w-20" />
          </div>
        </div>
      </div>
    )
  }

  const hasTrend = trend !== undefined && trend !== null
  const isPositiveTrend = hasTrend && trend >= 0
  const TrendIcon = isPositiveTrend ? ArrowUpRight : ArrowDownRight

  return (
    <div className={cn("rounded-xl border border-neutral-200 bg-white p-5", className)}>
      <div className="flex items-center gap-4">
        <div className="h-12 w-12 rounded-xl bg-gold-soft flex items-center justify-center shrink-0">
          <Icon className="h-[22px] w-[22px] text-gold-deep" strokeWidth={1.75} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-neutral-600 truncate">{title}</p>
          <div className="mt-1 flex items-end justify-between gap-2">
            <p className="text-2xl font-semibold tracking-tight text-neutral-900 truncate">
              {typeof value === 'number' ? value.toLocaleString("en-IN") : value}
            </p>
            {hasTrend && (
              <div className="text-right shrink-0">
                <div className={cn("flex items-center justify-end gap-0.5 text-[13px] font-medium", isPositiveTrend ? "text-emerald-600" : "text-red-600")}>
                  <TrendIcon className="h-4 w-4" />
                  {isPositiveTrend ? "+" : ""}{trendFormat === "percent" ? `${trend}%` : trend.toLocaleString("en-IN")}
                </div>
                {trendLabel && <p className="text-[11px] text-neutral-500 leading-tight">{trendLabel}</p>}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
