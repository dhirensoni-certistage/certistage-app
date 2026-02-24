"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Award, Download, Clock, Percent, User, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart } from "recharts"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"

interface AnalyticsData {
  certificateTrends: Array<{ date: string; count: number }>
  topUsers: Array<{ user: { _id: string; name: string; email: string }; eventsCount: number; recipientsCount: number }>
  topEvents: Array<{ event: { _id: string; name: string }; owner: { name: string; email: string }; recipientsCount: number }>
  downloadStats: { total: number; downloaded: number; pending: number; downloadRate: number }
}

export default function AnalyticsPage() {
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")

  useEffect(() => { fetchAnalytics() }, [])

  const fetchAnalytics = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (startDate) params.set("startDate", startDate)
      if (endDate) params.set("endDate", endDate)
      const res = await fetch(`/api/admin/analytics?${params}`)
      if (res.ok) setData(await res.json())
    } catch (error) {
      console.error("Failed to fetch analytics:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleFilter = () => fetchAnalytics()

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3">
          <p className="text-sm font-medium text-foreground">{label}</p>
          <p className="text-sm text-primary">{payload[0].value} certificates</p>
        </div>
      )
    }
    return null
  }

  return (
    <>
      <AdminHeader title="Analytics" description="Platform usage analytics and insights" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Breadcrumbs />
          
          {/* Date Range Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label>Start Date</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" />
                </div>
                <div>
                  <Label>End Date</Label>
                  <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" />
                </div>
                <Button onClick={handleFilter}>Apply Filter</Button>
                <Button variant="outline" onClick={() => { setStartDate(""); setEndDate(""); fetchAnalytics() }}>Clear</Button>
              </div>
            </CardContent>
          </Card>

          {/* Download Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard title="Total Certificates" value={data?.downloadStats.total ?? 0} icon={Award} loading={loading} />
            <MetricCard title="Downloaded" value={data?.downloadStats.downloaded ?? 0} icon={Download} loading={loading} />
            <MetricCard title="Pending" value={data?.downloadStats.pending ?? 0} icon={Clock} loading={loading} />
            <MetricCard title="Download Rate" value={`${data?.downloadStats.downloadRate ?? 0}%`} icon={Percent} loading={loading} />
          </div>

          {/* Certificate Trends Chart - Fixed with proper colors */}
          <Card>
            <CardHeader><CardTitle>Certificate Generation Trends</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {!data?.certificateTrends || data.certificateTrends.length === 0 ? (
                  <p className="text-center text-muted-foreground py-12">No data available</p>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.certificateTrends.map(d => ({ 
                      ...d, 
                      date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) 
                    }))}>
                      <defs>
                        <linearGradient id="colorCert" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#171717" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="#171717" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                      <XAxis 
                        dataKey="date" 
                        tick={{ fill: "#6b7280", fontSize: 12 }} 
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                      />
                      <YAxis 
                        tick={{ fill: "#6b7280", fontSize: 12 }} 
                        axisLine={{ stroke: "#e5e7eb" }}
                        tickLine={{ stroke: "#e5e7eb" }}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Area 
                        type="monotone" 
                        dataKey="count" 
                        stroke="#171717" 
                        strokeWidth={2}
                        fill="url(#colorCert)" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Users & Events - Fixed with max-height and scroll */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top 10 Users by Events</CardTitle>
                  {data?.topUsers && data.topUsers.length > 0 && (
                    <span className="text-xs text-muted-foreground">{data.topUsers.length} users</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!data?.topUsers || data.topUsers.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                    {data.topUsers.map((item, i) => (
                      <div key={item.user?._id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                        <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-primary">{i + 1}</span>
                        </div>
                        <User className="h-4 w-4 text-primary shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.user?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.user?.email || ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-primary">{item.eventsCount}</p>
                          <p className="text-xs text-muted-foreground">events</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Top 10 Events by Recipients</CardTitle>
                  {data?.topEvents && data.topEvents.length > 0 && (
                    <span className="text-xs text-muted-foreground">{data.topEvents.length} events</span>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {!data?.topEvents || data.topEvents.length === 0 ? (
                  <p className="text-muted-foreground text-center py-8">No data available</p>
                ) : (
                  <div className="max-h-[400px] overflow-y-auto pr-2 space-y-3">
                    {data.topEvents.map((item, i) => (
                      <div key={item.event?._id || i} className="flex items-center gap-3 p-3 rounded-lg bg-muted/50 border">
                        <div className="h-8 w-8 rounded-full bg-purple-500/10 flex items-center justify-center shrink-0">
                          <span className="text-xs font-bold text-purple-600">{i + 1}</span>
                        </div>
                        <Calendar className="h-4 w-4 text-purple-600 shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.event?.name || "Unknown"}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.owner?.name || ""}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-purple-600">{item.recipientsCount}</p>
                          <p className="text-xs text-muted-foreground">recipients</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </>
  )
}

