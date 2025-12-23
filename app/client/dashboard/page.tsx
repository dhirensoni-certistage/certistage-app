"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getClientSession, PLAN_FEATURES } from "@/lib/auth"
import {
  Users,
  Download,
  Clock,
  TrendingUp,
  Award,
  Crown,
  AlertTriangle,
  Loader2
} from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  AreaChart,
  Area,
  Legend
} from "recharts"
import { DashboardCardSkeleton, ChartSkeleton } from "@/components/ui/skeletons"

const COLORS = {
  downloaded: "#10b981",
  pending: "#f59e0b"
}

// Dashboard event type (from API)
interface DashboardEvent {
  _id: string
  name: string
  description?: string
  certificateTypes: {
    id: string
    name: string
    recipients: {
      id: string
      name: string
      downloadCount: number
      status: string
    }[]
    stats: {
      total: number
      downloaded: number
      pending: number
    }
  }[]
  stats: {
    total: number
    downloaded: number
    pending: number
    certificateTypesCount: number
  }
}

export default function ClientDashboard() {
  const [event, setEvent] = useState<DashboardEvent | null>(null)
  const [registrationView, setRegistrationView] = useState<"registered" | "downloaded">("registered")
  const [isLoading, setIsLoading] = useState(true)

  const [session, setSession] = useState<ReturnType<typeof getClientSession>>(null)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)

  // Fetch event data from API
  const fetchEventData = async (eventId: string) => {
    try {
      const res = await fetch(`/api/client/dashboard?eventId=${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    const currentSession = getClientSession()
    setSession(currentSession)

    // Fetch event data from API
    if (currentSession?.eventId) {
      fetchEventData(currentSession.eventId)
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session || session.loginType !== "user") {
      setShowUpgradeBanner(false)
      return
    }
    const plan = session.userPlan || "free"
    // Show banner for all plans except the highest one (premium)
    // Also show if user has a pending plan upgrade
    if (plan === "premium" && !session.pendingPlan) {
      setShowUpgradeBanner(false)
      return
    }

    setShowUpgradeBanner(true)
  }, [session])

  const dismissBanner = () => {
    // Hide until next login / hard refresh
    setShowUpgradeBanner(false)
  }

  // Show loading state with skeletons
  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-muted animate-pulse rounded" />
          <div className="h-4 w-64 bg-muted animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <DashboardCardSkeleton key={i} />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardHeader>
                <div className="h-4 w-32 bg-muted animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <ChartSkeleton />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  // Show event dashboard for both user and event login
  if (!event) {
    return (
      <div className="p-8 space-y-4">
        <h1 className="text-2xl font-bold">Welcome to CertiStage!</h1>
        <p className="text-muted-foreground">Create your first event to get started.</p>
        <div className="flex gap-4">
          <Link href="/client/events">
            <Button>Create Event</Button>
          </Link>
          <Link href="/client/events">
            <Button variant="outline">View Events</Button>
          </Link>
        </div>
      </div>
    )
  }

  const planId = session?.loginType === "user" ? (session.userPlan || "free") : "enterprise"
  const planFeatures = PLAN_FEATURES[planId]
  const hasCertificateLimit = planFeatures.maxCertificates > 0
  const certLimit = planFeatures.maxCertificates
  const certUsed = event.stats.total
  const usagePercent = hasCertificateLimit ? Math.min(100, Math.round((certUsed / certLimit) * 100)) : 0

  const completionRate = event.stats.total > 0
    ? Math.round((event.stats.downloaded / event.stats.total) * 100)
    : 0

  const downloadStats = event.certificateTypes.reduce((acc, ct) => {
    ct.recipients.forEach(r => {
      acc.totalDownloads += r.downloadCount
      if (r.downloadCount > 0) acc.uniqueDownloads += 1
    })
    return acc
  }, { totalDownloads: 0, uniqueDownloads: 0 })

  // Chart data
  const donutData = [
    { name: "Downloaded", value: event.stats.downloaded, color: COLORS.downloaded },
    { name: "Pending", value: event.stats.pending, color: COLORS.pending }
  ]

  // Registration/Downloaded distribution by certificate type
  const CERT_COLORS = ["#6366f1", "#8b5cf6", "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#84cc16", "#ef4444"]
  const registrationData = event.certificateTypes.map((ct, index) => ({
    name: ct.name.length > 18 ? ct.name.substring(0, 18) + "..." : ct.name,
    value: registrationView === "registered" ? ct.stats.total : ct.stats.downloaded,
    color: CERT_COLORS[index % CERT_COLORS.length]
  }))
  const registrationTotal = registrationData.reduce((sum, d) => sum + d.value, 0)

  const barData = event.certificateTypes.map(ct => ({
    name: ct.name.length > 15 ? ct.name.substring(0, 15) + "..." : ct.name,
    Downloaded: ct.stats.downloaded,
    Pending: ct.stats.pending
  }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium mb-1">{label || payload[0]?.name}</p>
          {payload.map((entry: any, index: number) => (
            <p key={index} style={{ color: entry.color || entry.fill }}>
              {entry.name}: {entry.value}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="p-8 space-y-8 max-w-7xl mx-auto">
      {/* Pending Plan Upgrade Banner */}
      {session?.pendingPlan && (
        <div className="rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-gradient-to-r from-amber-500 to-orange-500 text-white flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">Complete Your {PLAN_FEATURES[session.pendingPlan]?.displayName} Upgrade!</p>
              <p className="text-sm text-amber-700 dark:text-amber-300">
                You selected the {PLAN_FEATURES[session.pendingPlan]?.displayName} plan during signup. Complete payment to unlock all features.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={dismissBanner} className="border-amber-300">Later</Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-sm hover:from-amber-600 hover:to-orange-600">
              <Link href={`/client/upgrade?pending=${session.pendingPlan}`}>Complete Payment</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Upgrade banner for free users (only if no pending plan) */}
      {showUpgradeBanner && !session?.pendingPlan && (
        <div className="rounded-xl border border-primary/20 bg-primary/5 p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
              <Crown className="h-5 w-5" />
            </div>
            <div>
              <p className="font-semibold">Unlock unlimited certificates and exports</p>
              <p className="text-sm text-muted-foreground">
                Upgrade now to keep your progress, add more events, and remove limits.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={dismissBanner}>Remind me later</Button>
            <Button asChild size="sm" className="bg-gradient-to-r from-purple-500 via-blue-500 to-sky-400 text-white shadow-sm">
              <Link href="/client/upgrade">Upgrade now</Link>
            </Button>
          </div>
        </div>
      )}

      {/* Header */}
      <div>
        <h1 className="text-3xl font-semibold tracking-tight">{event.name}</h1>
        <p className="text-muted-foreground mt-1">{event.description || "Dashboard Overview"}</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Certificates</span>
              <Award className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{event.stats.certificateTypesCount}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Attendees</span>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{event.stats.total}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Unique Downloads</span>
              <Download className="h-4 w-4 text-emerald-500" />
            </div>
            <p className="text-2xl font-bold text-emerald-600">{downloadStats.uniqueDownloads}</p>
            <p className="text-xs text-muted-foreground mt-1">{downloadStats.totalDownloads} total</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Pending</span>
              <Clock className="h-4 w-4 text-amber-500" />
            </div>
            <p className="text-2xl font-bold text-amber-600">{event.stats.pending}</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">Completion</span>
              <TrendingUp className="h-4 w-4 text-blue-500" />
            </div>
            <p className="text-2xl font-bold text-blue-600">{completionRate}%</p>
            <Progress value={completionRate} className="h-1.5 mt-2" />
          </CardContent>
        </Card>

        {hasCertificateLimit && (
          <Card>
            <CardContent className="p-5 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-muted-foreground block">Certificate limit</span>
                  <p className="text-xs text-muted-foreground">Plan limit: {certLimit} total</p>
                </div>
                <AlertTriangle className="h-4 w-4 text-amber-500" />
              </div>
              <div className="flex items-center justify-between text-sm font-semibold">
                <span>{event.stats.total} attendees</span>
                <span className={usagePercent >= 80 ? "text-red-600" : "text-emerald-600"}>{usagePercent}%</span>
              </div>
              <Progress value={usagePercent} className="h-2" />
              <Button
                asChild
                size="sm"
                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 text-white text-xs sm:text-sm"
              >
                <Link href="/client/upgrade">Upgrade for more</Link>
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Charts Section */}
      {(event.stats.total > 0 || event.certificateTypes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Registration Distribution Donut with Filter */}
          {event.certificateTypes.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold">
                    {registrationView === "registered" ? "Total Attendees" : "Total Downloaded"}
                  </CardTitle>
                  <Tabs value={registrationView} onValueChange={(v) => setRegistrationView(v as "registered" | "downloaded")}>
                    <TabsList className="h-8">
                      <TabsTrigger value="registered" className="text-xs px-2 h-6">Attendees</TabsTrigger>
                      <TabsTrigger value="downloaded" className="text-xs px-2 h-6">Downloaded</TabsTrigger>
                    </TabsList>
                  </Tabs>
                </div>
                <CardDescription>Distribution by certificate type</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px] relative">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={registrationData}
                        cx="50%"
                        cy="45%"
                        innerRadius={65}
                        outerRadius={90}
                        paddingAngle={2}
                        dataKey="value"
                        strokeWidth={0}
                      >
                        {registrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<CustomTooltip />} />
                      <Legend
                        verticalAlign="bottom"
                        height={50}
                        formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                    <p className="text-3xl font-bold">{registrationTotal}</p>
                    <p className="text-xs text-muted-foreground">{registrationView === "registered" ? "Total" : "Downloaded"}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}


          {/* Download Status Donut */}
          <Card>
            <CardHeader className="pb-0">
              <CardTitle className="text-base font-semibold">Download Status</CardTitle>
              <CardDescription>Overall completion progress</CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <div className="h-[280px] relative">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={donutData}
                      cx="50%"
                      cy="45%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {donutData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend
                      verticalAlign="bottom"
                      height={50}
                      formatter={(value) => <span className="text-xs text-foreground">{value}</span>}
                    />
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute top-[45%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                  <p className="text-3xl font-bold">{completionRate}%</p>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bar Chart */}
          {event.certificateTypes.length > 0 && (
            <Card>
              <CardHeader className="pb-0">
                <CardTitle className="text-base font-semibold">Certificate Comparison</CardTitle>
                <CardDescription>Downloaded vs Pending</CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={barData}
                      margin={{ top: 10, right: 10, left: -15, bottom: 40 }}
                      barCategoryGap="20%"
                    >
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                      <XAxis
                        dataKey="name"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        angle={-35}
                        textAnchor="end"
                        height={50}
                        axisLine={{ stroke: 'hsl(var(--border))' }}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                      <Legend
                        verticalAlign="top"
                        height={36}
                        formatter={(value) => <span className="text-xs">{value}</span>}
                      />
                      <Bar dataKey="Downloaded" fill={COLORS.downloaded} radius={[4, 4, 0, 0]} />
                      <Bar dataKey="Pending" fill={COLORS.pending} radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}

        </div>
      )}

      {/* Certificate Progress List */}
      {event.certificateTypes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Certificate Progress</CardTitle>
            <CardDescription>Detailed breakdown by certificate type</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[400px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={event.certificateTypes.map((ct, index) => ({
                    name: ct.name,
                    full_name: ct.name,
                    rate: ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0,
                    downloaded: ct.stats.downloaded,
                    total: ct.stats.total,
                    // Premium professional palette
                    fill: ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4", "#6366f1", "#d946ef"][index % 8]
                  }))}
                  margin={{ top: 20, right: 30, left: 20, bottom: 60 }}
                  barSize={40}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" opacity={0.4} />
                  <XAxis
                    dataKey="name"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    tickFormatter={(value) => value.length > 10 ? `${value.substring(0, 10)}...` : value}
                    interval={0}
                    angle={-45}
                    textAnchor="end"
                    height={60}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: 'hsl(var(--muted-foreground))' }}
                    domain={[0, 100]}
                    unit="%"
                  />
                  <Tooltip
                    cursor={{ fill: 'transparent' }}
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-transparent backdrop-blur-none border-none rounded-xl shadow-none p-3 text-sm ring-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-3 w-3 rounded-full" style={{ backgroundColor: data.fill }} />
                              <p className="font-semibold">{data.full_name}</p>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-muted-foreground">Progress</span>
                                <span className="font-medium" style={{ color: data.fill }}>{data.rate}%</span>
                              </div>
                              <div className="flex items-center justify-between gap-8">
                                <span className="text-muted-foreground">Downloads</span>
                                <span className="font-medium">{data.downloaded} / {data.total}</span>
                              </div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar
                    dataKey="rate"
                    radius={[10, 10, 0, 0]} // Rounded top only for vertical columns
                    background={{ fill: 'hsl(var(--muted))', radius: 10, opacity: 0.1 }}
                  >
                    {
                      event.certificateTypes.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b", "#f43f5e", "#06b6d4", "#6366f1", "#d946ef"][index % 8]} />
                      ))
                    }
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {event.stats.total === 0 && event.certificateTypes.length === 0 && (
        <Card className="col-span-full border-dashed">
          <CardContent className="flex flex-col items-center justify-center p-12 text-center h-[300px]">
            <div className="h-12 w-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Crown className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Attendees Yet</h3>
            <p className="text-sm text-muted-foreground max-w-[400px]">
              Once you add or import attendees, you'll see real-time statistics and download progress here.
            </p>
          </CardContent>
        </Card>
      )}


    </div>
  )
}
