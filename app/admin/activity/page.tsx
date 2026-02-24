"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  UserPlus, 
  CreditCard, 
  Calendar, 
  Download, 
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Activity
} from "lucide-react"

interface ActivityItem {
  _id: string
  type: "signup" | "payment" | "event_created" | "download"
  description: string
  userId?: string
  userName?: string
  userEmail?: string
  metadata?: Record<string, any>
  createdAt: string
}

const activityIcons = {
  signup: UserPlus,
  payment: CreditCard,
  event_created: Calendar,
  download: Download
}

const activityColors = {
  signup: "bg-blue-500/10 text-blue-600",
  payment: "bg-neutral-500/10 text-neutral-600",
  event_created: "bg-purple-500/10 text-purple-600",
  download: "bg-amber-500/10 text-amber-600"
}

export default function AdminActivityPage() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    fetchActivities()
  }, [filter, page])

  const fetchActivities = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/activity?type=${filter}&page=${page}&limit=20`)
      if (res.ok) {
        const data = await res.json()
        setActivities(data.activities)
        setTotalPages(data.totalPages)
      }
    } catch (error) {
      console.error("Failed to fetch activities:", error)
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date: string) => {
    const d = new Date(date)
    const now = new Date()
    const diff = now.getTime() - d.getTime()
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return "Just now"
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short" })
  }

  return (
    <>
      <AdminHeader title="Activity Log" description="Recent platform activity" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Filters */}
          <div className="flex items-center justify-between">
            <Select value={filter} onValueChange={(v) => { setFilter(v); setPage(1) }}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Activities</SelectItem>
                <SelectItem value="signup">Signups</SelectItem>
                <SelectItem value="payment">Payments</SelectItem>
                <SelectItem value="event_created">Events</SelectItem>
                <SelectItem value="download">Downloads</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" onClick={fetchActivities}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Activity List */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-4">
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-3/4 mb-2" />
                        <Skeleton className="h-3 w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : activities.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">No activities found</p>
              ) : (
                <div className="space-y-4">
                  {activities.map((activity) => {
                    const Icon = activityIcons[activity.type] || Activity
                    const colorClass = activityColors[activity.type] || "bg-gray-500/10 text-gray-600"
                    
                    return (
                      <div key={activity._id} className="flex items-start gap-4 p-3 rounded-lg hover:bg-muted/50 transition-colors">
                        <div className={`h-10 w-10 rounded-full flex items-center justify-center ${colorClass}`}>
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{activity.description}</p>
                          {activity.userEmail && (
                            <p className="text-xs text-muted-foreground truncate">{activity.userEmail}</p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs text-muted-foreground">{formatTime(activity.createdAt)}</p>
                          <Badge variant="outline" className="text-[10px] capitalize mt-1">
                            {activity.type.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6 pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}

