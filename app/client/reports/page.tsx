"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { getClientSession, getCurrentPlanFeatures, getTrialStatus } from "@/lib/auth"
import {
  Download,
  FileSpreadsheet,
  Search,
  CheckCircle2,
  Clock,
  X,
  ChevronLeft,
  ChevronRight,
  Lock
} from "lucide-react"
import * as XLSX from "xlsx"
import { toast } from "sonner"

// Types for API response
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
  const [search, setSearch] = useState("")
  const [canExport, setCanExport] = useState(true)
  const [isLoading, setIsLoading] = useState(true)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)

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
    const session = getClientSession()
    if (session) {
      if (session.eventId) {
        fetchEventData(session.eventId)
      } else {
        setIsLoading(false)
      }

      if (session.loginType === "user") {
        const planFeatures = getCurrentPlanFeatures()
        setCanExport(planFeatures.canExportReport)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  // Reset to first page when filters or page size change
  useEffect(() => {
    setCurrentPage(1)
  }, [certFilter, statusFilter, search, rowsPerPage])

  if (isLoading) {
    return <div className="p-8"><p className="text-muted-foreground">Loading...</p></div>
  }

  if (!event) {
    return <div className="p-8"><p className="text-muted-foreground">Loading...</p></div>
  }

  // Get filtered data
  const getData = () => {
    const results: { r: EventRecipient; ct: CertificateType }[] = []
    const types = certFilter === "all" ? event.certificateTypes : event.certificateTypes.filter(t => t.id === certFilter)
    
    types.forEach(ct => {
      ct.recipients.forEach(r => {
        if (statusFilter !== "all" && r.status !== statusFilter) return
        if (search) {
          const q = search.toLowerCase()
          if (!r.name?.toLowerCase().includes(q) && !r.email?.toLowerCase().includes(q) && !r.certificateId?.toLowerCase().includes(q)) return
        }
        results.push({ r, ct })
      })
    })
    return results
  }

  const data = getData()
  const hasFilters = certFilter !== "all" || statusFilter !== "all" || search

  const totalPages = Math.max(1, Math.ceil(data.length / rowsPerPage))
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedData = data.slice(startIndex, endIndex)

  // Export - show upgrade toast if not allowed
  const exportData = (items: { r: EventRecipient; ct: CertificateType }[], name: string) => {
    if (!canExport) {
      toast.error("Upgrade your plan to unlock Report Export feature", {
        action: {
          label: "Upgrade",
          onClick: () => router.push("/client/upgrade")
        }
      })
      return
    }
    if (!items.length) return toast.error("No data to export")

    const rows = items.map((item, i) => ({
      "#": i + 1,
      "Certificate": item.ct.name,
      "Name": item.r.name,
      "Email": item.r.email || "-",
      "Mobile": item.r.mobile || "-",
      "Registration No": item.r.certificateId,
      "Status": item.r.status === "downloaded" ? "Downloaded" : "Pending",
      "Downloads": item.r.downloadCount,
      "Downloaded At": item.r.downloadedAt ? new Date(item.r.downloadedAt).toLocaleString() : "-"
    }))

    const ws = XLSX.utils.json_to_sheet(rows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Report")
    XLSX.writeFile(wb, `${name}-${new Date().toISOString().split('T')[0]}.xlsx`)
    toast.success(`Exported ${items.length} records`)
  }

  const clearFilters = () => {
    setCertFilter("all")
    setStatusFilter("all")
    setSearch("")
  }

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">Reports</h1>
          <p className="text-muted-foreground mt-1">Export certificate data</p>
        </div>
        {!canExport && (
          <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-900/20">
            <Lock className="h-3 w-3 mr-1" />
            Export Locked
          </Badge>
        )}
      </div>

      {/* Quick Export */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            const all: { r: EventRecipient; ct: CertificateType }[] = []
            event.certificateTypes.forEach(ct => ct.recipients.forEach(r => all.push({ r, ct })))
            exportData(all, `${event.name}-all`)
          }}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="font-semibold">Export All</p>
              <p className="text-sm text-muted-foreground">{event.stats.total} recipients</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            const items: { r: EventRecipient; ct: CertificateType }[] = []
            event.certificateTypes.forEach(ct => ct.recipients.filter(r => r.status === "downloaded").forEach(r => items.push({ r, ct })))
            exportData(items, `${event.name}-downloaded`)
          }}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <CheckCircle2 className="h-6 w-6 text-emerald-600" />
            </div>
            <div>
              <p className="font-semibold">Downloaded Only</p>
              <p className="text-sm text-muted-foreground">{event.stats.downloaded} recipients</p>
            </div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-muted/50 transition-colors"
          onClick={() => {
            const items: { r: EventRecipient; ct: CertificateType }[] = []
            event.certificateTypes.forEach(ct => ct.recipients.filter(r => r.status === "pending").forEach(r => items.push({ r, ct })))
            exportData(items, `${event.name}-pending`)
          }}
        >
          <CardContent className="p-5 flex items-center gap-4">
            <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Clock className="h-6 w-6 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold">Pending Only</p>
              <p className="text-sm text-muted-foreground">{event.stats.pending} recipients</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export by Certificate Type */}
      {event.certificateTypes.length > 1 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Export by Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {event.certificateTypes.map(ct => (
                <Button
                  key={ct.id}
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const items = ct.recipients.map(r => ({ r, ct }))
                    exportData(items, `${event.name}-${ct.name}`)
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1.5" />
                  {ct.name}
                  <Badge variant="secondary" className="ml-2 text-xs">{ct.stats.total}</Badge>
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-base">All Recipients</CardTitle>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email, or certificate ID..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={certFilter} onValueChange={setCertFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Certificate" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Certificates</SelectItem>
                {event.certificateTypes.map(ct => (
                  <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="downloaded">Downloaded</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              variant="outline" 
              size="default"
              onClick={() => exportData(data, `${event.name}-filtered`)}
              disabled={!data.length}
            >
              <Download className="h-4 w-4 mr-1.5" />
              Export ({data.length})
            </Button>
            {hasFilters && (
              <Button variant="ghost" size="icon" onClick={clearFilters}>
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>

          {/* Table with inner scroll + sticky header & footer (similar to Recipients page) */}
          <div className="border rounded-lg overflow-hidden flex flex-col max-h-[480px]">
            {/* Scrollable table area */}
            <div className="flex-1 overflow-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 bg-muted/60 backdrop-blur z-10">
                  <tr>
                    <th className="w-[60px] text-center px-3 py-2 font-medium text-muted-foreground">#</th>
                    <th className="w-[200px] text-left px-3 py-2 font-medium text-muted-foreground">Name</th>
                    <th className="w-[150px] text-left px-3 py-2 font-medium text-muted-foreground hidden md:table-cell">
                      Certificate
                    </th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground hidden lg:table-cell">
                      Email
                    </th>
                    <th className="w-[120px] text-center px-3 py-2 font-medium text-muted-foreground">Status</th>
                    <th className="w-[100px] text-center px-3 py-2 font-medium text-muted-foreground">Downloads</th>
                  </tr>
                </thead>
                <tbody>
                  {data.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="h-24 text-center text-muted-foreground">
                        No recipients found
                      </td>
                    </tr>
                  ) : (
                    paginatedData.map((item, i) => (
                      <tr key={`${item.ct.id}-${item.r.id}`} className="border-t hover:bg-muted/40">
                        <td className="px-3 py-2 text-center text-muted-foreground">
                          {startIndex + i + 1}
                        </td>
                        <td className="px-3 py-2">
                          <p className="font-medium truncate">{item.r.name}</p>
                          <p className="text-xs text-muted-foreground md:hidden truncate">{item.ct.name}</p>
                        </td>
                        <td className="px-3 py-2 hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">{item.ct.name}</Badge>
                        </td>
                        <td className="px-3 py-2 hidden lg:table-cell text-muted-foreground truncate">
                          {item.r.email || "-"}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {item.r.status === "downloaded" ? (
                            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                              Downloaded
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-amber-600">
                              Pending
                            </Badge>
                          )}
                        </td>
                        <td className="px-3 py-2 text-center font-medium">
                          {item.r.downloadCount}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Sticky footer with totals + pagination (like Recipients) */}
            <div className="mt-auto flex-shrink-0 bg-background border-t px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Total: <span className="text-primary font-medium">{data.length}</span>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Rows</span>
                  <Select value={String(rowsPerPage)} onValueChange={(v) => setRowsPerPage(Number(v))}>
                    <SelectTrigger className="w-[80px] h-8">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <span className="text-sm text-muted-foreground">
                  Showing {data.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, data.length)} of {data.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                  >
                    {currentPage}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
