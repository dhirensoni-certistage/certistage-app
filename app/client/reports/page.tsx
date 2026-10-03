"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
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
import { Download, Lock } from "lucide-react"
import Link from "next/link"
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
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-4">
        <div className="h-8 w-40 rounded bg-neutral-200 animate-pulse" />
        <div className="h-[140px] rounded-xl border border-neutral-200 bg-white animate-pulse" />
        <div className="h-[320px] rounded-xl border border-neutral-200 bg-white animate-pulse" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center">
        <h1 className="text-2xl font-semibold text-neutral-900 tracking-tight mb-2">No event selected</h1>
        <p className="text-[15px] text-neutral-500 max-w-[380px] mb-6">Pick an event to export its recipients and download activity.</p>
        <Button asChild className="h-10 px-5 bg-neutral-900 hover:bg-black"><Link href="/client/events">Go to events</Link></Button>
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
    XLSX.utils.book_append_sheet(wb, ws, "Recipients")
    XLSX.writeFile(wb, `${name}-recipients-${new Date().toISOString().split('T')[0]}.xlsx`)
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

  const quickExports = [
    { title: "All recipients", desc: "Every recipient across all certificates.", run: exportAll },
    { title: "Downloaded only", desc: "Recipients who have downloaded their certificate.", run: exportDownloaded },
    { title: "Pending only", desc: "Recipients who have not downloaded yet.", run: exportPending },
    { title: "By certificate", desc: "Recipients of one certificate.", run: () => setIsTemplateExportOpen(true) },
    { title: "Summary", desc: "Totals and completion rate per certificate.", run: exportSummary },
    { title: "Missing contacts", desc: "Recipients with no email or mobile on file.", run: exportMissingContacts },
    { title: "Top downloads", desc: "The 100 recipients with the most downloads.", run: exportTopDownloads }
  ]
  const selectClass = "h-9 text-[13px] border-neutral-200 bg-white"

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight leading-none">Reports</h1>
        <p className="text-[13px] text-neutral-500 mt-1.5">Export recipients and download activity for <span className="font-medium text-neutral-900">{event.name}</span> as Excel.</p>
      </div>

      {!canExport && (
        <div className="rounded-xl border border-gold/40 bg-gold-soft px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <Lock className="h-4 w-4 mt-0.5 text-gold-deep shrink-0" />
            <div>
              <p className="text-[14px] font-semibold text-neutral-900">Exports are part of the paid plans</p>
              <p className="text-[13px] text-neutral-600 mt-0.5">Your reports are ready; upgrading unlocks the download.</p>
            </div>
          </div>
          <Button asChild size="sm" className="h-9 px-4 bg-neutral-900 hover:bg-black text-white shrink-0"><Link href="/client/upgrade">See plans</Link></Button>
        </div>
      )}

      {/* Custom export */}
      <div className="rounded-xl border border-neutral-200 bg-white">
        <div className="px-5 pt-5 pb-3">
          <h2 className="text-[15px] font-semibold text-neutral-900">Custom export</h2>
          <p className="text-[12px] text-neutral-500">Filter by certificate, status and download date.</p>
        </div>
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-[12px] font-medium text-neutral-600 mb-1">Certificate</label>
            <Select value={certFilter} onValueChange={setCertFilter}>
              <SelectTrigger className={selectClass}><SelectValue placeholder="All certificates" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All certificates</SelectItem>
                {event.certificateTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-neutral-600 mb-1">Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className={selectClass}><SelectValue placeholder="Any" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any</SelectItem>
                <SelectItem value="downloaded">Downloaded</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-neutral-600 mb-1">Downloaded from</label>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="h-9 text-[13px] border-neutral-200" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-[12px] font-medium text-neutral-600 mb-1">To</label>
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="h-9 text-[13px] border-neutral-200" />
          </div>
          <div className="md:col-span-2">
            <Button onClick={exportCustom} disabled={!canExport} className="w-full h-9 bg-neutral-900 text-white hover:bg-black text-[13px]">
              <Download className="h-3.5 w-3.5 mr-1.5" /> Export
            </Button>
          </div>
        </div>
      </div>

      {/* Quick exports */}
      <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100">
          <h2 className="text-[15px] font-semibold text-neutral-900">Quick exports</h2>
        </div>
        <ul className="divide-y divide-neutral-100">
          {quickExports.map((q) => (
            <li key={q.title} className="flex items-center justify-between gap-4 px-5 py-3.5">
              <div className="min-w-0">
                <p className="text-[14px] font-medium text-neutral-900">{q.title}</p>
                <p className="text-[12.5px] text-neutral-500">{q.desc}</p>
              </div>
              <Button variant="outline" size="sm" onClick={q.run} disabled={!canExport} className="h-8 px-3 text-[13px] border-neutral-200 hover:bg-neutral-50 shrink-0">
                {canExport ? "Export" : <><Lock className="h-3 w-3 mr-1.5" /> Export</>}
              </Button>
            </li>
          ))}
        </ul>
      </div>

      <Dialog open={isTemplateExportOpen} onOpenChange={setIsTemplateExportOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Export by certificate</DialogTitle>
            <DialogDescription>Choose the certificate whose recipients you want to export.</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <Select value={templateExportId} onValueChange={setTemplateExportId}>
              <SelectTrigger className="h-10 border-neutral-200"><SelectValue placeholder="Select certificate" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All certificates</SelectItem>
                {event.certificateTypes.map((ct) => <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>)}
              </SelectContent>
            </Select>
            <div className="flex items-center justify-end gap-2 pt-2">
              <Button variant="outline" className="h-9" onClick={() => setIsTemplateExportOpen(false)}>Cancel</Button>
              <Button className="h-9 bg-neutral-900 text-white hover:bg-black" onClick={() => { exportByTemplate(); setIsTemplateExportOpen(false) }}>Export</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
