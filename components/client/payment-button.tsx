"use client"

import { Progress } from "@/components/ui/progress"
import { Button } from "@/components/ui/button"
import { AlertTriangle, Crown, Infinity } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface EventUsageBarProps {
  currentCount: number
  maxEvents: number // -1 = unlimited
  planName: string
}

export function EventUsageBar({ currentCount, maxEvents, planName }: EventUsageBarProps) {
  const isUnlimited = maxEvents === -1
  const usagePercent = isUnlimited ? 0 : Math.min(100, Math.round((currentCount / maxEvents) * 100))
  const isNearLimit = !isUnlimited && usagePercent >= 80
  const isAtLimit = !isUnlimited && currentCount >= maxEvents

  return (
    <div className={cn(
      "rounded-lg border p-4",
      isAtLimit ? "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/30" :
      isNearLimit ? "border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30" :
      "border-border bg-muted/30"
    )}>
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {isAtLimit && <AlertTriangle className="h-4 w-4 text-red-500" />}
            {isNearLimit && !isAtLimit && <AlertTriangle className="h-4 w-4 text-amber-500" />}
            <span className="text-sm font-medium">
              Event Usage
            </span>
            <span className="text-xs text-muted-foreground">
              ({planName} Plan)
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="flex-1">
              {isUnlimited ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Infinity className="h-4 w-4" />
                  <span>Unlimited events</span>
                  <span className="text-foreground font-medium">({currentCount} created)</span>
                </div>
              ) : (
                <>
                  <Progress 
                    value={usagePercent} 
                    className={cn(
                      "h-2",
                      isAtLimit && "[&>div]:bg-red-500",
                      isNearLimit && !isAtLimit && "[&>div]:bg-amber-500"
                    )}
                  />
                  <div className="flex items-center justify-between mt-1.5 text-sm">
                    <span className="text-muted-foreground">
                      {currentCount} of {maxEvents} events
                    </span>
                    <span className={cn(
                      "font-medium",
                      isAtLimit ? "text-red-600 dark:text-red-400" :
                      isNearLimit ? "text-amber-600 dark:text-amber-400" :
                      "text-neutral-600 dark:text-neutral-400"
                    )}>
                      {usagePercent}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {(isAtLimit || isNearLimit) && (
          <Button 
            asChild 
            size="sm"
            className="shrink-0 gap-2 bg-gradient-to-r from-purple-500 via-blue-500 to-sky-400 text-white"
          >
            <Link href="/client/upgrade">
              <Crown className="h-4 w-4" />
              Upgrade
            </Link>
          </Button>
        )}
      </div>

      {isAtLimit && (
        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
          You've reached your event limit. Upgrade your plan to create more events.
        </p>
      )}
    </div>
  )
}


