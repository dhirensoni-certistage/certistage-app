"use client"

import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/admin/dashboard/dashboard-card"
import { UserPlus, CalendarDays, CreditCard } from "lucide-react"
import { cn } from "@/lib/utils"

interface Activity {
  type: "signup" | "event_created" | "payment"
  description: string
  timestamp: string
  userId?: string
}

interface ActivityFeedProps {
  activities: Activity[]
  loading?: boolean
}

const activityConfig = {
  signup: {
    icon: UserPlus,
    className: "bg-blue-50 text-blue-600",
  },
  event_created: {
    icon: CalendarDays,
    className: "bg-neutral-100 text-neutral-600",
  },
  payment: {
    icon: CreditCard,
    className: "bg-gold-soft text-gold-deep",
  },
}

const formatTime = (timestamp: string) => {
  const date = new Date(timestamp)
  const now = new Date()
  const diff = now.getTime() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  const hours = Math.floor(diff / 3600000)
  const days = Math.floor(diff / 86400000)

  if (minutes < 1) return "Just now"
  if (minutes < 60) return `${minutes}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" })
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  return (
    <DashboardCard
      title="Recent Activity"
      description="Signups, new events and payments"
      action={!loading && activities.length > 0 ? <span className="text-xs text-neutral-500">{activities.length} items</span> : undefined}
    >
      {loading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3">
              <Skeleton className="h-9 w-9 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3.5 w-3/4" />
                <Skeleton className="h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center text-sm text-neutral-500 py-8">No recent activity</p>
      ) : (
        <div className="max-h-[320px] overflow-y-auto scrollbar-minimal -mr-2 pr-2 space-y-3.5">
          {activities.map((activity, index) => {
            const config = activityConfig[activity.type]
            const Icon = config.icon
            return (
              <div key={index} className="flex items-center gap-3">
                <div className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", config.className)}>
                  <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[13px] font-medium text-neutral-900 truncate">{activity.description}</p>
                  <p className="text-xs text-neutral-500">{formatTime(activity.timestamp)}</p>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </DashboardCard>
  )
}
