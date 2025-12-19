"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DataTable, Column, Pagination } from "@/components/admin/data-table"
import { SearchFilter, FilterConfig } from "@/components/admin/search-filter"
import { IndianRupee, TrendingUp, Percent, Download, RefreshCw, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"

interface RevenueData {
  totals: { allTime: number; thisMonth: number; lastMonth: number; successRate: number }
  monthlyRevenue: Array<{ month: string; revenue: number }>
  planBreakdown: Array<{ plan: string; revenue: number; count: number }>
  payments: Array<{ _id: string; user: { name: string; email: string }; plan: string; amount: number; status: string; createdAt: string }>
  pagination: Pagination
}

const PLAN_COLORS: Record<string, string> = { 
  professional: "#3b82f6", 
  enterprise: "#8b5cf6", 
  premium: "#f59e0b" 
}

const filters: FilterConfig[] = [
  { key: "status", label: "Status", options: [{ value: "success", label: "Success" }, { value: "pending", label: "Pending" }, { value: "failed", label: "Failed" }] },
  { key: "plan", label: "Plan", options: [{ value: "professional", label: "Professional" }, { value: "enterprise", label: "Enterprise" }, { value: "premium", label: "Premium" }] }
]

export default function RevenuePage() {
  const [data, setData] = useState<RevenueData | null>(null)
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [filterValues, setFilterValues] = useState<Record<string, string>>({})
  const [syncingPayment, setSyncingPayment] = useState<string | null>(null)
  const [bulkSyncing, setBulkSyncing] = useState(false)

  useEffect(() => { fetchRevenue() }, [pagination.page, filterValues])

  const handleExport = () => {
    window.open("/api/admin/export/payments", "_blank")
  }

  const handleSyncPayment = async (paymentId: string) => {
    setSyncingPayment(paymentId)
    try {
      const res = await fetch("/api/admin/payments/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentId })
      })
      const result = await res.json()
      
      if (res.ok) {
        if (result.synced && result.status === "success") {
          toast.success(`Payment synced! ${result.userName}'s plan updated to ${result.plan}`)
          fetchRevenue()
        } else if (result.synced && result.status === "failed") {
          toast.error("Payment was attempted but failed")
          fetchRevenue()
        } else if (result.status === "success") {
          toast.info("Payment already successful")
        } else {
          toast.info(`Payment still pending (Razorpay: ${result.razorpayStatus})`)
        }
      } else {
        toast.error(result.error || "Failed to sync payment")
      }
    } catch {
      toast.error("Failed to sync payment")
    } finally {
      setSyncingPayment(null)
    }
  }

  const handleBulkSync = async () => {
    setBulkSyncing(true)
    try {
      const res = await fetch("/api/admin/payments/sync", { method: "PUT" })
      const result = await res.json()
      
      if (res.ok) {
        toast.success(`Bulk sync complete: ${result.results.success} successful, ${result.results.failed} failed, ${result.results.stillPending} pending`)
        fetchRevenue()
      } else {
        toast.error(result.error || "Bulk sync failed")
      }
    } catch {
      toast.error("Bulk sync failed")
    } finally {
      setBulkSyncing(false)
    }
  }

  const fetchRevenue = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ page: pagination.page.toString(), limit: pagination.limit.toString(), ...filterValues })
      const res = await fetch(`/api/admin/revenue?${params}`)
      if (res.ok) {
        const json = await res.json()
        setData(json)
        setPagination(json.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch revenue:", error)
    } finally {
      setLoading(false)
    }
  }

  // Custom tooltip for bar chart
  const CustomBarTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-emerald-600">₹{payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  // Custom tooltip for pie chart
  const CustomPieTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground capitalize">{payload[0].name}</p>
          <p className="text-sm" style={{ color: payload[0].payload.fill }}>₹{payload[0].value.toLocaleString()}</p>
        </div>
      )
    }
    return null
  }

  const columns: Column<RevenueData["payments"][0]>[] = [
    { key: "user", header: "User", render: (p) => <div><p className="font-medium">{p.user?.name || "Unknown"}</p><p className="text-xs text-muted-foreground">{p.user?.email || ""}</p></div> },
    { key: "plan", header: "Plan", render: (p) => <Badge>{p.plan}</Badge> },
    { key: "amount", header: "Amount", render: (p) => `₹${(p.amount || 0).toLocaleString()}` },
    { key: "status", header: "Status", render: (p) => (
      <div className="flex items-center gap-2">
        <Badge variant={p.status === "success" ? "default" : p.status === "pending" ? "secondary" : "destructive"}>{p.status}</Badge>
        {p.status === "pending" && (
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-7 px-2"
            onClick={() => handleSyncPayment(p._id)}
            disabled={syncingPayment === p._id}
          >
            {syncingPayment === p._id ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
          </Button>
        )}
      </div>
    )},
    { key: "createdAt", header: "Date", render: (p) => new Date(p.createdAt).toLocaleDateString("en-IN") }
  ]

  return (
    <>
      <AdminHeader title="Revenue" description="Track payments and revenue analytics" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Breadcrumbs />
          
          {/* Action Buttons */}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleBulkSync} disabled={bulkSyncing}>
              {bulkSyncing ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
              Sync All Pending
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
          
          {/* Metric Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Revenue" value={`₹${(data?.totals.allTime ?? 0).toLocaleString()}`} icon={IndianRupee} loading={loading} />
            <MetricCard title="This Month" value={`₹${(data?.totals.thisMonth ?? 0).toLocaleString()}`} icon={TrendingUp} loading={loading} />
            <MetricCard title="Last Month" value={`₹${(data?.totals.lastMonth ?? 0).toLocaleString()}`} icon={IndianRupee} loading={loading} />
            <MetricCard title="Success Rate" value={`${data?.totals.successRate ?? 0}%`} icon={Percent} loading={loading} />
          </div>

          {/* Charts - Fixed colors */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Monthly Revenue</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {!data?.monthlyRevenue || data.monthlyRevenue.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.monthlyRevenue}>
                        <defs>
                          <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#10b981" stopOpacity={0.9}/>
                            <stop offset="95%" stopColor="#10b981" stopOpacity={0.6}/>
                          </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                        <XAxis 
                          dataKey="month" 
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                        />
                        <YAxis 
                          tick={{ fill: "#6b7280", fontSize: 12 }}
                          axisLine={{ stroke: "#e5e7eb" }}
                          tickLine={{ stroke: "#e5e7eb" }}
                          tickFormatter={(value) => `₹${value >= 1000 ? `${(value/1000).toFixed(0)}k` : value}`}
                        />
                        <Tooltip content={<CustomBarTooltip />} />
                        <Bar 
                          dataKey="revenue" 
                          fill="url(#colorRevenue)" 
                          radius={[6, 6, 0, 0]} 
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Revenue by Plan</CardTitle></CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  {!data?.planBreakdown || data.planBreakdown.length === 0 ? (
                    <p className="text-center text-muted-foreground py-12">No data available</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie 
                          data={data.planBreakdown} 
                          cx="50%" 
                          cy="50%" 
                          innerRadius={60} 
                          outerRadius={100} 
                          dataKey="revenue" 
                          label={({ plan, percent }) => `${plan} ${(percent * 100).toFixed(0)}%`}
                          labelLine={{ stroke: "#6b7280" }}
                        >
                          {data.planBreakdown.map((entry, i) => (
                            <Cell key={i} fill={PLAN_COLORS[entry.plan] || "#64748b"} />
                          ))}
                        </Pie>
                        <Tooltip content={<CustomPieTooltip />} />
                        <Legend 
                          formatter={(value) => <span className="text-foreground capitalize">{value}</span>}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Payments Table */}
          <Card>
            <CardHeader><CardTitle>Payment History</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <SearchFilter searchPlaceholder="" filters={filters} onSearch={() => {}} onFilter={setFilterValues} />
              <DataTable 
                columns={columns} 
                data={data?.payments ?? []} 
                pagination={pagination} 
                onPageChange={(p) => setPagination((prev) => ({ ...prev, page: p }))} 
                loading={loading} 
                rowKey={(p) => p._id} 
                emptyMessage="No payments found" 
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}
