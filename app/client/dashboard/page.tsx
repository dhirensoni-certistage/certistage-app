"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ChevronRight, Users, Download, Clock, Award, CalendarDays } from "lucide-react"
import { BarChart, Bar, LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts"
import { Button } from "@/components/ui/button"
import { getClientSession, getPlanFeaturesMap, normalizePlanId } from "@/lib/auth"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"
import { cn } from "@/lib/utils"

const GOLD = "#C8961E"
const INK = "#171717"
const CHART_TOOLTIP = { backgroundColor: "#fff", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: INK, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }

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
      downloadedAt?: string
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
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<ReturnType<typeof getClientSession>>(null)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)

  const normalizePlan = (plan?: string) => normalizePlanId(plan)

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
      const result = await fetchClientProfile()
      if (!result.ok || !result.user) return
      const updated = applyProfileToSession(result.user)
      if (updated) setSession(updated)
    }
    syncPlanFromServer()
  }, [session?.userId, session?.loginType])

  useEffect(() => {
    if (!session || session.loginType !== "user") {
      setShowUpgradeBanner(false)
      return
    }
    // Only nudge free accounts, or anyone with an unpaid plan waiting
    const plan = normalizePlan(session.userPlan)
    setShowUpgradeBanner(plan === "free" || !!session.pendingPlan)
  }, [session])

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
        <div className="space-y-2">
          <div className="h-3 w-16 rounded bg-neutral-100 animate-pulse" />
          <div className="h-8 w-72 rounded bg-neutral-200 animate-pulse" />
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-[104px] rounded-xl border border-neutral-200 bg-white animate-pulse" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-[300px] rounded-xl border border-neutral-200 bg-white animate-pulse" />)}
        </div>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">No event selected</h1>
        <p className="text-[15px] text-neutral-500 max-w-[380px] mb-6">Pick an event to see its certificates and downloads, or create your first one.</p>
        <Button asChild className="h-10 px-5 bg-neutral-900 hover:bg-black">
          <Link href="/client/events">Go to events</Link>
        </Button>
      </div>
    )
  }

  const planId = session?.loginType === "user" ? normalizePlan(session.userPlan) : "enterprise"
  const planFeaturesMap = getPlanFeaturesMap()
  const planFeatures = planFeaturesMap[planId]
  const hasCertificateLimit = planFeatures.maxCertificates > 0
  const certLimit = planFeatures.maxCertificates
  const certUsed = event.stats.total
  const usagePercent = hasCertificateLimit ? Math.min(100, Math.round((certUsed / certLimit) * 100)) : 0
  const completionRate = event.stats.total > 0 ? Math.round((event.stats.downloaded / event.stats.total) * 100) : 0

  const byCertificate = event.certificateTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    total: ct.stats.total,
    downloaded: ct.stats.downloaded,
    pending: ct.stats.pending,
    completion: ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0
  }))

  const downloadsByDay = (() => {
    const days = 14
    const map = new Map<string, number>()
    const now = new Date()
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      map.set(d.toISOString().slice(0, 10), 0)
    }
    event.certificateTypes.forEach((ct) =>
      ct.recipients.forEach((r) => {
        if (!r.downloadedAt) return
        const key = new Date(r.downloadedAt).toISOString().slice(0, 10)
        if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
      })
    )
    return Array.from(map.entries()).map(([date, downloads]) => ({ date, downloads }))
  })()
  const recentDownloads = downloadsByDay.reduce((sum, d) => sum + d.downloads, 0)

  const stats = [
    { label: "Recipients", value: event.stats.total.toLocaleString("en-IN"), sub: `${event.stats.certificateTypesCount} certificate${event.stats.certificateTypesCount === 1 ? "" : "s"}`, icon: Users, tile: "bg-sky-50 text-sky-600" },
    { label: "Downloaded", value: event.stats.downloaded.toLocaleString("en-IN"), sub: `${recentDownloads} in the last 14 days`, icon: Download, tile: "bg-emerald-50 text-emerald-600", spark: true },
    { label: "Pending", value: event.stats.pending.toLocaleString("en-IN"), sub: "not downloaded yet", icon: Clock, tile: "bg-amber-50 text-amber-600" },
    { label: "Completion", value: `${completionRate}%`, sub: "of recipients downloaded", icon: Award, tile: "bg-gold-soft text-gold-deep", bar: completionRate }
  ]

  const hour = new Date().getHours()
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening"
  const firstName = (session?.userName || "").trim().split(" ")[0]
  const today = new Date().toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric", year: "numeric" })

  const fade = (delay: number) => ({ initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.35, delay } })

  return (
    <div className="p-4 md:p-8 max-w-[1200px] mx-auto space-y-6">
      {/* Plan nudge: free accounts and unpaid upgrades only */}
      {showUpgradeBanner && (
        <motion.div {...fade(0)} className="rounded-xl border border-gold/40 bg-gold-soft px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <p className="text-[14px] font-semibold text-neutral-900">
              {session?.pendingPlan ? `Complete payment for your ${planFeaturesMap[session.pendingPlan]?.displayName} plan` : "You are on the Free plan"}
            </p>
            <p className="text-[13px] text-neutral-600 mt-0.5">
              {session?.pendingPlan ? "Your plan activates as soon as the payment goes through." : "Paid plans add more certificates, Excel import and report exports."}
            </p>
          </div>
          <Button asChild size="sm" className="h-9 px-4 bg-neutral-900 hover:bg-black text-white shrink-0">
            <Link href={session?.pendingPlan ? "/client/complete-payment" : "/client/upgrade"}>{session?.pendingPlan ? "Complete payment" : "See plans"}</Link>
          </Button>
        </motion.div>
      )}

      {/* Header */}
      <motion.div {...fade(0.05)} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-[26px] md:text-[30px] font-semibold text-neutral-900 tracking-tight leading-tight">
            {greeting}{firstName ? `, ${firstName}` : ""}
          </h1>
          <p className="text-[14px] text-neutral-500 mt-1 truncate">
            Here is how <span className="font-medium text-neutral-900">{event.name}</span> is doing.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="hidden md:inline-flex items-center gap-2 h-9 px-3.5 rounded-md border border-neutral-200 bg-white text-[13px] text-neutral-700">
            <CalendarDays className="h-4 w-4 text-neutral-400" /> {today}
          </span>
          <Button variant="outline" asChild size="sm" className="h-9 px-3.5 text-[13px] border-neutral-200 bg-white hover:bg-neutral-50 text-neutral-700 w-fit">
            <Link href="/client/events" className="flex items-center gap-1.5">Switch event <ChevronRight className="h-3.5 w-3.5 opacity-60" /></Link>
          </Button>
        </div>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fade(0.1 + i * 0.05)} className="relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5">
            <div className="flex items-center gap-3">
              <span className={cn("h-9 w-9 rounded-lg flex items-center justify-center shrink-0", s.tile)}>
                <s.icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
              </span>
              <p className="text-[13px] text-neutral-500">{s.label}</p>
            </div>
            <p className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-none mt-4">{s.value}</p>
            {s.bar !== undefined ? (
              <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mt-3.5">
                <motion.div initial={{ width: 0 }} animate={{ width: `${s.bar}%` }} transition={{ duration: 0.8, delay: 0.4 }} className="h-full rounded-full" style={{ background: GOLD }} />
              </div>
            ) : (
              <p className="text-[12px] text-neutral-400 mt-3 truncate">{s.sub}</p>
            )}
            {s.spark && downloadsByDay.some((d) => d.downloads > 0) && (
              <div className="hidden md:block absolute right-3 bottom-3 h-10 w-[42%] pointer-events-none">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={downloadsByDay} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.25} />
                        <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <Area type="monotone" dataKey="downloads" stroke="#10b981" strokeWidth={1.5} fill="url(#sparkFill)" dot={false} isAnimationActive={false} />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Plan usage */}
      {hasCertificateLimit && (
        <motion.div {...fade(0.3)} className="rounded-xl border border-neutral-200 bg-white px-5 py-4">
          <div className="flex items-center justify-between gap-4 text-[13px]">
            <p className="text-neutral-600">
              <span className="font-medium text-neutral-900">{certUsed.toLocaleString("en-IN")}</span> of {certLimit.toLocaleString("en-IN")} certificates used on the {planFeatures.displayName} plan
            </p>
            {(usagePercent >= 80 || planId === "free") && (
              <Link href="/client/upgrade" className="font-medium text-neutral-900 underline underline-offset-4 hover:text-gold-deep whitespace-nowrap">Upgrade</Link>
            )}
          </div>
          <div className="h-1.5 w-full bg-neutral-100 rounded-full overflow-hidden mt-3">
            <div className={cn("h-full rounded-full", usagePercent >= 90 ? "bg-red-500" : "bg-neutral-900")} style={{ width: `${usagePercent}%` }} />
          </div>
        </motion.div>
      )}

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div {...fade(0.35)} className="rounded-xl border border-neutral-200 bg-white">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[15px] font-semibold text-neutral-900">Downloads by certificate</h2>
            <p className="text-[12px] text-neutral-500">Downloaded vs total recipients</p>
          </div>
          <div className="h-[240px] px-3 pb-3">
            {byCertificate.length === 0 ? (
              <p className="text-[13px] text-neutral-400 px-2 pt-8">No certificates yet.</p>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={byCertificate} margin={{ top: 8, right: 8, left: -20, bottom: 0 }} barGap={4}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v: string) => (v.length > 14 ? v.slice(0, 12) + ".." : v)} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                  <Tooltip cursor={{ fill: "#FAFAFA" }} contentStyle={CHART_TOOLTIP} />
                  <Bar dataKey="total" name="Recipients" fill="#E5E5E5" radius={[4, 4, 0, 0]} maxBarSize={36} />
                  <Bar dataKey="downloaded" name="Downloaded" radius={[4, 4, 0, 0]} maxBarSize={36}>
                    {byCertificate.map((_, i) => <Cell key={i} fill={INK} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>

        <motion.div {...fade(0.4)} className="rounded-xl border border-neutral-200 bg-white">
          <div className="px-5 pt-5 pb-3">
            <h2 className="text-[15px] font-semibold text-neutral-900">Downloads over time</h2>
            <p className="text-[12px] text-neutral-500">Last 14 days, by most recent download</p>
          </div>
          <div className="h-[240px] px-3 pb-3">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={downloadsByDay} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F0F0F0" />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} tickFormatter={(v: string) => v.slice(5)} dy={8} />
                <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                <Tooltip contentStyle={CHART_TOOLTIP} />
                <Line type="monotone" dataKey="downloads" name="Downloads" stroke={GOLD} strokeWidth={2} dot={false} activeDot={{ r: 4, fill: GOLD }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      {/* Per-certificate table */}
      <motion.div {...fade(0.45)} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-neutral-900">Certificates</h2>
          <Link href="/client/certificates" className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                <th className="px-5 py-3 font-medium">Certificate</th>
                <th className="px-5 py-3 font-medium text-right">Recipients</th>
                <th className="px-5 py-3 font-medium text-right">Downloaded</th>
                <th className="px-5 py-3 font-medium text-right">Pending</th>
                <th className="px-5 py-3 font-medium w-[200px]">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {byCertificate.length === 0 && (
                <tr><td colSpan={5} className="px-5 py-8 text-center text-neutral-400">No certificates yet. <Link href="/client/certificates" className="text-neutral-900 underline underline-offset-4">Create one</Link>.</td></tr>
              )}
              {byCertificate.map((ct) => (
                <tr key={ct.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-neutral-900">
                    <Link href={`/client/certificates?type=${ct.id}`} className="hover:underline underline-offset-4">{ct.name}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.total.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.downloaded.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.pending.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-1.5 bg-neutral-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${ct.completion}%`, background: GOLD }} />
                      </div>
                      <span className="w-10 text-right font-medium text-neutral-900">{ct.completion}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  )
}
