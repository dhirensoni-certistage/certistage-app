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
  UserPlus, ChevronLeft, ChevronRight, ChevronDown, AlertTriangle, Pencil, MoreHorizontal, Award, Eye
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
import { getDownloadLink } from "@/lib/events"
import { useRefreshOnFocus } from "@/hooks/use-refresh-on-focus"
import { cn } from "@/lib/utils"
import { toastDeleted } from "@/lib/client-trash"

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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [previewRecipient, setPreviewRecipient] = useState<(EventRecipient & { certTypeName: string; certTypeId: string }) | null>(null)
  const [editingRecipient, setEditingRecipient] = useState<(EventRecipient & { certTypeId: string }) | null>(null)
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
  // Certificates issued in this plan period (server count; deletes do not reduce it)
  const [issuedCount, setIssuedCount] = useState<number | null>(null)
  const fetchUsage = async () => {
    try {
      const res = await fetch("/api/client/usage")
      if (res.ok) {
        const data = await res.json()
        if (typeof data.usage?.certificates === "number") setIssuedCount(data.usage.certificates)
        if (typeof data.limits?.maxCertificates === "number") setMaxCertificates(data.limits.maxCertificates)
      }
    } catch { }
  }

  // Form fields
  const [formPrefix, setFormPrefix] = useState("")
  const [formFirstName, setFormFirstName] = useState("")
  const [formLastName, setFormLastName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMobile, setFormMobile] = useState("")
  const [formRegNo, setFormRegNo] = useState("")

  // Fetch event data from API
  const fetchEventData = async (evtId: string) => {
    fetchUsage()
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

  // Refresh when the tab comes back into view, plus a slow safety interval
  useRefreshOnFocus(() => { if (eventId) fetchEventData(eventId) }, 60_000, !!eventId)

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
  const previewLink = previewRecipient && eventId
    ? `/download/embed?event=${eventId}&cert=${previewRecipient.certificateId}`
    : ""
  const downloadLink = previewRecipient ? `/api/download/pdf?recipientId=${previewRecipient.id}` : ""

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
      const single = deleteTarget.type === 'single' && deleteTarget.recipient
      const ids = single
        ? [deleteTarget.recipient!.id]
        : paginatedRecipients.filter(r => selectedIds.has(r.id)).map(r => r.id)
      if (ids.length === 0) return

      const query = single ? `recipientId=${ids[0]}` : `recipientIds=${ids.join(",")}`
      const res = await fetch(`/api/client/recipients?${query}`, { method: 'DELETE' })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        const label = single ? `${deleteTarget.recipient!.name} deleted` : `${data.deletedCount ?? ids.length} recipients deleted`
        toastDeleted(label, data.batchId, () => fetchEventData(eventId))
        setSelectedIds(new Set())
      } else {
        toast.error(data.error || "Failed to delete")
      }

      // Refresh data
      fetchEventData(eventId)
    } catch (error) {
      toast.error("Failed to delete")
    }

    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  // Open edit dialog
  const openEditDialog = (recipient: EventRecipient & { certTypeId: string }) => {
    setEditingRecipient(recipient)
    // Parse name into parts if possible
    const nameParts = recipient.name?.split(' ') || []
    const prefix = ['Mr.', 'Ms.', 'Mrs.', 'Dr.', 'Prof.', 'Er.'].find(p => nameParts[0] === p) || ''
    const firstName = prefix ? nameParts.slice(1, -1).join(' ') || nameParts[1] || '' : nameParts.slice(0, -1).join(' ') || nameParts[0] || ''
    const lastName = nameParts.length > 1 ? nameParts[nameParts.length - 1] : ''

    setFormPrefix(prefix)
    setFormFirstName(firstName)
    setFormLastName(lastName)
    setFormEmail(recipient.email || '')
    setFormMobile(recipient.mobile || '')
    setFormRegNo(recipient.certificateId || '')
    setIsEditDialogOpen(true)
  }

  const openPreviewDialog = (recipient: EventRecipient & { certTypeName: string; certTypeId: string }) => {
    setPreviewRecipient(recipient)
    setIsPreviewOpen(true)
  }

  // Handle update recipient
  const handleUpdateRecipient = async () => {
    if (!formFirstName.trim()) {
      toast.error("First Name is required")
      return
    }
    if (!formEmail.trim() && !formMobile.trim()) {
      toast.error("Please enter email or mobile number")
      return
    }
    if (!editingRecipient || !userId) return

    try {
      const res = await fetch('/api/client/recipients', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          recipientId: editingRecipient.id,
          userId,
          updates: {
            prefix: formPrefix.trim(),
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim(),
            mobile: formMobile.trim(),
            regNo: formRegNo.trim()
          }
        })
      })

      if (res.ok) {
        if (eventId) fetchEventData(eventId)
        setIsEditDialogOpen(false)
        setEditingRecipient(null)
        resetForm()
        toast.success("Recipient updated successfully!")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to update recipient")
      }
    } catch (error) {
      toast.error("Failed to update recipient")
    }
  }

  const generateRegNo = () => {
    const prefix = "REG"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  const resetForm = () => {
    setFormPrefix("")
    setFormFirstName("")
    setFormLastName("")
    setFormEmail("")
    setFormMobile("")
    setFormRegNo("")
  }

  const openAddDialog = () => {
    resetForm()
    setFormRegNo(generateRegNo())
    // Default to first certificate type if available
    if (event && event.certificateTypes.length > 0) {
      setAddToTypeId(event.certificateTypes[0].id)
    }
    setIsAddDialogOpen(true)
  }

  // Get total recipients count across all certificate types
  // Issued count from the server when we have it; this event's recipients as a fallback
  const getTotalRecipientsCount = () => {
    if (issuedCount !== null) return issuedCount
    if (!event) return 0
    return event.certificateTypes.reduce((sum, ct) => sum + ct.recipients.length, 0)
  }

  const handleAddRecipient = async () => {
    if (!formFirstName.trim()) {
      toast.error("First Name is required")
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
        description: `Your ${planFeatures.displayName} plan includes ${maxCertificates} certificates. Issued certificates count even after they are deleted. Upgrade to add more.`,
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
            prefix: formPrefix.trim(),
            firstName: formFirstName.trim(),
            lastName: formLastName.trim(),
            email: formEmail.trim(),
            mobile: formMobile.trim(),
            registrationNo: formRegNo.trim() || generateRegNo()
          }]
        })
      })

      if (res.ok) {
        if (eventId) fetchEventData(eventId)
        setIsAddDialogOpen(false)
        resetForm()
        toast.success(`${formFirstName} ${formLastName} added successfully!`)
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
            if (row && (row[0] || row[1])) {
              // Excel columns: Prefix, FirstName, LastName, Email, Mobile, RegistrationNo
              recipients.push({
                prefix: String(row[0] || "").trim(),
                firstName: String(row[1] || "").trim(),
                lastName: String(row[2] || "").trim(),
                email: String(row[3] || "").trim(),
                mobile: String(row[4] || "").trim(),
                registrationNo: String(row[5] || generateRegNo()).trim()
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
                description: `Your ${planFeatures.displayName} plan includes ${maxCertificates} certificates. Issued certificates count even after they are deleted. Upgrade to add more.`
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
                description: `${planFeatures.displayName} plan includes ${maxCertificates} certificates. Upgrade to add more.`
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
        ["Prefix", "First Name", "Last Name", "Email", "Mobile", "Registration No"],
        ["Mr.", "John", "Doe", "john@example.com", "+91-9876543210", "REG-001"],
        ["Ms.", "Jane", "Smith", "jane@example.com", "+91-9876543211", "REG-002"],
        ["Dr.", "Bob", "Wilson", "bob@example.com", "+91-9876543212", "REG-003"],
      ]
      const ws = XLSX.utils.aoa_to_sheet(sampleData)
      ws["!cols"] = [{ wch: 8 }, { wch: 15 }, { wch: 15 }, { wch: 25 }, { wch: 18 }, { wch: 15 }]
      const wb = XLSX.utils.book_new()
      XLSX.utils.book_append_sheet(wb, ws, "Recipients")
      XLSX.writeFile(wb, "sample-recipients.xlsx")
      toast.success("Sample Excel downloaded!")
    })
  }

  // Show skeleton table while loading, not full page loading
  const showTableSkeleton = isLoading || !event

  const allRecipientsCount = event ? event.certificateTypes.reduce((n, ct) => n + ct.recipients.length, 0) : 0
  const downloadedCount = event ? event.certificateTypes.reduce((n, ct) => n + ct.recipients.filter((r) => r.downloadCount > 0).length, 0) : 0

  return (
    <div className="p-4 md:p-6 flex flex-col h-full overflow-hidden bg-[#FDFDFD]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-5 flex-shrink-0">
        <div>
          <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight leading-none">Recipients</h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">
            {event ? <><span className="font-medium text-neutral-900">{allRecipientsCount.toLocaleString("en-IN")}</span> recipients · <span className="font-medium text-neutral-900">{downloadedCount.toLocaleString("en-IN")}</span> downloaded</> : "Everyone who can download a certificate for this event."}
          </p>
        </div>
        {event && event.certificateTypes.length > 0 && (
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="h-9 px-3 text-[13px] border-neutral-200 bg-white hover:bg-neutral-50">
                  <FileSpreadsheet className="h-3.5 w-3.5 mr-1.5" /> Import <ChevronDown className="h-3.5 w-3.5 ml-1.5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={downloadSampleExcel}><Download className="h-4 w-4 mr-2" /> Download sample Excel</DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => {
                    if (!canImportData) { toast.error("Excel import is not available on your plan. Please upgrade."); return }
                    if (selectedTypeId === "all") { toast.error("Choose a certificate in the filter first, then import."); return }
                    fileInputRef.current?.click()
                  }}
                  className={!canImportData ? "opacity-50" : ""}
                >
                  <FileSpreadsheet className="h-4 w-4 mr-2" /> Import Excel {!canImportData && <Lock className="h-3 w-3 ml-1 inline" />}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="sm" onClick={openAddDialog} disabled={showTableSkeleton} className="h-9 px-3.5 text-[13px] bg-neutral-900 text-white hover:bg-black">
              <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Add recipient
            </Button>
          </div>
        )}
      </div>

      {/* Recipients Table with Filters */}
      {!showTableSkeleton && event?.certificateTypes.length === 0 ? (
        <div className="rounded-md border border-[#E5E5E5] bg-white p-16 text-center">
          <Users className="h-12 w-12 text-[#CCC] mx-auto mb-4" />
          <h3 className="text-base font-semibold text-black mb-2">No Certificate Types Yet</h3>
          <p className="text-sm text-[#666] mb-6">
            Create a certificate type first before adding recipients
          </p>
          <Button onClick={() => window.location.href = "/client/certificates"} className="h-9 px-4 bg-black text-white hover:bg-[#222] text-sm">
            Go to Manage Certificate
          </Button>
        </div>
      ) : (
        <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden flex flex-col flex-1 min-h-0">
          {/* Filters in table header */}
          <div className="bg-white border-b border-neutral-200 px-4 py-3 flex-shrink-0">
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap sm:items-center gap-2.5">
              {/* Certificate Type Filter */}
              <Select value={selectedTypeId} onValueChange={setSelectedTypeId} disabled={showTableSkeleton}>
                <SelectTrigger className="w-full sm:w-[190px] h-9 text-[13px] border-neutral-200 bg-white rounded-md">
                  <SelectValue placeholder="All certificates" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All certificates</SelectItem>
                  {event?.certificateTypes.map((type) => (
                    <SelectItem key={type.id} value={type.id}>
                      {type.name} ({type.recipients.length})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {/* Status Filter */}
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-[140px] h-9 text-[13px] border-neutral-200 bg-white rounded-md">
                  <SelectValue placeholder="Any status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="downloaded">Downloaded</SelectItem>
                </SelectContent>
              </Select>

              {/* Search */}
              <div className="col-span-2 sm:col-span-1 flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400" />
                  <Input
                    placeholder="Search name, email, mobile or reg. no."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9 text-[13px] border-neutral-200 bg-white rounded-md placeholder:text-neutral-400"
                  />
                </div>
              </div>

              {/* Hidden file input for Excel import */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
            </div>
          </div>

          {/* Table with sticky header */}
          <div className="flex-1 overflow-auto min-h-0 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
            <table className="w-full min-w-[960px] text-[12.5px] table-fixed">
              <thead className="sticky top-0 bg-neutral-50 z-10 border-b border-neutral-200">
                <tr>
                  <th className="text-center px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[40px]">
                    <Checkbox
                      checked={paginatedRecipients.length > 0 && selectedIds.size === paginatedRecipients.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[40px]">#</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[140px]">Name</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[180px]">Email</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[120px]">Mobile</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[150px]">Reg No</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[120px]">Certificate</th>
                  <th className="text-center px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[70px]">Preview</th>
                  <th className="text-left px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[90px]">Status</th>
                  <th className="text-center px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[70px]">Downloads</th>
                  <th className="text-center px-3 py-2.5 font-medium text-neutral-500 text-[11px] uppercase tracking-wider w-[50px]"></th>
                </tr>
              </thead>
              <tbody className="bg-white">
                {showTableSkeleton ? (
                  // Skeleton loader rows - only for table data
                  Array.from({ length: rowsPerPage }).map((_, i) => (
                    <tr key={i} className="border-b border-[#F0F0F0]">
                      <td className="px-3 py-3 text-center"><Skeleton className="h-3 w-3 mx-auto" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-6" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-24" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-32" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-28" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-3 py-3 text-center"><Skeleton className="h-6 w-6 mx-auto" /></td>
                      <td className="px-3 py-3"><Skeleton className="h-5 w-16" /></td>
                      <td className="px-3 py-3 text-center"><Skeleton className="h-3 w-8 mx-auto" /></td>
                      <td className="px-3 py-3 text-center"><Skeleton className="h-6 w-6 mx-auto" /></td>
                    </tr>
                  ))
                ) : filteredRecipients.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="p-12 text-center">
                      <p className="font-medium text-[14px] text-neutral-900">{searchQuery || statusFilter !== "all" ? "No recipients match these filters" : "No recipients yet"}</p>
                      <p className="text-[13px] text-neutral-500 mt-1">
                        {searchQuery || statusFilter !== "all"
                          ? "Try a different search or clear the filters."
                          : "Import an Excel file or add recipients one by one."}
                      </p>
                    </td>
                  </tr>
                ) : (
                  paginatedRecipients.map((r, i) => (
                    <tr key={r.id} className={`border-b border-neutral-100 hover:bg-neutral-50/70 transition-colors ${selectedIds.has(r.id) ? 'bg-neutral-50' : ''}`}>
                      <td className="px-3 py-3 text-center">
                        <Checkbox
                          checked={selectedIds.has(r.id)}
                          onCheckedChange={() => toggleSelect(r.id)}
                        />
                      </td>
                      <td className="px-3 py-3 text-neutral-400 tabular-nums">{startIndex + i + 1}</td>
                      <td className="px-3 py-3 font-medium text-neutral-900 text-[13px] truncate" title={r.name}>{r.name}</td>
                      <td className="px-3 py-3 text-neutral-600 truncate" title={r.email}>{r.email || <span className="text-neutral-300">—</span>}</td>
                      <td className="px-3 py-3 text-neutral-600 truncate tabular-nums">{r.mobile || <span className="text-neutral-300">—</span>}</td>
                      <td className="px-3 py-3">
                        <span className="font-mono text-[11.5px] text-neutral-600 truncate inline-block max-w-[140px] whitespace-nowrap" title={r.certificateId}>{r.certificateId}</span>
                      </td>
                      <td className="px-3 py-3 text-neutral-600 truncate" title={r.certTypeName}>{r.certTypeName}</td>
                      <td className="px-3 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 hover:bg-neutral-100"
                          onClick={() => openPreviewDialog(r)}
                          disabled={!eventId}
                          title="View certificate preview"
                        >
                          <Eye className="h-4 w-4 text-neutral-500" />
                        </Button>
                      </td>
                      <td className="px-3 py-3">
                        <span className={cn(
                          "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium border",
                          r.status === "downloaded" ? "bg-emerald-50 text-emerald-700 border-emerald-100" : "bg-neutral-50 text-neutral-600 border-neutral-200"
                        )}>
                          <span className={cn("h-1.5 w-1.5 rounded-full", r.status === "downloaded" ? "bg-emerald-500" : "bg-neutral-400")} />
                          {r.status === "downloaded" ? "Downloaded" : "Pending"}
                        </span>
                      </td>
                      <td className="px-3 py-3 text-center tabular-nums text-neutral-600">{r.downloadCount}</td>
                      <td className="px-3 py-3 text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6 hover:bg-neutral-100">
                              <MoreHorizontal className="h-3.5 w-3.5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => openEditDialog(r)}>
                              <Pencil className="h-4 w-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => openDeleteDialog(r)}
                              className="text-red-600 focus:text-red-600"
                            >
                              <Trash2 className="h-4 w-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Footer with pagination - always at bottom */}
          <div className="mt-auto flex-shrink-0 bg-white border-t border-neutral-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="text-sm text-muted-foreground whitespace-nowrap">
                {filteredRecipients.length > 0 ? startIndex + 1 : 0}–{Math.min(endIndex, filteredRecipients.length)} of {filteredRecipients.length}
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
            <div className="flex items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground hidden sm:inline">Rows</span>
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

      {/* Certificate Preview Dialog */}
      <Dialog
        open={isPreviewOpen}
        onOpenChange={(open) => {
          setIsPreviewOpen(open)
          if (!open) setPreviewRecipient(null)
        }}
      >
        <DialogContent className="sm:max-w-6xl h-[90vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>Certificate Preview</DialogTitle>
            <DialogDescription>
              {previewRecipient
                ? `Preview for ${previewRecipient.name} • ${previewRecipient.certificateId}`
                : "Loading preview..."}
            </DialogDescription>
          </DialogHeader>

          <div className="rounded-lg border border-neutral-200 overflow-hidden bg-white flex-1 min-h-0">
            {previewLink ? (
              <iframe
                title="Certificate preview"
                src={previewLink}
                className="w-full h-full bg-white"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-neutral-500">
                Unable to load preview.
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
              Close
            </Button>
            <Button
              onClick={() => {
                if (downloadLink) window.open(downloadLink, "_blank", "noopener,noreferrer")
              }}
              disabled={!downloadLink}
            >
              <Download className="h-4 w-4 mr-2" />
              Download Certificate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                ? `Delete "${deleteTarget.recipient?.name}"? You can restore them from Recently deleted for 30 days.`
                : `Delete ${selectedIds.size} selected recipients? You can restore them from Recently deleted for 30 days.`
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
              <Label>Prefix (Optional)</Label>
              <Select value={formPrefix || "none"} onValueChange={(v) => setFormPrefix(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Prefix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                  <SelectItem value="Er.">Er.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="First name"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Last name"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
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
                value={formRegNo}
                onChange={(e) => setFormRegNo(e.target.value)}
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

      {/* Edit Recipient Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Recipient
            </DialogTitle>
            <DialogDescription>
              Update the recipient details
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Prefix (Optional)</Label>
              <Select value={formPrefix || "none"} onValueChange={(v) => setFormPrefix(v === "none" ? "" : v)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Prefix" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  <SelectItem value="Mr.">Mr.</SelectItem>
                  <SelectItem value="Ms.">Ms.</SelectItem>
                  <SelectItem value="Mrs.">Mrs.</SelectItem>
                  <SelectItem value="Dr.">Dr.</SelectItem>
                  <SelectItem value="Prof.">Prof.</SelectItem>
                  <SelectItem value="Er.">Er.</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>First Name <span className="text-destructive">*</span></Label>
                <Input
                  placeholder="First name"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Last Name</Label>
                <Input
                  placeholder="Last name"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                />
              </div>
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
                placeholder="Registration number"
                value={formRegNo}
                onChange={(e) => setFormRegNo(e.target.value)}
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingRecipient(null); resetForm(); }}>
              Cancel
            </Button>
            <Button onClick={handleUpdateRecipient}>
              <Pencil className="h-4 w-4 mr-2" />
              Update Recipient
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
