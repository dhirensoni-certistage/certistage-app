"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { cn } from "@/lib/utils"
import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react"

interface MetricCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  trend?: number
  trendLabel?: string
  loading?: boolean
  className?: string
}

export function MetricCard({
  title,
  value,
  icon: Icon,
  trend,
  trendLabel,
  loading = false,
  className
}: MetricCardProps) {
  if (loading) {
    return (
      <Card className={cn("", className)}>
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-12 w-12 rounded-lg" />
          </div>
        </CardContent>
      </Card>
    )
  }

  const isPositiveTrend = trend !== undefined && trend >= 0
  const TrendIcon = isPositiveTrend ? TrendingUp : TrendingDown

  return (
    <Card className={cn("", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">
              {typeof value === 'number' ? value.toLocaleString() : value}
            </p>
            {trend !== undefined && (
              <div className="flex items-center gap-1">
                <TrendIcon 
                  className={cn(
                    "h-3 w-3",
                    isPositiveTrend ? "text-neutral-500" : "text-red-500"
                  )} 
                />
                <span 
                  className={cn(
                    "text-xs font-medium",
                    isPositiveTrend ? "text-neutral-500" : "text-red-500"
                  )}
                >
                  {isPositiveTrend ? "+" : ""}{trend}%
                </span>
                {trendLabel && (
                  <span className="text-xs text-muted-foreground">
                    {trendLabel}
                  </span>
                )}
              </div>
            )}
          </div>
          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
            <Icon className="h-6 w-6 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

