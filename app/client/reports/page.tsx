"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getClientSession, getCurrentPlanFeatures } from "@/lib/auth"
import {
  Download,
  FileSpreadsheet,
  Lock,
  Loader2,
  ArrowUpRight
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

interface EventRecipient {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
  status: "pending" | "downloaded"
  downloadedAt?: string
  downloadCount: number
}

interface CertificateType {
  id: string
  name: string
  recipients: EventRecipient[]
  stats: {
    total: number
    downloaded: number
    pending: number
  }
}

interface ReportEvent {
  _id: string
  name: string
  certificateTypes: CertificateType[]
  stats: {
    total: number
    downloaded: number
    pending: number
    certificateTypesCount: number
  }
}

export default function ClientReportsPage() {
  const router = useRouter()
  const [event, setEvent] = useState<ReportEvent | null>(null)
  const [certFilter, setCertFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [dateFrom, setDateFrom] = useState("")
  const [dateTo, setDateTo] = useState("")
  const [canExport, setCanExport] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [isTemplateExportOpen, setIsTemplateExportOpen] = useState(false)
  const [templateExportId, setTemplateExportId] = useState("all")

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
    const session = getClientSession()
    if (session) {
      if (session.eventId) fetchEventData(session.eventId)
      else setIsLoading(false)
      if (session.loginType === "user") {
        const planFeatures = getCurrentPlanFeatures()
        setCanExport(planFeatures.canExportReport)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  if (isLoading) {
    return (
      <div className="p-12 flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-200" />
        <p className="text-sm font-medium text-neutral-400">Generting report data...</p>
      </div>
    )
  }

  if (!event) {
    return (
      <div className="p-12 text-center py-24">
        <div className="h-16 w-16 rounded-2xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center mx-auto mb-6">
          <Search className="h-8 w-8 text-neutral-300" />
        </div>
        <h3 className="text-xl font-bold text-neutral-900 dark:text-white mb-2 tracking-tight">No report data</h3>
        <p className="text-[15px] text-neutral-500 max-w-[400px] mx-auto mb-10 leading-relaxed font-normal">
          Select an event to view detailed certificate reports and performance analytics.
        </p>
      </div>
    )
  }

  const getAllItems = () => {
    const all: { r: EventRecipient; ct: CertificateType }[] = []
    event.certificateTypes.forEach(ct => ct.recipients.forEach(r => all.push({ r, ct })))
    return all
  }
  const data = getAllItems()

  const exportData = (items: { r: EventRecipient; ct: CertificateType }[], name: string) => {
    if (!canExport) {
      toast.error("Export Locked", { description: "Upgrade your plan to unlock Report Export feature." })
      return
    }
    if (!items.length) return toast.error("No data to export")
    const rows = items.map((item, i) => ({
      "#": i + 1, "Certificate": item.ct.name, "Name": item.r.name, "Email": item.r.email || "-", "Mobile": item.r.mobile || "-",
      "Registration No": item.r.certificateId, "Status": item.r.status === "downloaded" ? "Downloaded" : "Pending",
      "Downloads": item.r.downloadCount, "Downloaded At": item.r.downloadedAt ? new Date(item.r.downloadedAt).toLocaleString() : "-"
    }))
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Attendees")
    XLSX.writeFile(wb, `${name}-attendees-${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success("File exported successfully!")
  }

  const exportSummary = () => {
    if (!canExport) {
      toast.error("Export Locked", { description: "Upgrade your plan to unlock Report Export feature." })
      return
    }
    const completionRate = Math.round((event.stats.downloaded / event.stats.total) * 100) || 0
    const rows = [
      { Metric: "Total Registered", Value: event.stats.total },
      { Metric: "Downloaded", Value: event.stats.downloaded },
      { Metric: "Pending", Value: event.stats.pending },
      { Metric: "Completion Rate", Value: `${completionRate}%` },
    ]
    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Summary")
    XLSX.writeFile(wb, `${event.name}-summary-${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success("Summary exported successfully!")
  }

  const applyCustomFilter = (items: { r: EventRecipient; ct: CertificateType }[]) => {
    let results = items
    if (certFilter !== "all") {
      results = results.filter(d => d.ct.id === certFilter)
    }
    if (statusFilter !== "all") {
      results = results.filter(d => d.r.status === statusFilter)
    }
    if (dateFrom || dateTo) {
      const from = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY
      const to = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : Number.POSITIVE_INFINITY
      results = results.filter(d => {
        if (!d.r.downloadedAt) return false
        const ts = new Date(d.r.downloadedAt).getTime()
        return ts >= from && ts <= to
      })
    }
    return results
  }

  const exportAll = () => exportData(getAllItems(), `${event.name}-all`)
  const exportDownloaded = () => exportData(data.filter(d => d.r.status === "downloaded"), `${event.name}-downloaded`)
  const exportPending = () => exportData(data.filter(d => d.r.status === "pending"), `${event.name}-pending`)
  const exportCustom = () => exportData(applyCustomFilter(getAllItems()), `${event.name}-custom`)
  const exportMissingContacts = () => exportData(
    getAllItems().filter(d => !d.r.email || !d.r.mobile),
    `${event.name}-missing-contacts`
  )
  const exportTopDownloads = () => {
    const items = getAllItems()
      .filter(d => d.r.downloadCount > 0)
      .sort((a, b) => b.r.downloadCount - a.r.downloadCount)
      .slice(0, 100)
    exportData(items, `${event.name}-top-downloads`)
  }
  const exportByTemplate = () => {
    if (templateExportId === "all") return exportAll()
    const ct = event.certificateTypes.find(t => t.id === templateExportId)
    if (!ct) return toast.error("Template not found")
    const items = ct.recipients.map(r => ({ r, ct }))
    exportData(items, `${event.name}-${ct.name}`)
  }

  return (
    <div className="p-8 max-w-7xl mx-auto flex flex-col animate-in fade-in duration-500 pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-[#888] uppercase tracking-[0.15em]">Analytics</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-[24px] font-semibold text-black tracking-tight leading-none">Data Reports</h1>
            {!canExport && (
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-amber-200 bg-amber-50 text-amber-700 text-[10px] font-semibold uppercase tracking-wider">
                <Lock className="h-3 w-3" /> Locked
              </div>
            )}
          </div>
        </div>

        <div />
      </div>

      {/* Export Center */}
      <Card className="border-neutral-200 dark:border-neutral-800 shadow-none bg-white dark:bg-neutral-950 overflow-hidden">
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold">Custom Report</p>
                <p className="text-[12px] text-neutral-500">Choose filters and export exactly what you need.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3 mb-4">
              <div className="md:col-span-5">
                <Select value={certFilter} onValueChange={setCertFilter}>
                  <SelectTrigger className="w-full h-10 border-neutral-200 dark:border-neutral-800">
                    <SelectValue placeholder="All Templates" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Templates</SelectItem>
                    {event.certificateTypes.map(ct => (
                      <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-3">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full h-10 border-neutral-200 dark:border-neutral-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="downloaded">Downloaded</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="md:col-span-4 grid grid-cols-2 gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-10 border-neutral-200 dark:border-neutral-800" />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-10 border-neutral-200 dark:border-neutral-800" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <p className="text-[11px] text-neutral-400">Date range applies to download activity timestamps only.</p>
              <Button onClick={exportCustom} className="h-9 bg-black text-white hover:bg-[#222]">
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Export Custom
              </Button>
            </div>
          </div>
          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold">Download All</p>
              <Badge variant="outline" className="text-[10px]">All Attendees</Badge>
            </div>
            <p className="text-[12px] text-neutral-500 mb-4">Full dataset for all templates and statuses.</p>
            <Button variant="outline" onClick={exportAll} className="h-9">
              <Download className="h-4 w-4 mr-2" />
              Download All
            </Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">Downloaded Only</p>
            <p className="text-[12px] text-neutral-500 mb-4">Only attendees who downloaded certificates.</p>
            <Button variant="outline" onClick={exportDownloaded} className="h-9">Export Downloaded</Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">Pending Only</p>
            <p className="text-[12px] text-neutral-500 mb-4">Attendees who haven’t downloaded yet.</p>
            <Button variant="outline" onClick={exportPending} className="h-9">Export Pending</Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">By Template</p>
            <p className="text-[12px] text-neutral-500 mb-4">Export attendees for a selected certificate template.</p>
            <Button variant="outline" onClick={() => setIsTemplateExportOpen(true)} className="h-9">Choose Template</Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">Summary Report</p>
            <p className="text-[12px] text-neutral-500 mb-4">High-level totals and completion rate.</p>
            <Button variant="outline" onClick={exportSummary} className="h-9">Export Summary</Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">Missing Contacts</p>
            <p className="text-[12px] text-neutral-500 mb-4">Attendees missing email or mobile.</p>
            <Button variant="outline" onClick={exportMissingContacts} className="h-9">Export Missing</Button>
          </div>

          <div className="p-5 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <p className="text-sm font-semibold mb-2">Top Downloads</p>
            <p className="text-[12px] text-neutral-500 mb-4">Top 100 attendees by download count.</p>
            <Button variant="outline" onClick={exportTopDownloads} className="h-9">Export Top 100</Button>
          </div>
        </div>
      </Card>

      {!canExport && (
        <div className="mt-6 p-4 rounded-xl border border-amber-200 bg-amber-50 dark:bg-amber-950/20 dark:border-amber-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Lock className="h-5 w-5 text-amber-600" />
            <p className="text-sm text-amber-800 dark:text-amber-400">Export feature is locked for your current plan. Upgrade to unlock full data extraction.</p>
          </div>
          <Button variant="ghost" className="text-amber-700 hover:text-amber-800 hover:bg-amber-100 dark:text-amber-400 dark:hover:bg-amber-900/50 h-8" onClick={() => router.push("/client/upgrade")}>
            Upgrade Plan <ArrowUpRight className="h-3 w-3 ml-2" />
          </Button>
        </div>
      )}

      <Dialog open={isTemplateExportOpen} onOpenChange={setIsTemplateExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export by Template</DialogTitle>
            <DialogDescription>Select a certificate template to export its attendees.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={templateExportId} onValueChange={setTemplateExportId}>
              <SelectTrigger className="h-10 border-neutral-200 dark:border-neutral-800">
                <SelectValue placeholder="Select template" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {event.certificateTypes.map(ct => (
                  <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" className="h-9" onClick={() => setIsTemplateExportOpen(false)}>Cancel</Button>
              <Button className="h-9 bg-black text-white hover:bg-[#222]" onClick={() => { exportByTemplate(); setIsTemplateExportOpen(false) }}>
                Export
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
