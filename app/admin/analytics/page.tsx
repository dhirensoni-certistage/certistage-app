"use client"

import { useState, useEffect } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { MetricCard } from "@/components/admin/dashboard/metric-card"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Award, Download, Clock, Percent, User, Calendar } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"

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

  return (
    <>
      <AdminHeader title="Analytics" description="Platform usage analytics and insights" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Date Range Filter */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-wrap items-end gap-4">
                <div><Label>Start Date</Label><Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="mt-1" /></div>
                <div><Label>End Date</Label><Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="mt-1" /></div>
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

          {/* Certificate Trends Chart */}
          <Card>
            <CardHeader><CardTitle>Certificate Generation Trends</CardTitle></CardHeader>
            <CardContent>
              <div className="h-[300px]">
                {data?.certificateTrends.length === 0 ? <p className="text-center text-muted-foreground py-12">No data</p> : (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data?.certificateTrends.map(d => ({ ...d, date: new Date(d.date).toLocaleDateString("en-IN", { month: "short", day: "numeric" }) }))}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <YAxis tick={{ fill: "hsl(var(--muted-foreground))" }} />
                      <Tooltip contentStyle={{ backgroundColor: "hsl(var(--card))", border: "1px solid hsl(var(--border))", borderRadius: "8px" }} />
                      <Line type="monotone" dataKey="count" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ fill: "hsl(var(--primary))" }} />
                    </LineChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Top Users & Events */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader><CardTitle>Top 10 Users by Events</CardTitle></CardHeader>
              <CardContent>
                {data?.topUsers.length === 0 ? <p className="text-muted-foreground">No data</p> : (
                  <div className="space-y-3">
                    {data?.topUsers.map((item, i) => (
                      <div key={item.user._id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                        <User className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.user.name}</p><p className="text-xs text-muted-foreground">{item.user.email}</p></div>
                        <div className="text-right"><p className="font-bold">{item.eventsCount}</p><p className="text-xs text-muted-foreground">events</p></div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle>Top 10 Events by Recipients</CardTitle></CardHeader>
              <CardContent>
                {data?.topEvents.length === 0 ? <p className="text-muted-foreground">No data</p> : (
                  <div className="space-y-3">
                    {data?.topEvents.map((item, i) => (
                      <div key={item.event._id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                        <span className="text-sm font-bold text-muted-foreground w-6">{i + 1}</span>
                        <Calendar className="h-4 w-4 text-primary" />
                        <div className="flex-1 min-w-0"><p className="font-medium truncate">{item.event.name}</p><p className="text-xs text-muted-foreground">{item.owner?.name}</p></div>
                        <div className="text-right"><p className="font-bold">{item.recipientsCount}</p><p className="text-xs text-muted-foreground">recipients</p></div>
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