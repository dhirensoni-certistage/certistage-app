"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { getClientSession, getTrialStatus, getCurrentPlanFeatures } from "@/lib/auth"
import { 
  Users, FileSpreadsheet, Search, Trash2, Download, Plus, Lock,
  UserPlus, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle
} from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Skeleton } from "@/components/ui/skeleton"
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

interface ApiEvent {
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

export default function RecipientsPage() {
  const [event, setEvent] = useState<ApiEvent | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [addToTypeId, setAddToTypeId] = useState<string>("")
  const [isLoading, setIsLoading] = useState(true)
  const [rowsPerPage, setRowsPerPage] = useState(10)
  const [currentPage, setCurrentPage] = useState(1)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<{ type: 'single' | 'bulk'; recipient?: EventRecipient & { certTypeId: string } } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [isUserLogin, setIsUserLogin] = useState(false)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [canImportData, setCanImportData] = useState(true)
  const [maxCertificates, setMaxCertificates] = useState<number>(-1) // -1 = unlimited

  // Form fields
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMobile, setFormMobile] = useState("")
  const [formCertId, setFormCertId] = useState("")

  // Fetch event data from API
  const fetchEventData = async (evtId: string) => {
    try {
      const res = await fetch(`/api/client/dashboard?eventId=${evtId}`)
      if (res.ok) {
        const data = await res.json()
        setEvent(data.event)
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error)
    }
    setIsLoading(false)
  }

  const refreshData = (isInitial = false) => {
    const session = getClientSession()
    if (session) {
      if (session.eventId) {
        setEventId(session.eventId)
        fetchEventData(session.eventId)
      } else {
        setIsLoading(false)
      }
      
      if (session.userId) {
        setUserId(session.userId)
      }
      
      if (session.loginType === "user") {
        setIsUserLogin(true)
        const trialStatus = getTrialStatus(session.userId)
        setIsTrialExpired(trialStatus.isExpired)
        const planFeatures = getCurrentPlanFeatures()
        setCanImportData(planFeatures.canImportData)
        setMaxCertificates(planFeatures.maxCertificates)
      } else {
        setIsUserLogin(false)
        setCanImportData(true)
        setMaxCertificates(-1)
      }
      
      if (isInitial) {
        setIsLoading(false)
      }
    } else {
      setIsLoading(false)
    }
  }

  // Initial load
  useEffect(() => { 
    setIsLoading(true)
    refreshData(true)
  }, [])
  
  // Background refresh
  useEffect(() => {
    const interval = setInterval(() => {
      if (eventId) {
        fetchEventData(eventId)
      }
    }, 10000) // Refresh every 10 seconds
    return () => clearInterval(interval)
  }, [eventId])

  // Get all recipients across all certificate types
  const getAllRecipients = (): (EventRecipient & { certTypeName: string; certTypeId: string })[] => {
    if (!event) return []
    const allRecipients: (EventRecipient & { certTypeName: string; certTypeId: string })[] = []
    
    event.certificateTypes.forEach(certType => {
      certType.recipients.forEach(recipient => {
        allRecipients.push({
          ...recipient,
          certTypeName: certType.name,
          certTypeId: certType.id
        })
      })
    })
    
    return allRecipients
  }

  // Filter recipients
  const getFilteredRecipients = () => {
    let recipients = getAllRecipients()

    // Filter by certificate type
    if (selectedTypeId !== "all") {
      recipients = recipients.filter(r => r.certTypeId === selectedTypeId)
    }

    // Filter by status
    if (statusFilter !== "all") {
      recipients = recipients.filter(r => r.status === statusFilter)
    }

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      recipients = recipients.filter(r => 
        r.name?.toLowerCase().includes(query) ||
        r.email?.toLowerCase().includes(query) ||
        r.mobile?.includes(query) ||
        r.certificateId?.toLowerCase().includes(query)
      )
    }

    return recipients
  }

  const filteredRecipients = getFilteredRecipients()
  const allRecipients = getAllRecipients()

  // Pagination
  const totalPages = Math.ceil(filteredRecipients.length / rowsPerPage)
  const startIndex = (currentPage - 1) * rowsPerPage
  const endIndex = startIndex + rowsPerPage
  const paginatedRecipients = filteredRecipients.slice(startIndex, endIndex)

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1)
  }, [selectedTypeId, statusFilter, searchQuery, rowsPerPage])

  // Clear selection when filters change
  useEffect(() => {
    setSelectedIds(new Set())
  }, [selectedTypeId, statusFilter, searchQuery])

  // Selection handlers
  const toggleSelectAll = () => {
    if (selectedIds.size === paginatedRecipients.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(paginatedRecipients.map(r => r.id)))
    }
  }

  const toggleSelect = (id: string) => {
    const newSet = new Set(selectedIds)
    if (newSet.has(id)) {
      newSet.delete(id)
    } else {
      newSet.add(id)
    }
    setSelectedIds(newSet)
  }

  // Delete handlers
  const openDeleteDialog = (recipient?: EventRecipient & { certTypeId: string }) => {
    if (recipient) {
      setDeleteTarget({ type: 'single', recipient })
    } else {
      setDeleteTarget({ type: 'bulk' })
    }
    setDeleteDialogOpen(true)
  }

  const handleDelete = async () => {
    if (!eventId || !deleteTarget || !userId) return

    try {
      if (deleteTarget.type === 'single' && deleteTarget.recipient) {
        const res = await fetch(`/api/client/recipients?recipientId=${deleteTarget.recipient.id}&userId=${userId}`, {
          method: 'DELETE'
        })
        if (res.ok) {
          toast.success(`${deleteTarget.recipient.name} deleted`)
        } else {
          toast.error("Failed to delete recipient")
        }
      } else if (deleteTarget.type === 'bulk') {
        const selectedRecipients = paginatedRecipients.filter(r => selectedIds.has(r.id))
        for (const r of selectedRecipients) {
          await fetch(`/api/client/recipients?recipientId=${r.id}&userId=${userId}`, {
            method: 'DELETE'
          })
        }
        toast.success(`${selectedIds.size} recipients deleted`)
        setSelectedIds(new Set())
      }
      
      // Refresh data
      if (eventId) {
        fetchEventData(eventId)
      }
    } catch (error) {
      toast.error("Failed to delete")
    }

    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }



  const generateRegNo = () => {
    const prefix = "REG"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  const resetForm = () => {
    setFormName("")
    setFormEmail("")
    setFormMobile("")
    setFormCertId("")
  }

  const openAddDialog = () => {
    resetForm()
    setFormCertId(generateRegNo())
    // Default to first certificate type if available
    if (event && event.certificateTypes.length > 0) {
      setAddToTypeId(event.certificateTypes[0].id)
    }
    setIsAddDialogOpen(true)
  }

  // Get total recipients count across all certificate types
  const getTotalRecipientsCount = () => {
    if (!event) return 0
    return event.certificateTypes.reduce((sum, ct) => sum + ct.recipients.length, 0)
  }

  const handleAddRecipient = async () => {
    if (!formName.trim()) {
      toast.error("Name is required")
      return
    }
    if (!formEmail.trim() && !formMobile.trim()) {
      toast.error("Please enter email or mobile number")
      return
    }
    if (!addToTypeId) {
      toast.error("Please select a certificate type")
      return
    }
    if (!eventId) return

    // Check certificate limit
    const currentTotal = getTotalRecipientsCount()
    if (maxCertificates !== -1 && currentTotal >= maxCertificates) {
      const planFeatures = getCurrentPlanFeatures()
      toast.error(`Certificate limit reached (${maxCertificates})`, {
        description: `Your ${planFeatures.displayName} plan allows ${maxCertificates} certificates. Upgrade to add more.`,
        action: {
          label: "Upgrade",
          onClick: () => window.location.href = "/client/upgrade"
        }
      })
      return
    }

    try {
      const res = await fetch('/api/client/recipients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          eventId,
          certificateTypeId: addToTypeId,
          recipients: [{
            name: formName.trim(),
            email: formEmail.trim(),
            mobile: formMobile.trim(),
            certificateId: formCertId.trim() || generateRegNo()
          }]
        })
      })
      
      if (res.ok) {
        if (eventId) fetchEventData(eventId)
        setIsAddDialogOpen(false)
        resetForm()
        toast.success(`${formName} added successfully!`)
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to add recipient")
      }
    } catch (error) {
      toast.error("Failed to add recipient")
    }
  }

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !eventId) return

    // Need to select certificate type first
    if (selectedTypeId === "all") {
      toast.error("Please select a certificate type first to import recipients")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    // Check if userId is available
    if (!userId) {
      toast.error("Session expired. Please refresh the page.")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    import("xlsx").then((XLSX) => {
      const reader = new FileReader()
      reader.onload = async (evt) => {
        try {
          const data = evt.target?.result
          const workbook = XLSX.read(data, { type: "binary" })
          const sheet = workbook.Sheets[workbook.SheetNames[0]]
          const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1 }) as string[][]

          const recipients = []
          for (let i = 1; i < jsonData.length; i++) {
            const row = jsonData[i]
            if (row && row[0]) {
              recipients.push({
                name: String(row[0] || "").trim(),
                email: String(row[1] || "").trim(),
                mobile: String(row[2] || "").trim(),
                certificateId: String(row[3] || generateRegNo()).trim()
              })
            }
          }

          if (recipients.length === 0) {
            toast.error("No valid data found in Excel")
            return
          }

          // Check certificate limit for bulk import
          const currentTotal = getTotalRecipientsCount()
          if (maxCertificates !== -1) {
            const availableSlots = maxCertificates - currentTotal
            if (availableSlots <= 0) {
              const planFeatures = getCurrentPlanFeatures()
              toast.error(`Certificate limit reached (${maxCertificates})`, {
                description: `Your ${planFeatures.displayName} plan allows ${maxCertificates} certificates. Upgrade to add more.`
              })
              return
            }
            if (recipients.length > availableSlots) {
              // Import only what fits
              const limitedRecipients = recipients.slice(0, availableSlots)
              fetch('/api/client/recipients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  userId,
                  eventId,
                  certificateTypeId: selectedTypeId,
                  recipients: limitedRecipients,
                  isBulkImport: true
                })
              }).then(res => {
                if (res.ok && eventId) fetchEventData(eventId)
              })
              const planFeatures = getCurrentPlanFeatures()
              toast.warning(`Only ${limitedRecipients.length} of ${recipients.length} imported`, {
                description: `${planFeatures.displayName} plan limit: ${maxCertificates} certificates. Upgrade to add more.`
              })
              return
            }
          }

          // For large imports (>500), use chunked upload
          const CHUNK_SIZE = 500
          if (recipients.length > CHUNK_SIZE) {
            // Show progress toast
            const toastId = toast.loading(`Importing ${recipients.length} recipients...`, {
              description: "Please wait, this may take a moment."
            })
            
            let imported = 0
            let failed = 0
            const chunks = []
            
            for (let i = 0; i < recipients.length; i += CHUNK_SIZE) {
              chunks.push(recipients.slice(i, i + CHUNK_SIZE))
            }
            
            for (let i = 0; i < chunks.length; i++) {
              try {
                const res = await fetch('/api/client/recipients', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    userId,
                    eventId,
                    certificateTypeId: selectedTypeId,
                    recipients: chunks[i],
                    isBulkImport: true
                  })
                })
                
                if (res.ok) {
                  const data = await res.json()
                  imported += data.count || chunks[i].length
                } else {
                  failed += chunks[i].length
                }
                
                // Update progress
                const progress = Math.round(((i + 1) / chunks.length) * 100)
                toast.loading(`Importing... ${progress}% (${imported} done)`, {
                  id: toastId,
                  description: `Processing batch ${i + 1} of ${chunks.length}`
                })
              } catch {
                failed += chunks[i].length
              }
            }
            
            // Final result
            toast.dismiss(toastId)
            if (eventId) fetchEventData(eventId)
            
            if (failed === 0) {
              toast.success(`Import Complete!`, {
                description: `${imported} recipients imported successfully.`,
                duration: 5000
              })
            } else {
              toast.warning(`Import Partially Complete`, {
                description: `${imported} imported, ${failed} failed.`,
                duration: 5000
              })
            }
            return
          }

          // API call to add recipients (small batches)
          const toastId = toast.loading(`Importing ${recipients.length} recipients...`)
          
          fetch('/api/client/recipients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId,
              eventId,
              certificateTypeId: selectedTypeId,
              recipients,
              isBulkImport: true
            })
          }).then(async res => {
            toast.dismiss(toastId)
            if (res.ok) {
              const data = await res.json()
              if (eventId) fetchEventData(eventId)
              // Show import summary
              toast.success(`Import Successful!`, {
                description: `${data.count || recipients.length} recipients imported successfully.`,
                duration: 5000
              })
            } else {
              const data = await res.json()
              toast.error(data.error || "Failed to import", {
                description: data.details || "Please check your data and try again."
              })
            }
          }).catch(() => {
            toast.dismiss(toastId)
            toast.error("Failed to import recipients")
          })
        } catch {
          toast.error("Failed to parse Excel file")
        }
      }
      reader.readAsBinaryString(file)
    })
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const downloadSampleExcel = () => {
    import("xlsx").then((XLSX) => {
      const sampleData = [
        ["Name", "Email", "Mobile", "Registration No"],
        ["John Doe", "john@example.com", "+91-9876543210", "REG-001"],
        ["Jane Smith", "jane@example.com", "+91-9876543211", "REG-002"],
      ]
      const ws = XLSX.utils.aoa_to_sheet(sampleData)
      ws["!cols"] = [{ wch: 20 }, { wch: 25 }, { wch: 18 }, { wch: 15 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Recipients")
      XLSX.writeFile(wb, "sample-recipients.xlsx")
      toast.success("Sample Excel downloaded!")
    })
  }

  // Show skeleton table while loading, not full page loading
  const showTableSkeleton = isLoading || !event

  return (
    <div className="p-6 flex flex-col h-screen overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Recipients</h1>
          <p className="text-muted-foreground">Manage all certificate recipients{event ? ` for ${event.name}` : ''}</p>
        </div>
      </div>

      {/* Recipients Table with Filters */}
      {!showTableSkeleton && event?.certificateTypes.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Certificate Types Yet</h3>
            <p className="text-muted-foreground mb-4">
              Create a certificate type first before adding recipients
            </p>
            <Button onClick={() => window.location.href = "/client/certificates"}>
              Go to Manage Certificate
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-lg border overflow-hidden flex flex-col flex-1 min-h-0">
            {/* Filters in table header */}
            <div className="bg-muted/50 border-b px-4 py-3 flex-shrink-0">
              <div className="flex flex-wrap items-center gap-3">
                {/* Certificate Type Filter */}
                <Select value={selectedTypeId} onValueChange={setSelectedTypeId} disabled={showTableSkeleton}>
                    <SelectTrigger className="w-[180px] h-9">
                      <SelectValue placeholder="All Certificate" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Certificate</SelectItem>
                      {event?.certificateTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name} ({type.recipients.length})
                        </SelectItem>
                      ))}
                    </SelectContent>
                </Select>

                {/* Status Filter */}
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[130px] h-9">
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="downloaded">Downloaded</SelectItem>
                  </SelectContent>
                </Select>

                {/* Search */}
                <div className="flex-1 min-w-[200px]">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input 
                      placeholder="Search by name, email, mobile, reg no..." 
                      value={searchQuery} 
                      onChange={(e) => setSearchQuery(e.target.value)} 
                      className="pl-9 h-9" 
                    />
                  </div>
                </div>

                {/* Import Dropdown */}
                <input 
                  ref={fileInputRef} 
                  type="file" 
                  accept=".xlsx,.xls,.csv" 
                  className="hidden" 
                  onChange={handleExcelUpload} 
                />
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Import
                      <ChevronDown className="h-4 w-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={downloadSampleExcel}>
                      <Download className="h-4 w-4 mr-2" />
                      Download Sample Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (!canImportData) {
                          toast.error("Data import is not available in your plan. Please upgrade.")
                          return
                        }
                        if (selectedTypeId === "all") {
                          toast.error("Please select a certificate type first")
                          return
                        }
                        fileInputRef.current?.click()
                      }}
                      className={!canImportData ? "opacity-50" : ""}
                    >
                      <FileSpreadsheet className="h-4 w-4 mr-2" />
                      Import Excel {!canImportData && <Lock className="h-3 w-3 ml-1 inline" />}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* Add Recipient Button */}
                <Button 
                  size="sm"
                  onClick={openAddDialog} 
                  disabled={showTableSkeleton || !event || event.certificateTypes.length === 0}
                >
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Recipient
                </Button>
              </div>
            </div>

            {/* Table with sticky header */}
            <div className="flex-1 overflow-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <table className="w-full text-sm table-fixed">
                <thead className="sticky top-0 bg-muted z-10">
                  <tr>
                    <th className="text-center p-3 font-medium w-[40px]">
                      <Checkbox 
                        checked={paginatedRecipients.length > 0 && selectedIds.size === paginatedRecipients.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </th>
                    <th className="text-left p-3 font-medium w-[40px]">#</th>
                    <th className="text-left p-3 font-medium w-[140px]">Name</th>
                    <th className="text-left p-3 font-medium w-[180px]">Email</th>
                    <th className="text-left p-3 font-medium w-[120px]">Mobile</th>
                    <th className="text-left p-3 font-medium w-[150px]">Reg No</th>
                    <th className="text-left p-3 font-medium w-[120px]">Certificate</th>
                    <th className="text-left p-3 font-medium w-[90px]">Status</th>
                    <th className="text-center p-3 font-medium w-[70px]">Downloads</th>
                    <th className="text-center p-3 font-medium w-[50px]"></th>
                  </tr>
                </thead>
                <tbody>
                  {showTableSkeleton ? (
                    // Skeleton loader rows - only for table data
                    Array.from({ length: rowsPerPage }).map((_, i) => (
                      <tr key={i} className="border-t">
                        <td className="p-3 text-center"><Skeleton className="h-4 w-4 mx-auto" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-6" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-24" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-32" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-28" /></td>
                        <td className="p-3"><Skeleton className="h-4 w-20" /></td>
                        <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                        <td className="p-3 text-center"><Skeleton className="h-4 w-8 mx-auto" /></td>
                        <td className="p-3 text-center"><Skeleton className="h-6 w-6 mx-auto" /></td>
                      </tr>
                    ))
                  ) : filteredRecipients.length === 0 ? (
                    <tr>
                      <td colSpan={10} className="p-8 text-center">
                        <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                        <p className="font-medium">No Recipients Found</p>
                        <p className="text-sm text-muted-foreground">
                          {searchQuery || statusFilter !== "all" 
                            ? "Try adjusting your filters" 
                            : "Add recipients to get started"}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    paginatedRecipients.map((r, i) => (
                      <tr key={r.id} className={`border-t hover:bg-muted/50 ${selectedIds.has(r.id) ? 'bg-muted/30' : ''}`}>
                        <td className="p-3 text-center">
                          <Checkbox 
                            checked={selectedIds.has(r.id)}
                            onCheckedChange={() => toggleSelect(r.id)}
                          />
                        </td>
                        <td className="p-3 text-muted-foreground">{startIndex + i + 1}</td>
                        <td className="p-3 font-medium truncate" title={r.name}>{r.name}</td>
                        <td className="p-3 text-muted-foreground truncate" title={r.email}>{r.email || "-"}</td>
                        <td className="p-3 text-muted-foreground truncate">{r.mobile || "-"}</td>
                        <td className="p-3">
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono truncate block" title={r.certificateId}>
                            {r.certificateId}
                          </code>
                        </td>
                        <td className="p-3">
                          <Badge variant="outline" className="text-xs">
                            {r.certTypeName}
                          </Badge>
                        </td>
                        <td className="p-3">
                          <Badge 
                            variant={r.status === "downloaded" ? "default" : "outline"} 
                            className={r.status === "downloaded" ? "bg-emerald-500" : ""}
                          >
                            {r.status}
                          </Badge>
                        </td>
                        <td className="p-3 text-center">{r.downloadCount}</td>
                        <td className="p-3 text-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-destructive"
                            onClick={() => openDeleteDialog(r)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Footer with pagination - always at bottom */}
            <div className="mt-auto flex-shrink-0 bg-background border-t px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  Total: <span className="text-primary font-medium">{filteredRecipients.length}</span>
                </div>
                {selectedIds.size > 0 && (
                  <Button 
                    variant="destructive" 
                    size="sm"
                    onClick={() => openDeleteDialog()}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Selected ({selectedIds.size})
                  </Button>
                )}
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
                  Showing {filteredRecipients.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredRecipients.length)} of {filteredRecipients.length}
                </span>
                <div className="flex items-center gap-1">
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage(p => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center justify-center h-8 w-8 rounded-md bg-primary text-primary-foreground text-sm font-medium">
                    {currentPage}
                  </div>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    className="h-8 w-8"
                    disabled={currentPage >= totalPages}
                    onClick={() => setCurrentPage(p => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Confirm Delete
            </DialogTitle>
            <DialogDescription>
              {deleteTarget?.type === 'single' 
                ? `Are you sure you want to delete "${deleteTarget.recipient?.name}"? This action cannot be undone.`
                : `Are you sure you want to delete ${selectedIds.size} selected recipients? This action cannot be undone.`
              }
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-3">
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4 mr-2" />
              {deleteTarget?.type === 'single' ? 'Delete' : `Delete ${selectedIds.size} Recipients`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add Recipient Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Add New Recipient
            </DialogTitle>
            <DialogDescription>
              Enter the recipient details for the certificate
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Certificate Type Selection */}
            <div className="space-y-2">
              <Label>Select Certificate <span className="text-destructive">*</span></Label>
              <Select value={addToTypeId} onValueChange={setAddToTypeId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select certificate type" />
                </SelectTrigger>
                <SelectContent>
                  {event?.certificateTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Full Name <span className="text-destructive">*</span></Label>
              <Input
                placeholder="Enter full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label>Email Address</Label>
              <Input
                type="email"
                placeholder="Enter email address"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Mobile Number</Label>
              <Input
                type="tel"
                placeholder="Enter mobile number"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label>Registration No</Label>
              <Input
                placeholder="Auto-generated if empty"
                value={formCertId}
                onChange={(e) => setFormCertId(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddRecipient}>
              <Plus className="h-4 w-4 mr-2" />
              Add Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
