"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { UserPlus, Calendar, CreditCard } from "lucide-react"
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
    color: "text-emerald-500",
    bgColor: "bg-emerald-500/10",
  },
  event_created: {
    icon: Calendar,
    color: "text-blue-500",
    bgColor: "bg-blue-500/10",
  },
  payment: {
    icon: CreditCard,
    color: "text-amber-500",
    bgColor: "bg-amber-500/10",
  },
}

export function ActivityFeed({ activities, loading }: ActivityFeedProps) {
  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    )
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Recent Activity</CardTitle>
        {activities.length > 0 && (
          <span className="text-xs text-muted-foreground">{activities.length} items</span>
        )}
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No recent activity</p>
        ) : (
          <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4">
            {activities.map((activity, index) => {
              const config = activityConfig[activity.type]
              const Icon = config.icon
              return (
                <div key={index} className="flex items-center gap-4">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
                    <Icon className={cn("h-5 w-5", config.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{activity.description}</p>
                    <p className="text-xs text-muted-foreground">{formatTime(activity.timestamp)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </CardContent>
    </Card>
  )
}