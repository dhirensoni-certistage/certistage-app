"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart"
import { PlanDistributionChart } from "@/components/admin/dashboard/plan-distribution-chart"
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { 
  Users, Calendar, Award, IndianRupee, AlertCircle, 
  ArrowRight, CreditCard, UserPlus, RefreshCw, TrendingUp,
  Clock, CheckCircle2
} from "lucide-react"
import { toast } from "sonner"

interface ActionItem {
  id: string
  type: "pending_payment" | "new_user" | "failed_payment"
  title: string
  description: string
  actionLabel: string
  actionHref?: string
  timestamp: string
  priority: "high" | "medium" | "low"
}

interface DashboardData {
  metrics: {
    totalUsers: number
    activeEvents: number
    certificatesThisMonth: number
    revenueThisMonth: number
    newUsersToday: number
    pendingPayments: number
    conversionRate: number
  }
  userGrowth: Array<{ date: string; count: number }>
  planDistribution: Array<{ plan: string; count: number }>
  recentActivity: Array<{
    type: "signup" | "event_created" | "payment"
    description: string
    timestamp: string
    userId?: string
  }>
  actionItems: ActionItem[]
}

export default function DashboardPage() {
  const router = useRouter()
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      const res = await fetch("/api/admin/dashboard")
      if (res.ok) {
        const json = await res.json()
        setData(json)
      }
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSyncPayments = async () => {
    setSyncing(true)
    try {
      const res = await fetch("/api/admin/payments/sync", { method: "PUT" })
      const result = await res.json()
      if (res.ok) {
        toast.success(`Synced: ${result.results.success} successful, ${result.results.stillPending} pending`)
        fetchDashboardData()
      } else {
        toast.error("Sync failed")
      }
    } catch (error) {
      toast.error("Sync failed")
    } finally {
      setSyncing(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high": return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
      case "medium": return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400"
      default: return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
    }
  }

  const getActionIcon = (type: string) => {
    switch (type) {
      case "pending_payment": return <CreditCard className="h-4 w-4 text-yellow-500" />
      case "new_user": return <UserPlus className="h-4 w-4 text-blue-500" />
      case "failed_payment": return <AlertCircle className="h-4 w-4 text-red-500" />
      default: return <Clock className="h-4 w-4" />
    }
  }

  return (
    <>
      <AdminHeader title="Dashboard" description="Overview of your platform metrics and activity" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          
          {/* Action Required Section */}
          {(data?.actionItems?.length ?? 0) > 0 && (
            <Card className="border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-yellow-600" />
                    <CardTitle className="text-base">Action Required</CardTitle>
                    <Badge variant="secondary" className="ml-2">{data?.actionItems?.length}</Badge>
                  </div>
                  {(data?.metrics?.pendingPayments ?? 0) > 0 && (
                    <Button variant="outline" size="sm" onClick={handleSyncPayments} disabled={syncing}>
                      {syncing ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                      Sync Payments
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data?.actionItems?.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-background rounded-lg border">
                      <div className="flex items-center gap-3">
                        {getActionIcon(item.type)}
                        <div>
                          <p className="text-sm font-medium">{item.title}</p>
                          <p className="text-xs text-muted-foreground">{item.description}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getPriorityColor(item.priority)}>{item.priority}</Badge>
                        <Button variant="ghost" size="sm" onClick={() => item.actionHref && router.push(item.actionHref)}>
                          {item.actionLabel}
                          <ArrowRight className="h-3 w-3 ml-1" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Quick Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <QuickStat label="Today's Signups" value={data?.metrics?.newUsersToday ?? 0} icon={UserPlus} loading={loading} color="blue" />
            <QuickStat label="Pending Payments" value={data?.metrics?.pendingPayments ?? 0} icon={Clock} loading={loading} color="yellow" />
            <QuickStat label="Conversion Rate" value={`${data?.metrics?.conversionRate ?? 0}%`} icon={TrendingUp} loading={loading} color="neutral" />
            <QuickStat label="Active Events" value={data?.metrics?.activeEvents ?? 0} icon={Calendar} loading={loading} color="purple" />
          </div>

          {/* Main Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Users" value={data?.metrics.totalUsers ?? 0} icon={Users} loading={loading} />
            <MetricCard title="Active Events" value={data?.metrics.activeEvents ?? 0} icon={Calendar} loading={loading} />
            <MetricCard title="Certificates This Month" value={data?.metrics.certificatesThisMonth ?? 0} icon={Award} loading={loading} />
            <MetricCard title="Revenue This Month" value={`₹${(data?.metrics.revenueThisMonth ?? 0).toLocaleString()}`} icon={IndianRupee} loading={loading} />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserGrowthChart data={data?.userGrowth ?? []} loading={loading} />
            <PlanDistributionChart data={data?.planDistribution ?? []} loading={loading} />
          </div>

          {/* Activity Feed */}
          <ActivityFeed activities={data?.recentActivity ?? []} loading={loading} />
        </div>
      </div>
    </>
  )
}

// Quick Stat Component
function QuickStat({ label, value, icon: Icon, loading, color }: {
  label: string
  value: string | number
  icon: any
  loading: boolean
  color: "blue" | "yellow" | "neutral" | "purple"
}) {
  const colorClasses = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400",
    yellow: "bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400",
    neutral: "bg-neutral-50 dark:bg-neutral-900/20 text-neutral-600 dark:text-neutral-400",
    purple: "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400",
  }

  if (loading) {
    return (
      <div className="p-4 rounded-lg border bg-card">
        <Skeleton className="h-4 w-20 mb-2" />
        <Skeleton className="h-6 w-12" />
      </div>
    )
  }

  return (
    <div className={`p-4 rounded-lg border ${colorClasses[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="h-4 w-4" />
        <span className="text-xs font-medium opacity-80">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}


