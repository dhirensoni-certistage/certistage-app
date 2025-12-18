"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { UserGrowthChart } from "@/components/admin/dashboard/user-growth-chart"
import { PlanDistributionChart } from "@/components/admin/dashboard/plan-distribution-chart"
import { ActivityFeed } from "@/components/admin/dashboard/activity-feed"
import { Users, Calendar, Award, IndianRupee } from "lucide-react"

interface DashboardData {
  metrics: {
    totalUsers: number
    activeEvents: number
    certificatesThisMonth: number
    revenueThisMonth: number
  }
  userGrowth: Array<{ date: string; count: number }>
  planDistribution: Array<{ plan: string; count: number }>
  recentActivity: Array<{
    type: "signup" | "event_created" | "payment"
    description: string
    timestamp: string
    userId?: string
  }>
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)

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

  return (
    <>
      <AdminHeader
        title="Dashboard"
        description="Overview of your platform metrics and activity"
      />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Users"
              value={data?.metrics.totalUsers ?? 0}
              icon={Users}
              loading={loading}
            />
            <MetricCard
              title="Active Events"
              value={data?.metrics.activeEvents ?? 0}
              icon={Calendar}
              loading={loading}
            />
            <MetricCard
              title="Certificates This Month"
              value={data?.metrics.certificatesThisMonth ?? 0}
              icon={Award}
              loading={loading}
            />
            <MetricCard
              title="Revenue This Month"
              value={`₹${(data?.metrics.revenueThisMonth ?? 0).toLocaleString()}`}
              icon={IndianRupee}
              loading={loading}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <UserGrowthChart 
              data={data?.userGrowth ?? []} 
              loading={loading} 
            />
            <PlanDistributionChart 
              data={data?.planDistribution ?? []} 
              loading={loading} 
            />
          </div>

          {/* Activity Feed */}
          <ActivityFeed 
            activities={data?.recentActivity ?? []} 
            loading={loading} 
          />
        </div>
      </div>
    </>
  )
}
