"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { CertificateActivityChart } from "@/components/admin/dashboard/certificate-activity-chart"
import { EventPerformance, type TopEvent } from "@/components/admin/dashboard/event-performance"
import { RecentCertificates, type RecentCertificate } from "@/components/admin/dashboard/recent-certificates"
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart"
import { PlanDistributionChart } from "@/components/admin/dashboard/plan-distribution-chart"
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed"
import { Button } from "@/components/ui/button"
import {
  CalendarDays, Award, IndianRupee, AlertCircle, Users,
  ArrowRight, CreditCard, UserPlus, RefreshCw, Clock
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
    certificatesToday: number
    totalRecipients: number
    eventsCreatedThisMonth: number
  }
  trends: {
    certificatesToday: number | null
    totalRecipients: number | null
    revenueThisMonth: number | null
  }
  certificateActivity: Array<{ date: string; count: number }>
  topEvents: TopEvent[]
  recentCertificates: RecentCertificate[]
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

const PRIORITY_STYLES: Record<ActionItem["priority"], string> = {
  high: "bg-red-50 text-red-700",
  medium: "bg-amber-50 text-amber-700",
  low: "bg-blue-50 text-blue-700",
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

  const getActionIcon = (type: ActionItem["type"]) => {
    switch (type) {
      case "pending_payment": return <CreditCard className="h-4 w-4 text-amber-600" />
      case "new_user": return <UserPlus className="h-4 w-4 text-blue-600" />
      case "failed_payment": return <AlertCircle className="h-4 w-4 text-red-600" />
      default: return <Clock className="h-4 w-4 text-neutral-500" />
    }
  }

  const actionItems = data?.actionItems ?? []

  return (
    <>
      <AdminHeader title="Dashboard" description="Overview of your e-certificate platform" />
      <div className="flex-1 overflow-auto px-6 pb-6 pt-1">
        <div className="space-y-5">

          {/* Action Required */}
          {actionItems.length > 0 && (
            <section className="rounded-xl border border-amber-200 bg-amber-50/50 p-5">
              <div className="flex items-center justify-between gap-4 mb-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-amber-600" />
                  <h2 className="text-[15px] font-semibold text-neutral-900">Action Required</h2>
                  <span className="ml-1 rounded-full bg-white border border-amber-200 px-2 py-0.5 text-xs font-medium text-amber-700">{actionItems.length}</span>
                </div>
                {(data?.metrics?.pendingPayments ?? 0) > 0 && (
                  <Button variant="outline" size="sm" className="bg-white" onClick={handleSyncPayments} disabled={syncing}>
                    <RefreshCw className={cn("h-4 w-4 mr-2", syncing && "animate-spin")} />
                    Sync Payments
                  </Button>
                )}
              </div>
              <div className="space-y-2">
                {actionItems.slice(0, 5).map((item) => (
                  <div key={item.id} className="flex items-center justify-between gap-3 p-3 bg-white rounded-lg border border-neutral-200">
                    <div className="flex items-center gap-3 min-w-0">
                      {getActionIcon(item.type)}
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-neutral-900 truncate">{item.title}</p>
                        <p className="text-xs text-neutral-500 truncate">{item.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium capitalize", PRIORITY_STYLES[item.priority])}>{item.priority}</span>
                      <Button variant="ghost" size="sm" onClick={() => item.actionHref && router.push(item.actionHref)}>
                        {item.actionLabel}
                        <ArrowRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard
              title="Today's Certificates"
              value={data?.metrics.certificatesToday ?? 0}
              icon={Award}
              trend={data?.trends?.certificatesToday}
              trendLabel="vs. yesterday"
              loading={loading}
            />
            <MetricCard
              title="Active Events"
              value={data?.metrics.activeEvents ?? 0}
              icon={CalendarDays}
              trend={data?.metrics.eventsCreatedThisMonth}
              trendFormat="number"
              trendLabel="new this month"
              loading={loading}
            />
            <MetricCard
              title="Total Recipients"
              value={data?.metrics.totalRecipients ?? 0}
              icon={Users}
              trend={data?.trends?.totalRecipients}
              trendLabel="this month"
              loading={loading}
            />
            <MetricCard
              title="Monthly Revenue"
              value={`₹${(data?.metrics.revenueThisMonth ?? 0).toLocaleString("en-IN")}`}
              icon={IndianRupee}
              trend={data?.trends?.revenueThisMonth}
              trendLabel="vs. last month"
              loading={loading}
            />
          </div>

          {/* Activity + Event Performance */}
          <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
            <div className="xl:col-span-7 min-w-0">
              <CertificateActivityChart data={data?.certificateActivity ?? []} loading={loading} />
            </div>
            <div className="xl:col-span-5 min-w-0">
              <EventPerformance events={data?.topEvents ?? []} loading={loading} />
            </div>
          </div>

          {/* Recent Certificates */}
          <RecentCertificates certificates={data?.recentCertificates ?? []} loading={loading} />

          {/* Users, plans and platform activity */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <UserGrowthChart data={data?.userGrowth ?? []} loading={loading} />
            <PlanDistributionChart data={data?.planDistribution ?? []} loading={loading} />
            <ActivityFeed activities={data?.recentActivity ?? []} loading={loading} />
          </div>
        </div>
      </div>
    </>
  )
}
