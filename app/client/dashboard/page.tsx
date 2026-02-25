"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
// Remove Tabs if not strictly needed or restyle them. Keeping for functionality but will restyle.
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
  Loader2,
  ChevronRight,
  ArrowUpRight
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
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from "recharts"
import { motion } from "framer-motion" // Added framer-motion
import { DashboardCardSkeleton, ChartSkeleton } from "@/components/ui/skeletons"
import { cn } from "@/lib/utils"

const COLORS = {
  downloaded: "#171717", // Neutral 900
  pending: "#E5E5E5"     // Neutral 200
}

const StatCard = ({ item, index }: { item: any; index: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay: index * 0.1, duration: 0.4 }}
  >
    <Card className="border border-[#E5E5E5] shadow-sm hover:shadow-md transition-all duration-300 bg-white group overflow-hidden relative h-[128px]">
      <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowUpRight className="w-4 h-4 text-neutral-400" />
      </div>
      <CardContent className="p-5 h-full flex flex-col justify-center gap-3">
        <div className="flex items-center justify-between h-5">
          <span className="text-[13px] font-medium text-[#666] tracking-wide">{item.label}</span>
          <div className={cn("h-8 w-8 rounded-full bg-[#FAFAFA] flex items-center justify-center", item.bgClass)}>
            <item.icon className={cn("h-4 w-4", item.color)} />
          </div>
        </div>
        <div className="grid grid-cols-[1fr_auto] items-end min-h-[32px] gap-2">
          <p className="text-[28px] font-semibold text-[#171717] tracking-tight leading-none">{item.val}</p>
          {item.sub ? (
            <p className="text-[10px] text-[#888] font-medium whitespace-nowrap truncate max-w-[90px] text-right">{item.sub}</p>
          ) : (
            <span className="text-[10px] text-transparent select-none">spacer</span>
          )}
        </div>
        <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
          {item.label === "Completion" ? (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: item.progressVal }} // expects '87%' string
              transition={{ duration: 1, delay: 0.5 }}
              className="h-full bg-black rounded-full"
            />
          ) : (
            <div className="h-full w-0" />
          )}
        </div>
      </CardContent>
    </Card>
  </motion.div>
)

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

  const normalizePlan = (plan?: string): "free" | "professional" | "enterprise" | "premium" => {
    const candidate = String(plan || "free").toLowerCase()
    const validPlans = ["free", "professional", "enterprise", "premium"]
    return validPlans.includes(candidate) ? (candidate as "free" | "professional" | "enterprise" | "premium") : "free"
  }

  const fetchEventData = async (eventId: string) => {
    try {
      const res = await fetch(`/api/client/dashboard?eventId=${eventId}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
      }
    } catch (error) { }
    setIsLoading(false)
  }

  useEffect(() => {
    const currentSession = getClientSession()
    setSession(currentSession)
    if (currentSession?.eventId) {
      fetchEventData(currentSession.eventId)
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    const syncPlanFromServer = async () => {
      if (!session?.userId || session.loginType !== "user") return
      try {
        const res = await fetch(`/api/client/profile?userId=${encodeURIComponent(session.userId)}`)
        if (!res.ok) return
        const data = await res.json()
        const serverPlan = normalizePlan(data.user?.plan)
        const updatedSession = {
          ...session,
          userPlan: serverPlan,
          planExpiresAt: data.user?.planExpiresAt,
          pendingPlan: data.user?.pendingPlan || session.pendingPlan || null
        }
        localStorage.setItem("clientSession", JSON.stringify(updatedSession))
        setSession(updatedSession)
      } catch (error) {
        console.error("Failed to sync dashboard plan:", error)
      }
    }

    syncPlanFromServer()
  }, [session?.userId, session?.loginType])

  useEffect(() => {
    if (!session || session.loginType !== "user") {
      setShowUpgradeBanner(false)
      return
    }
    const plan = session.userPlan || "free"
    if (plan === "premium" && !session.pendingPlan) {
      setShowUpgradeBanner(false)
      return
    }
    setShowUpgradeBanner(true)
  }, [session])

  if (isLoading) {
    return (
      <div className="p-8 space-y-8 max-w-7xl mx-auto animate-in fade-in duration-500">
        <div className="space-y-4">
          <div className="h-8 w-64 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse" />
          <div className="h-4 w-48 bg-neutral-100 dark:bg-neutral-900 rounded-md animate-pulse opacity-60" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <DashboardCardSkeleton key={i} />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {Array.from({ length: 3 }).map((_, i) => <ChartSkeleton key={i} />)}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-[80vh] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="h-16 w-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mb-6">
          <Award className="h-8 w-8 text-neutral-400" />
        </div>
        <h1 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">Welcome to CertiStage</h1>
        <p className="text-[15px] text-neutral-500 max-w-[400px] mb-8 font-normal leading-relaxed">
          You haven't created any events yet. Start by setting up your first event to issue certificates.
        </p>
        <div className="flex items-center gap-3">
          <Button asChild className="h-10 px-6 font-semibold shadow-sm">
            <Link href="/client/events">Create First Event</Link>
          </Button>
          <Button variant="outline" asChild className="h-10 px-6 border-neutral-200 dark:border-neutral-800">
            <Link href="/client/support">View Guide</Link>
          </Button>
        </div>
      </div>
    )
  }

  const planId = session?.loginType === "user" ? normalizePlan(session.userPlan) : "enterprise"
  const planFeatures = PLAN_FEATURES[planId]
  const hasCertificateLimit = planFeatures.maxCertificates > 0
  const certLimit = planFeatures.maxCertificates
  const certUsed = event.stats.total
  const usagePercent = hasCertificateLimit ? Math.min(100, Math.round((certUsed / certLimit) * 100)) : 0
  const completionRate = event.stats.total > 0 ? Math.round((event.stats.downloaded / event.stats.total) * 100) : 0

  const donutData = [
    { name: "Downloaded", value: event.stats.downloaded, color: COLORS.downloaded },
    { name: "Pending", value: event.stats.pending, color: COLORS.pending }
  ]

  // Beautiful monochrome scale
  const CERT_COLORS = ["#171717", "#404040", "#737373", "#A3A3A3", "#D4D4D4", "#E5E5E5"]
  const registrationData = event.certificateTypes.map((ct, index) => ({
    name: ct.name,
    value: registrationView === "registered" ? ct.stats.total : ct.stats.downloaded,
    color: CERT_COLORS[index % CERT_COLORS.length]
  }))

  const allRecipients = event.certificateTypes.flatMap(ct =>
    ct.recipients.map(r => ({ ...r, certTypeName: ct.name }))
  )

  const pendingByTemplate = event.certificateTypes
    .map(ct => ({
      name: ct.name,
      pending: ct.stats.pending,
      total: ct.stats.total,
      completion: ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0
    }))
    .sort((a, b) => b.pending - a.pending)
    .slice(0, 5)

  const topTemplates = event.certificateTypes
    .map(ct => ({
      name: ct.name,
      completion: ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0,
      downloaded: ct.stats.downloaded,
      total: ct.stats.total
    }))
    .sort((a, b) => b.completion - a.completion)
    .slice(0, 5)

  const downloadsByDay = (() => {
    const days = 14
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      const key = d.toISOString().slice(0, 10)
      map.set(key, 0)
    }
    allRecipients.forEach(r => {
      if (!r.downloadedAt) return
      const key = new Date(r.downloadedAt).toISOString().slice(0, 10)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([date, downloads]) => ({
      date,
      downloads
    }))
  })()

  return (
    <div className="min-h-screen w-full bg-[#FDFDFD] text-[#171717] relative">
      {/* Background Texture from Login Page */}
      <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#D4D4D4 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="relative z-10 p-8 space-y-8 max-w-[1400px] mx-auto">

        {/* Banner */}
        {showUpgradeBanner && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xl border border-[#E5E5E5] bg-white p-1 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-sm group"
          >
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-black" />
            <div className="flex items-center gap-4 p-5">
              <div className="h-10 w-10 rounded-full bg-[#FAFAFA] border border-[#EBEBEB] text-black flex items-center justify-center shrink-0">
                <Crown className="h-5 w-5" />
              </div>
              <div>
                <p className="font-semibold text-[15px] text-[#171717] tracking-tight">
                  {session?.pendingPlan ? `Finalize your ${PLAN_FEATURES[session.pendingPlan]?.displayName} Plan` : "Upgrade to Pro"}
                </p>
                <p className="text-[13px] text-[#666] font-medium mt-0.5">
                  Unlock higher limits and remove branding.
                </p>
              </div>
            </div>
            <div className="p-5 pt-0 md:pt-5">
              <Button asChild className="h-9 px-6 bg-black hover:bg-[#333] text-white font-medium text-[13px] shadow-sm transition-all rounded-md">
                <Link href="/client/upgrade">View Options</Link>
              </Button>
            </div>
          </motion.div>
        )}

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5 }}
          className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-[#F0F0F0]"
        >
          <div>

            <h1 className="text-[32px] font-semibold text-[#171717] tracking-tight leading-none">Event Analytics</h1>
            <p className="text-[14px] text-[#666] mt-2 font-medium">Real-time insights for your credentialing campaigns.</p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" asChild size="sm" className="h-9 px-4 text-[13px] font-medium border-[#E5E5E5] bg-white hover:bg-[#FAFAFA] text-[#333] shadow-sm transition-all hover:border-[#D4D4D4]">
              <Link href="/client/events" className="flex items-center gap-2">
                Switch Event
                <ChevronRight className="h-3.5 w-3.5 opacity-50" />
              </Link>
            </Button>
          </div>
        </motion.div>

        {/* Grid Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {[
            { label: "Attendees", val: event.stats.total, icon: Users, color: "text-[#171717]", bgClass: "bg-blue-50/50" },
            { label: "Downloaded", val: event.stats.downloaded, icon: Download, color: "text-[#171717]", bgClass: "bg-neutral-50/50" },
            { label: "Pending", val: event.stats.pending, icon: Clock, color: "text-[#888]", bgClass: "bg-gray-50" },
            { label: "Templates", val: event.stats.certificateTypesCount, icon: Award, color: "text-[#171717]", bgClass: "bg-purple-50/50" },
            { label: "Completion", val: `${completionRate}%`, icon: TrendingUp, color: "text-[#171717]", bgClass: "", progressVal: `${completionRate}%` },
            {
              label: "Usage",
              val: `${usagePercent}%`,
              icon: AlertTriangle,
              color: usagePercent > 80 ? "text-red-600" : "text-[#171717]",
              bgClass: usagePercent > 80 ? "bg-red-50" : "bg-gray-50",
              sub: `${certUsed}/${certLimit} issued`
            },
          ].map((s, i) => (
            <StatCard key={i} item={s} index={i} />
          ))}
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#F5F5F5]">
                <div>
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Completion Rate</CardTitle>
                  <CardDescription className="text-[12px] font-medium text-[#888]">Downloaded vs Pending</CardDescription>
                </div>
                <div className="text-right">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#FAFAFA] border border-[#EBEBEB]">
                    <div className="w-2 h-2 rounded-full bg-black"></div>
                    <span className="text-[12px] font-bold text-[#171717]">{completionRate}% Done</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={donutData}
                        cx="50%"
                        cy="50%"
                        innerRadius={70}
                        outerRadius={90}
                        paddingAngle={0}
                        dataKey="value"
                        strokeWidth={0}
                        startAngle={90}
                        endAngle={-270}
                      >
                        {donutData.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: "#171717", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                        itemStyle={{ color: "#171717", fontWeight: 500 }}
                      />
                      <Legend
                        verticalAlign="bottom"
                        align="center"
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: "12px", paddingTop: "24px", fontWeight: 500, color: "#666" }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#F5F5F5]">
                <div>
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Template Performance</CardTitle>
                  <CardDescription className="text-[12px] font-medium text-[#888]">Breakdown by certificate type</CardDescription>
                </div>
                <Tabs value={registrationView} onValueChange={(v) => setRegistrationView(v as "registered" | "downloaded")}>
                <TabsList className="h-8 bg-[#F5F5F5] p-0.5 border border-[#EBEBEB] rounded-lg">
                    <TabsTrigger value="registered" className="text-[11px] h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#666]">Total</TabsTrigger>
                    <TabsTrigger value="downloaded" className="text-[11px] h-7 px-3 rounded-md data-[state=active]:bg-white data-[state=active]:shadow-sm data-[state=active]:text-black text-[#666]">Downloaded</TabsTrigger>
                </TabsList>
              </Tabs>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={registrationData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis
                        dataKey="name"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#888", fontWeight: 500 }}
                        tickFormatter={(v) => v.length > 12 ? v.substring(0, 10) + ".." : v}
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} />
                      <Tooltip
                        cursor={{ fill: "#FAFAFA" }}
                        contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: "#171717", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                        itemStyle={{ color: "#171717" }}
                      />
                      <Bar dataKey="value" radius={[4, 4, 0, 0]} barSize={40}>
                        {registrationData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Trend + Follow-up */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} className="lg:col-span-2">
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="flex flex-row items-center justify-between pb-4 border-b border-[#F5F5F5]">
                <div>
                  <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Downloads Over Time</CardTitle>
                  <CardDescription className="text-[12px] font-medium text-[#888]">Last 14 days activity</CardDescription>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="h-[240px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={downloadsByDay} margin={{ top: 10, right: 20, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                      <XAxis
                        dataKey="date"
                        axisLine={false}
                        tickLine={false}
                        tick={{ fontSize: 11, fill: "#888", fontWeight: 500 }}
                        tickFormatter={(v) => v.slice(5)}
                        dy={10}
                      />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} />
                      <Tooltip
                        contentStyle={{ backgroundColor: "rgba(255, 255, 255, 0.95)", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: "#171717", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}
                        itemStyle={{ color: "#171717" }}
                      />
                      <Line type="monotone" dataKey="downloads" stroke="#171717" strokeWidth={2} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="pb-4 border-b border-[#F5F5F5]">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Pending Follow‑Up</CardTitle>
                <CardDescription className="text-[12px] font-medium text-[#888]">Templates with most pending</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-4">
                {pendingByTemplate.length === 0 ? (
                  <p className="text-[12px] text-[#888]">No pending attendees.</p>
                ) : (
                  pendingByTemplate.map((t, i) => (
                    <div key={i} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="text-[12px] font-medium text-[#171717] truncate">{t.name}</div>
                        <div className="text-[12px] text-[#666]">{t.pending} pending</div>
                      </div>
                      <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                        <div className="h-full bg-[#171717]" style={{ width: `${t.completion}%` }} />
                      </div>
                    </div>
                  ))
                )}
                <Button asChild variant="outline" size="sm" className="w-full mt-2 border-[#E5E5E5]">
                  <Link href="/client/reports">View Pending Report</Link>
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Funnel + Top Templates + Limit Usage */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="pb-4 border-b border-[#F5F5F5]">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Delivery Funnel</CardTitle>
                <CardDescription className="text-[12px] font-medium text-[#888]">Issued → Downloaded → Pending</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                {(() => {
                  const issued = event.stats.total
                  const downloaded = event.stats.downloaded
                  const pending = event.stats.pending
                  const downloadedPct = issued > 0 ? Math.round((downloaded / issued) * 100) : 0
                  const pendingPct = issued > 0 ? Math.round((pending / issued) * 100) : 0
                  const steps = [
                    { label: "Issued", value: issued, pct: 100 },
                    { label: "Downloaded", value: downloaded, pct: downloadedPct },
                    { label: "Pending", value: pending, pct: pendingPct },
                  ]

                  return (
                    <div className="space-y-4">
                      {steps.map((s, i) => (
                        <div key={i} className="space-y-2">
                          <div className="flex items-center justify-between text-[12px]">
                            <span className="text-[#666]">{s.label}</span>
                            <span className="font-medium text-[#171717]">{s.value}</span>
                          </div>
                          <div className="h-1.5 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                            <div className="h-full bg-[#171717]" style={{ width: `${s.pct}%` }} />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                })()}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="pb-4 border-b border-[#F5F5F5]">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Top Template Performance</CardTitle>
                <CardDescription className="text-[12px] font-medium text-[#888]">Highest completion rates</CardDescription>
              </CardHeader>
              <CardContent className="pt-4 space-y-3">
                {topTemplates.length === 0 ? (
                  <p className="text-[12px] text-[#888]">No templates yet.</p>
                ) : (
                  topTemplates.map((t, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="min-w-0">
                        <p className="text-[12px] font-medium text-[#171717] truncate">{t.name}</p>
                        <p className="text-[11px] text-[#888]">{t.downloaded}/{t.total}</p>
                      </div>
                      <div className="text-[12px] font-semibold text-[#171717]">{t.completion}%</div>
                    </div>
                  ))
                )}
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
            <Card className="border border-[#E5E5E5] shadow-sm bg-white h-full">
              <CardHeader className="pb-4 border-b border-[#F5F5F5]">
                <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Certificate Limit Usage</CardTitle>
                <CardDescription className="text-[12px] font-medium text-[#888]">Plan usage overview</CardDescription>
              </CardHeader>
              <CardContent className="pt-5 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[12px] text-[#666]">Used</p>
                    <p className="text-[20px] font-semibold text-[#171717]">{certUsed}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[12px] text-[#666]">Limit</p>
                    <p className="text-[14px] font-semibold text-[#171717]">{certLimit}</p>
                  </div>
                </div>
                <div className="h-2 w-full bg-[#F0F0F0] rounded-full overflow-hidden">
                  <div className="h-full bg-[#171717]" style={{ width: `${usagePercent}%` }} />
                </div>
                <p className="text-[11px] text-[#888]">{usagePercent}% of plan limit used</p>
                {usagePercent > 80 && (
                  <Button asChild size="sm" className="h-8 px-3 bg-black text-white hover:bg-[#222]">
                    <Link href="/client/upgrade">Upgrade for more</Link>
                  </Button>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Details List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
          <Card className="border border-[#E5E5E5] shadow-sm bg-white overflow-hidden">
            <CardHeader className="border-b border-[#F5F5F5] py-4">
              <CardTitle className="text-[15px] font-semibold tracking-tight text-[#171717]">Workspace Overview</CardTitle>
              <CardDescription className="text-[12px] font-medium text-[#888]">Detailed performance for each certificate template</CardDescription>
            </CardHeader>
            <div>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-[13px]">
                  <thead>
                    <tr className="bg-[#FAFAFA] text-[#888] uppercase text-[10px] font-bold tracking-wider border-b border-[#EBEBEB]">
                      <th className="px-6 py-3 font-semibold">Template Name</th>
                      <th className="px-6 py-3 font-semibold">Status</th>
                      <th className="px-6 py-3 font-semibold">Attendees</th>
                      <th className="px-6 py-3 font-semibold">Success Rate</th>
                      <th className="px-6 py-3 text-right font-semibold">Avg. Progress</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F5F5F5]">
                    {event.certificateTypes.map((ct, i) => {
                      const rate = ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0
                      return (
                        <tr key={ct.id} className="hover:bg-[#FAFAFA] transition-colors group">
                          <td className="px-6 py-4 font-medium text-[#171717]">{ct.name}</td>
                          <td className="px-6 py-4">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F5F5] text-[#666] border border-[#E5E5E5] uppercase tracking-wide">
                              Active
                            </span>
                          </td>
                          <td className="px-6 py-4 text-[#666] font-medium">{ct.stats.downloaded} <span className="text-[#AAA] font-normal mx-1">/</span> {ct.stats.total}</td>
                          <td className="px-6 py-4 font-semibold text-[#171717]">{rate}%</td>
                          <td className="px-6 py-4 max-w-[140px]">
                            <div className="flex items-center justify-end">
                              <div className="w-24 h-1.5 bg-[#F0F0F0] rounded-full overflow-hidden">
                                <div className="h-full bg-[#171717] transition-all duration-1000 ease-out" style={{ width: `${rate}%` }} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </Card>
        </motion.div>
      </div>
    </div>
  )
}

