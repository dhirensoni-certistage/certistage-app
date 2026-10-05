"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { motion } from "framer-motion"
import { ArrowRight, ChevronRight, Users, Download, Clock, Award, CalendarDays, Linkedin, BarChart3, Table2 } from "lucide-react"
import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, LabelList } from "recharts"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClientSession, getPlanFeaturesMap, normalizePlanId } from "@/lib/auth"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"
import { cn } from "@/lib/utils"

const GOLD = "#C8961E"
const GOLD_DEEP = "#9A6B12"
const GOLD_SOFT = "#EFE3C4" // lighter step of the same ramp: the "not yet downloaded" part of each bar
const INK = "#171717"
const CHART_TOOLTIP = { backgroundColor: "#fff", border: "1px solid #E5E5E5", borderRadius: "8px", fontSize: "12px", color: INK, boxShadow: "0 4px 12px rgba(0,0,0,0.06)" }

// Chart filters: one row above the charts, scoping both of them
const RANGES: { id: string; label: string; days: number | null }[] = [
  { id: "7", label: "7 days", days: 7 },
  { id: "14", label: "14 days", days: 14 },
  { id: "30", label: "30 days", days: 30 },
  { id: "90", label: "90 days", days: 90 },
  { id: "all", label: "All time", days: null }
]
const dayKey = (d: Date) => d.toISOString().slice(0, 10)
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const shortDate = (iso: string) => { const d = new Date(`${iso}T00:00:00`); return `${d.getDate()} ${MONTHS[d.getMonth()]}` }
// Axis ticks: the day number, with the month only on the first tick and the 1st of a month ("22 Sep, 23, 24 … 1 Oct, 2")
const axisDate = (iso: string, index: number) => { const d = new Date(`${iso}T00:00:00`); return index === 0 || d.getDate() === 1 ? shortDate(iso) : String(d.getDate()) }
// Single-line category label, truncated with an ellipsis instead of wrapped by recharts
const CategoryTick = ({ x, y, payload }: { x?: number; y?: number; payload?: { value?: string } }) => {
  const v = String(payload?.value ?? "")
  return <text x={x} y={y} dy={4} textAnchor="end" fontSize={12} fill="#525252"><title>{v}</title>{v.length > 18 ? v.slice(0, 17) + "…" : v}</text>
}

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
      linkedin?: number
    }
  }[]
  stats: {
    total: number
    downloaded: number
    pending: number
    linkedin?: number
    certificateTypesCount: number
  }
}

export default function ClientDashboard() {
  const [event, setEvent] = useState<DashboardEvent | null>(null)
  const [issued, setIssued] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [session, setSession] = useState<ReturnType<typeof getClientSession>>(null)
  const [showUpgradeBanner, setShowUpgradeBanner] = useState(false)
  const [rangeId, setRangeId] = useState("14")
  const [typeFilter, setTypeFilter] = useState("all")
  const [chartView, setChartView] = useState<"chart" | "table">("chart")
  const [activeBar, setActiveBar] = useState<number | null>(null)

  const normalizePlan = (plan?: string) => normalizePlanId(plan)

  const fetchEventData = async (eventId: string) => {
    try {
      const [res, usageRes] = await Promise.all([
        fetch(`/api/client/dashboard?eventId=${eventId}`),
        fetch("/api/client/usage")
      ])
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
      }
      if (usageRes.ok) {
        const usage = await usageRes.json()
        if (typeof usage.usage?.certificates === "number") setIssued(usage.usage.certificates)
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
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          {Array.from({ length: 5 }).map((_, i) => <div key={i} className={cn("h-[104px] rounded-xl border border-neutral-200 bg-white animate-pulse", i === 4 && "col-span-2 lg:col-span-1")} />)}
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
  const certUsed = issued ?? event.stats.total
  const usagePercent = hasCertificateLimit ? Math.min(100, Math.round((certUsed / certLimit) * 100)) : 0
  const completionRate = event.stats.total > 0 ? Math.round((event.stats.downloaded / event.stats.total) * 100) : 0
  const linkedinCount = event.stats.linkedin ?? 0
  const linkedinRate = event.stats.downloaded > 0 ? Math.round((linkedinCount / event.stats.downloaded) * 100) : 0

  const byCertificate = event.certificateTypes.map((ct) => ({
    id: ct.id,
    name: ct.name,
    total: ct.stats.total,
    downloaded: ct.stats.downloaded,
    pending: ct.stats.pending,
    linkedin: ct.stats.linkedin ?? 0,
    completion: ct.stats.total > 0 ? Math.round((ct.stats.downloaded / ct.stats.total) * 100) : 0
  }))

  // Downloads per day for a set of certificates over the last `days` days (null = since the first download)
  const buildDownloadsByDay = (types: DashboardEvent["certificateTypes"], days: number | null) => {
    const now = new Date()
    const dates = types.flatMap((ct) => ct.recipients.filter((r) => r.downloadedAt).map((r) => new Date(r.downloadedAt as string)))
    let span = days ?? 14
    if (days === null && dates.length > 0) {
      const earliest = Math.min(...dates.map((d) => d.getTime()))
      span = Math.min(365, Math.max(14, Math.ceil((now.getTime() - earliest) / 86400000) + 1))
    }
    const map = new Map<string, number>()
    for (let i = span - 1; i >= 0; i--) {
      const d = new Date(now)
      d.setDate(now.getDate() - i)
      map.set(dayKey(d), 0)
    }
    dates.forEach((d) => {
      const key = dayKey(d)
      if (map.has(key)) map.set(key, (map.get(key) || 0) + 1)
    })
    return Array.from(map.entries()).map(([date, downloads]) => ({ date, downloads }))
  }
  const downloadsByDay = buildDownloadsByDay(event.certificateTypes, 14)
  const recentDownloads = downloadsByDay.reduce((sum, d) => sum + d.downloads, 0)

  // Chart scope from the filter row
  const range = RANGES.find((r) => r.id === rangeId) || RANGES[1]
  const rangeStart = range.days === null ? null : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - (range.days - 1)); return d })()
  const chartTypes = typeFilter === "all" ? event.certificateTypes : event.certificateTypes.filter((ct) => ct.id === typeFilter)
  const chartByCertificate = chartTypes.map((ct) => {
    const downloaded = rangeStart
      ? ct.recipients.filter((r) => r.downloadedAt && new Date(r.downloadedAt) >= rangeStart).length
      : ct.stats.downloaded
    return { id: ct.id, name: ct.name, total: ct.stats.total, downloaded, pending: Math.max(0, ct.stats.total - downloaded), completion: ct.stats.total > 0 ? Math.round((downloaded / ct.stats.total) * 100) : 0 }
  })
  const chartByDay = buildDownloadsByDay(chartTypes, range.days)
  const chartDownloads = chartByDay.reduce((sum, d) => sum + d.downloads, 0)
  const rangeLabel = range.days === null ? "all time" : `the last ${range.days} days`
  // Label every day up to two weeks; beyond that recharts spaces the ticks
  const tickInterval: number | "preserveStartEnd" = chartByDay.length <= 14 ? 0 : "preserveStartEnd"

  const stats = [
    { label: "Recipients", value: event.stats.total.toLocaleString("en-IN"), sub: `${event.stats.certificateTypesCount} certificate${event.stats.certificateTypesCount === 1 ? "" : "s"}`, icon: Users, tile: "bg-sky-50 text-sky-600" },
    { label: "Downloaded", value: event.stats.downloaded.toLocaleString("en-IN"), sub: `${recentDownloads} in the last 14 days`, icon: Download, tile: "bg-emerald-50 text-emerald-600", spark: true },
    { label: "Pending", value: event.stats.pending.toLocaleString("en-IN"), sub: "not downloaded yet", icon: Clock, tile: "bg-amber-50 text-amber-600" },
    { label: "Completion", value: `${completionRate}%`, sub: "of recipients downloaded", icon: Award, tile: "bg-gold-soft text-gold-deep", bar: completionRate },
    // Recipients who opened "Add to LinkedIn profile" (LinkedIn does not report whether they saved it)
    { label: "LinkedIn", value: linkedinCount.toLocaleString("en-IN"), sub: event.stats.downloaded > 0 ? `Clicked by ${linkedinRate}% of people who downloaded` : "No downloads yet", icon: Linkedin, tile: "bg-[#0A66C2]/10 text-[#0A66C2]", wrap: true }
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
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fade(0.1 + i * 0.05)} className={cn("relative overflow-hidden rounded-xl border border-neutral-200 bg-white p-5", i === stats.length - 1 && "col-span-2 lg:col-span-1")}>
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
              <p className={cn("text-[12px] text-neutral-400 mt-3", s.wrap ? "leading-snug" : "truncate")}>{s.sub}</p>
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
              <span className="font-medium text-neutral-900">{certUsed.toLocaleString("en-IN")}</span> of {certLimit.toLocaleString("en-IN")} certificates issued on the {planFeatures.displayName} plan
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

      {/* Chart filters: one row, scoping both charts below */}
      <motion.div {...fade(0.33)} className="flex flex-wrap items-center gap-2">
        <div role="group" aria-label="Date range" className="inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white p-0.5">
          {RANGES.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setRangeId(r.id)}
              aria-pressed={rangeId === r.id}
              className={cn("h-8 px-3 rounded text-[12.5px] font-medium transition-colors", rangeId === r.id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50")}
            >
              {r.label}
            </button>
          ))}
        </div>
        {event.certificateTypes.length > 1 && (
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="h-9 w-[220px] text-[13px] border-neutral-200 bg-white rounded-md" aria-label="Certificate">
              <SelectValue placeholder="All certificates" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All certificates</SelectItem>
              {event.certificateTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
            </SelectContent>
          </Select>
        )}
        <div role="group" aria-label="View" className="ml-auto inline-flex h-9 items-center rounded-md border border-neutral-200 bg-white p-0.5">
          {([["chart", BarChart3, "Charts"], ["table", Table2, "Table"]] as const).map(([id, Icon, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => setChartView(id)}
              aria-pressed={chartView === id}
              title={label}
              className={cn("h-8 px-2.5 rounded inline-flex items-center gap-1.5 text-[12.5px] font-medium transition-colors", chartView === id ? "bg-neutral-900 text-white" : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50")}
            >
              <Icon className="h-3.5 w-3.5" /> <span className="hidden sm:inline">{label}</span>
            </button>
          ))}
        </div>
      </motion.div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <motion.div {...fade(0.35)} className="rounded-xl border border-neutral-200 bg-white">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">Downloads by certificate</h2>
              <p className="text-[12px] text-neutral-500">Downloaded in {rangeLabel} vs recipients</p>
            </div>
            <div className="flex items-center gap-3 text-[11.5px] text-neutral-600 shrink-0 pt-0.5">
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GOLD_DEEP }} /> Downloaded</span>
              <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: GOLD_SOFT }} /> Not yet</span>
            </div>
          </div>
          {chartByCertificate.length === 0 ? (
            <p className="text-[13px] text-neutral-400 px-5 pb-8 pt-4">No certificates yet.</p>
          ) : chartView === "table" ? (
            <table className="w-full text-[13px] mb-2">
              <thead>
                <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-y border-neutral-100">
                  <th className="px-5 py-2.5 font-medium text-left">Certificate</th>
                  <th className="px-5 py-2.5 font-medium text-right">Downloaded</th>
                  <th className="px-5 py-2.5 font-medium text-right">Recipients</th>
                  <th className="px-5 py-2.5 font-medium text-right">Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {chartByCertificate.map((ct) => (
                  <tr key={ct.id}>
                    <td className="px-5 py-2.5 text-neutral-900 truncate max-w-[220px]" title={ct.name}>{ct.name}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-neutral-700">{ct.downloaded.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-neutral-700">{ct.total.toLocaleString("en-IN")}</td>
                    <td className="px-5 py-2.5 text-right tabular-nums text-neutral-900 font-medium">{ct.completion}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="px-3 pb-4" style={{ height: Math.max(220, 48 + chartByCertificate.length * 44) }}>
              <ResponsiveContainer width="100%" height="100%">
                {/* One row per certificate: downloaded (deep gold) and not yet (light gold) add up to the recipients */}
                <BarChart data={chartByCertificate} layout="vertical" margin={{ top: 4, right: 56, left: 4, bottom: 0 }} barCategoryGap={12} onMouseLeave={() => setActiveBar(null)}>
                  <CartesianGrid horizontal={false} stroke="#F0F0F0" />
                  <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={128} axisLine={false} tickLine={false} tick={<CategoryTick />} />
                  {/* Each bar is its own hit target: no band cursor, one tooltip for the hovered row */}
                  <Tooltip
                    cursor={false}
                    shared={false}
                    contentStyle={CHART_TOOLTIP}
                    itemStyle={{ color: INK }}
                    labelStyle={{ color: INK, fontWeight: 600 }}
                    formatter={(value: number, name: string, item: any) => {
                      const row = item?.payload as (typeof chartByCertificate)[number] | undefined
                      if (name === "Downloaded") return [`${value.toLocaleString("en-IN")} of ${row ? row.total.toLocaleString("en-IN") : "?"} (${row?.completion ?? 0}%)`, "Downloaded"]
                      return [value.toLocaleString("en-IN"), "Not yet downloaded"]
                    }}
                  />
                  <Bar dataKey="downloaded" name="Downloaded" stackId="r" barSize={20} stroke="#fff" strokeWidth={2} radius={[4, 0, 0, 4]} isAnimationActive={false}
                    onMouseEnter={(_: unknown, i: number) => setActiveBar(i)} onMouseLeave={() => setActiveBar(null)}>
                    {chartByCertificate.map((_, i) => <Cell key={i} fill={activeBar === i ? INK : GOLD_DEEP} />)}
                  </Bar>
                  <Bar dataKey="pending" name="Not yet" stackId="r" barSize={20} stroke="#fff" strokeWidth={2} radius={[0, 4, 4, 0]} isAnimationActive={false}
                    onMouseEnter={(_: unknown, i: number) => setActiveBar(i)} onMouseLeave={() => setActiveBar(null)}>
                    {chartByCertificate.map((_, i) => <Cell key={i} fill={activeBar === i ? "#D9C58F" : GOLD_SOFT} />)}
                    <LabelList dataKey="completion" position="right" offset={8} formatter={(v: number) => `${v}%`} style={{ fontSize: 11.5, fill: "#525252" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>

        <motion.div {...fade(0.4)} className="rounded-xl border border-neutral-200 bg-white">
          <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold text-neutral-900">Downloads over time</h2>
              <p className="text-[12px] text-neutral-500">{range.days === null ? "Since the first download" : `Last ${range.days} days`}, by each person&apos;s most recent download</p>
            </div>
            <p className="text-[12px] text-neutral-500 shrink-0 pt-0.5"><span className="font-semibold text-neutral-900 text-[14px]">{chartDownloads.toLocaleString("en-IN")}</span> in {rangeLabel}</p>
          </div>
          {chartView === "table" ? (
            <div className="max-h-[260px] overflow-y-auto mb-2">
              <table className="w-full text-[13px]">
                <thead className="sticky top-0 bg-white">
                  <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-y border-neutral-100">
                    <th className="px-5 py-2.5 font-medium text-left">Date</th>
                    <th className="px-5 py-2.5 font-medium text-right">Downloads</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-neutral-100">
                  {[...chartByDay].reverse().map((d) => (
                    <tr key={d.date} className={d.downloads === 0 ? "text-neutral-400" : ""}>
                      <td className="px-5 py-2 text-neutral-700">{shortDate(d.date)}</td>
                      <td className="px-5 py-2 text-right tabular-nums">{d.downloads.toLocaleString("en-IN")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="h-[240px] px-3 pb-3">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartByDay} margin={{ top: 8, right: 12, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="downloadsWash" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={GOLD} stopOpacity={0.14} />
                      <stop offset="100%" stopColor={GOLD} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid vertical={false} stroke="#F0F0F0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} interval={tickInterval} minTickGap={28} tick={{ fontSize: 11, fill: "#888" }} tickFormatter={axisDate} dy={8} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: "#888" }} allowDecimals={false} />
                  {/* Crosshair finds the day; the tooltip reads the value for it */}
                  <Tooltip cursor={{ stroke: "#D4D4D4", strokeWidth: 1 }} contentStyle={CHART_TOOLTIP} itemStyle={{ color: INK }} labelStyle={{ color: INK, fontWeight: 600 }} labelFormatter={(v: string) => shortDate(v)} formatter={(v: number) => [v.toLocaleString("en-IN"), "Downloads"]} />
                  <Area type="monotone" dataKey="downloads" name="Downloads" stroke={GOLD} strokeWidth={2} fill="url(#downloadsWash)" dot={false} activeDot={{ r: 4, fill: GOLD, stroke: "#fff", strokeWidth: 2 }} isAnimationActive={false} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </motion.div>
      </div>

      {/* Per-certificate table */}
      <motion.div {...fade(0.45)} className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between">
          <h2 className="text-[15px] font-semibold text-neutral-900">Certificates</h2>
          <Link href="/client/certificates" className="text-[13px] font-medium text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1">Manage <ArrowRight className="h-3.5 w-3.5" /></Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-[13px]">
            <thead>
              <tr className="text-[11px] uppercase tracking-wider text-neutral-500 border-b border-neutral-100">
                <th className="px-5 py-3 font-medium">Certificate</th>
                <th className="px-5 py-3 font-medium text-right">Recipients</th>
                <th className="px-5 py-3 font-medium text-right">Downloaded</th>
                <th className="px-5 py-3 font-medium text-right">Pending</th>
                <th className="px-5 py-3 font-medium text-right">LinkedIn clicks</th>
                <th className="px-5 py-3 font-medium w-[200px]">Completion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {byCertificate.length === 0 && (
                <tr><td colSpan={6} className="px-5 py-8 text-center text-neutral-400">No certificates yet. <Link href="/client/certificates" className="text-neutral-900 underline underline-offset-4">Create one</Link>.</td></tr>
              )}
              {byCertificate.map((ct) => (
                <tr key={ct.id} className="hover:bg-neutral-50/60 transition-colors">
                  <td className="px-5 py-3.5 font-medium text-neutral-900">
                    <Link href={`/client/certificates?type=${ct.id}`} className="hover:underline underline-offset-4">{ct.name}</Link>
                  </td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.total.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.downloaded.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.pending.toLocaleString("en-IN")}</td>
                  <td className="px-5 py-3.5 text-right text-neutral-700">{ct.linkedin.toLocaleString("en-IN")}</td>
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
