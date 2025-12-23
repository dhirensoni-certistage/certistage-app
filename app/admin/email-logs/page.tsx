"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Mail,
  Search,
  Eye,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock,
  Send,
  Loader2,
  ChevronLeft,
  ChevronRight
} from "lucide-react"
import { toast } from "sonner"
import { format } from "date-fns"

interface EmailLog {
  id: string
  to: string
  subject: string
  template: string
  status: "initiated" | "sent" | "failed" | "read"
  errorMessage?: string
  metadata?: any
  sentAt?: string
  createdAt: string
  htmlContent?: string
}

interface Stats {
  total: number
  initiated: number
  sent: number
  failed: number
  read: number
}

export default function EmailLogsPage() {
  const [logs, setLogs] = useState<EmailLog[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [status, setStatus] = useState("all")
  const [template, setTemplate] = useState("all")
  const [dateRange, setDateRange] = useState("all")
  const [templates, setTemplates] = useState<string[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, initiated: 0, sent: 0, failed: 0, read: 0 })
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, totalPages: 0 })
  
  // Preview dialog
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLog, setPreviewLog] = useState<EmailLog | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        search,
        status,
        template,
        dateRange
      })

      const res = await fetch(`/api/admin/email-logs?${params}`)
      const data = await res.json()

      if (res.ok) {
        setLogs(data.logs)
        setStats(data.stats)
        setTemplates(data.templates)
        setPagination(prev => ({ ...prev, ...data.pagination }))
      }
    } catch (error) {
      toast.error("Failed to fetch email logs")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchLogs()
  }, [pagination.page, status, template, dateRange])

  const handleSearch = () => {
    setPagination(prev => ({ ...prev, page: 1 }))
    fetchLogs()
  }

  const handlePreview = async (logId: string) => {
    setLoadingPreview(true)
    setPreviewOpen(true)
    try {
      const res = await fetch(`/api/admin/email-logs/${logId}`)
      const data = await res.json()
      if (res.ok) {
        setPreviewLog(data)
      }
    } catch (error) {
      toast.error("Failed to load email preview")
    }
    setLoadingPreview(false)
  }

  const handleDelete = async (logId: string) => {
    if (!confirm("Delete this email log?")) return
    
    try {
      const res = await fetch(`/api/admin/email-logs/${logId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Email log deleted")
        fetchLogs()
      }
    } catch (error) {
      toast.error("Failed to delete")
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "sent":
        return <Badge className="bg-emerald-100 text-emerald-700"><CheckCircle className="h-3 w-3 mr-1" />Sent</Badge>
      case "failed":
        return <Badge variant="destructive"><XCircle className="h-3 w-3 mr-1" />Failed</Badge>
      case "initiated":
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Initiated</Badge>
      case "read":
        return <Badge className="bg-blue-100 text-blue-700"><Eye className="h-3 w-3 mr-1" />Read</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getTemplateLabel = (template: string) => {
    const labels: Record<string, string> = {
      welcome: "Welcome Email",
      emailVerification: "Email Verification",
      passwordReset: "Password Reset",
      paymentSuccess: "Payment Success",
      invoice: "Invoice",
      adminNotification: "Admin Notification",
      custom: "Custom"
    }
    return labels[template] || template
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Mail className="h-6 w-6" />
            Email Logs
          </h1>
          <p className="text-muted-foreground">Track all sent emails with preview</p>
        </div>
        <Button onClick={fetchLogs} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Send className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Total</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-amber-500" />
              <span className="text-sm text-muted-foreground">Initiated</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-amber-600">{stats.initiated}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
              <span className="text-sm text-muted-foreground">Sent</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-emerald-600">{stats.sent}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <XCircle className="h-4 w-4 text-red-500" />
              <span className="text-sm text-muted-foreground">Failed</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-red-600">{stats.failed}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-blue-500" />
              <span className="text-sm text-muted-foreground">Read</span>
            </div>
            <p className="text-2xl font-bold mt-1 text-blue-600">{stats.read}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by email or subject..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  className="pl-9"
                />
              </div>
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="initiated">Initiated</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="read">Read</SelectItem>
              </SelectContent>
            </Select>
            <Select value={template} onValueChange={setTemplate}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="All Templates" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Templates</SelectItem>
                {templates.map(t => (
                  <SelectItem key={t} value={t}>{getTemplateLabel(t)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Time</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">Last 7 Days</SelectItem>
                <SelectItem value="month">Last 30 Days</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Email Logs Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[50px]">#</TableHead>
                <TableHead>To</TableHead>
                <TableHead>Template</TableHead>
                <TableHead className="hidden md:table-cell">Subject</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Date</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                  </TableCell>
                </TableRow>
              ) : logs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                    No email logs found
                  </TableCell>
                </TableRow>
              ) : (
                logs.map((log, index) => (
                  <TableRow key={log.id}>
                    <TableCell className="text-muted-foreground">
                      {(pagination.page - 1) * pagination.limit + index + 1}
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{log.to}</div>
                      {log.metadata?.userName && (
                        <div className="text-xs text-muted-foreground">{log.metadata.userName}</div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className="font-normal">
                        {getTemplateLabel(log.template)}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell max-w-[300px] truncate">
                      {log.subject}
                    </TableCell>
                    <TableCell>{getStatusBadge(log.status)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {format(new Date(log.createdAt), "dd MMM, yy HH:mm")}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePreview(log.id)}
                          title="Preview"
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(log.id)}
                          className="text-red-500 hover:text-red-600"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t">
              <div className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.limit + 1} to{" "}
                {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page - 1 }))}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPagination(p => ({ ...p, page: p.page + 1 }))}
                  disabled={pagination.page === pagination.totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Email Preview
            </DialogTitle>
          </DialogHeader>
          {loadingPreview ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : previewLog ? (
            <div className="flex-1 overflow-auto">
              <div className="space-y-4 mb-4">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">To:</span>
                    <span className="ml-2 font-medium">{previewLog.to}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Status:</span>
                    <span className="ml-2">{getStatusBadge(previewLog.status)}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Subject:</span>
                    <span className="ml-2 font-medium">{previewLog.subject}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Template:</span>
                    <span className="ml-2">{getTemplateLabel(previewLog.template)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sent At:</span>
                    <span className="ml-2">
                      {previewLog.sentAt 
                        ? format(new Date(previewLog.sentAt), "dd MMM yyyy, HH:mm:ss")
                        : "Not sent"
                      }
                    </span>
                  </div>
                </div>
                {previewLog.errorMessage && (
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
                    <strong>Error:</strong> {previewLog.errorMessage}
                  </div>
                )}
              </div>
              <div className="border rounded-lg overflow-hidden bg-white">
                <iframe
                  srcDoc={previewLog.htmlContent}
                  className="w-full h-[500px] border-0"
                  title="Email Preview"
                />
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  )
}
