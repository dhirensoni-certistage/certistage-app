"use client"

import { useEffect, useState, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import { getClientSession, getCurrentPlanFeatures } from "@/lib/auth"
import {
  getEvent, addRecipientsToCertType, clearCertTypeRecipients, updateRecipient, deleteRecipient,
  type CertificateType
} from "@/lib/events"
import { ArrowLeft, Users, FileSpreadsheet, Plus, Search, Trash2, Download, UserPlus, Lock, Pencil, MoreHorizontal, Loader2 } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { motion, AnimatePresence } from "framer-motion"

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 10 },
  visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.3 } })
}

export default function CertTypeRecipientsPage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [editingRecipient, setEditingRecipient] = useState<any>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form fields for adding/editing recipient
  const [formPrefix, setFormPrefix] = useState("")
  const [formFirstName, setFormFirstName] = useState("")
  const [formLastName, setFormLastName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMobile, setFormMobile] = useState("")
  const [formRegNo, setFormRegNo] = useState("")

  // Get plan features for limits
  const planFeatures = getCurrentPlanFeatures()
  const maxCertificates = planFeatures.maxCertificates
  const canImportData = planFeatures.canImportData
  const currentCount = certType?.recipients.length || 0
  const canAddMore = maxCertificates === -1 || currentCount < maxCertificates
  const remainingSlots = maxCertificates === -1 ? -1 : maxCertificates - currentCount

  const refreshData = () => {
    const session = getClientSession()
    if (session) {
      const event = getEvent(session.eventId || "")
      setEventId(session.eventId || null)
      setEventName(event?.name || "")
      if (event) {
        const type = event.certificateTypes.find(t => t.id === typeId)
        setCertType(type || null)
      }
    }
  }

  useEffect(() => { refreshData() }, [typeId])

  // Generate registration number
  const generateRegNo = () => {
    const prefix = "REG"
    const timestamp = Date.now().toString(36).toUpperCase()
    const random = Math.random().toString(36).substr(2, 4).toUpperCase()
    return `${prefix}-${timestamp}-${random}`
  }

  // Reset form
  const resetForm = () => {
    setFormPrefix("")
    setFormFirstName("")
    setFormLastName("")
    setFormEmail("")
    setFormMobile("")
    setFormRegNo("")
  }

  // Open add dialog
  const openAddDialog = () => {
    resetForm()
    setFormRegNo(generateRegNo()) // Auto-generate registration number
    setIsAddDialogOpen(true)
  }

  // Handle add single recipient
  const handleAddRecipient = () => {
    // Check plan limit
    if (!canAddMore) {
      toast.error(`Certificate limit reached (${maxCertificates})`, {
        description: `Your ${planFeatures.displayName} plan allows ${maxCertificates} certificates. Upgrade to add more.`
      })
      return
    }

    if (!formFirstName.trim()) {
      toast.error("First Name is required")
      return
    }

    if (!formEmail.trim() && !formMobile.trim()) {
      toast.error("Please enter email or mobile number")
      return
    }

    if (!eventId) return

    const recipient = {
      prefix: formPrefix.trim(),
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      email: formEmail.trim(),
      mobile: formMobile.trim(),
      registrationNo: formRegNo.trim() || generateRegNo()
    }

    addRecipientsToCertType(eventId, typeId, [recipient])
    refreshData()
    setIsAddDialogOpen(false)
    resetForm()
    toast.success(`${recipient.firstName} ${recipient.lastName} added successfully!`)
  }

  // Open edit dialog with recipient data
  const openEditDialog = (recipient: any) => {
    setEditingRecipient(recipient)
    setFormPrefix(recipient.prefix || "")
    setFormFirstName(recipient.firstName || recipient.name || "")
    setFormLastName(recipient.lastName || "")
    setFormEmail(recipient.email || "")
    setFormMobile(recipient.mobile || "")
    setFormRegNo(recipient.certificateId || recipient.regNo || "")
    setIsEditDialogOpen(true)
  }

  // Handle update recipient
  const handleUpdateRecipient = () => {
    if (!formFirstName.trim()) {
      toast.error("First Name is required")
      return
    }

    if (!formEmail.trim() && !formMobile.trim()) {
      toast.error("Please enter email or mobile number")
      return
    }

    if (!eventId || !editingRecipient) return

    const result = updateRecipient(eventId, typeId, editingRecipient.id, {
      prefix: formPrefix.trim(),
      firstName: formFirstName.trim(),
      lastName: formLastName.trim(),
      email: formEmail.trim(),
      mobile: formMobile.trim(),
      regNo: formRegNo.trim()
    })

    if (result) {
      refreshData()
      setIsEditDialogOpen(false)
      setEditingRecipient(null)
      resetForm()
      toast.success("Attendee updated successfully!")
    } else {
      toast.error("Failed to update attendee")
    }
  }

  // Handle delete recipient
  const handleDeleteRecipient = (recipientId: string, recipientName: string) => {
    if (!eventId) return

    if (confirm(`Are you sure you want to delete "${recipientName}"?`)) {
      const result = deleteRecipient(eventId, typeId, recipientId)
      if (result) {
        refreshData()
        toast.success("Attendee deleted successfully!")
      } else {
        toast.error("Failed to delete attendee")
      }
    }
  }

  // Handle Excel upload
  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !eventId) return

    // Check if import is allowed in plan
    if (!canImportData) {
      toast.error("Excel import not available in Free plan", {
        description: "Upgrade to Professional or higher to import from Excel"
      })
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (evt) => {
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

        // Check plan limit for bulk import
        if (maxCertificates !== -1) {
          const availableSlots = maxCertificates - currentCount
          if (availableSlots <= 0) {
            toast.error(`Certificate limit reached (${maxCertificates})`, {
              description: `Your ${planFeatures.displayName} plan allows ${maxCertificates} certificates. Upgrade to add more.`
            })
            return
          }
          if (recipients.length > availableSlots) {
            // Only import what fits within limit
            const limitedRecipients = recipients.slice(0, availableSlots)
            addRecipientsToCertType(eventId, typeId, limitedRecipients)
            refreshData()
            toast.warning(`Only ${limitedRecipients.length} of ${recipients.length} imported`, {
              description: `${planFeatures.displayName} plan limit: ${maxCertificates} certificates. Upgrade to add more.`
            })
            return
          }
        }

        addRecipientsToCertType(eventId, typeId, recipients)
        refreshData()
        toast.success(`${recipients.length} attendees imported!`)
      } catch {
        toast.error("Failed to parse Excel file")
      }
    }
    reader.readAsBinaryString(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Clear all recipients
  const handleClearRecipients = () => {
    toast.success("All attendees cleared")
  }

  // Download sample Excel
  const downloadSampleExcel = () => {
    const sampleData = [
      ["Prefix", "First Name", "Last Name", "Email", "Mobile", "Registration No"],
      ["Mr.", "John", "Doe", "john@example.com", "+91-9876543210", "REG-001"],
      ["Ms.", "Jane", "Smith", "jane@example.com", "+91-9876543211", "REG-002"],
      ["Dr.", "Bob", "Wilson", "bob@example.com", "+91-9876543212", "REG-003"],
    ]
    const ws = XLSX.utils.aoa_to_sheet(sampleData)

    // Set column widths
    ws['!cols'] = [
      { wch: 8 },  // Prefix
      { wch: 15 }, // First Name
      { wch: 15 }, // Last Name
      { wch: 25 }, // Email
      { wch: 18 }, // Mobile
      { wch: 15 }, // Registration No
    ]

    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Attendees")
    XLSX.writeFile(wb, "sample-attendees.xlsx")
    toast.success("Sample Excel downloaded!")
  }

  // Filter recipients
  const filteredRecipients = certType?.recipients.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.mobile?.includes(searchQuery) ||
    r.certificateId?.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (!certType) return <div className="p-12 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-400" /></div>

  return (
    <div className="min-h-screen w-full bg-[#FDFDFD] text-[#171717] relative">
      {/* Background Texture */}
      <div className="absolute inset-0 z-0 opacity-[0.4] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#D4D4D4 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
      </div>

      <div className="relative z-10 p-8 space-y-8 max-w-[1400px] mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#F0F0F0]"
        >
          <div className="flex items-start gap-4">
            <Button
              variant="outline"
              size="icon"
              onClick={() => router.push(`/client/certificates/${typeId}`)}
              className="mt-1 h-9 w-9 border-[#E5E5E5] bg-white text-[#666] hover:text-black hover:border-black/20 hover:bg-white shadow-sm transition-all rounded-full"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h1 className="text-[24px] font-semibold text-[#171717] tracking-tight">{certType.name}</h1>
                <span className="px-2 py-0.5 rounded-full bg-[#F5F5F5] text-[#666] text-[11px] font-medium border border-[#EBEBEB]">
                  {certType.stats.total} Attendees
                </span>
              </div>
              <p className="text-[14px] text-[#888] font-medium flex items-center gap-2">
                {eventName}
                <span className="w-1 h-1 rounded-full bg-[#D4D4D4]" />
                <span className={cn("text-[12px]", remainingSlots <= 10 ? "text-amber-600" : "text-[#888]")}>
                  {maxCertificates === -1 ? "Unlimited Plan" : `${remainingSlots} / ${maxCertificates} slots remaining`}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex gap-2">
              <Button onClick={openAddDialog} disabled={!canAddMore} className="h-9 bg-black hover:bg-[#333] text-white text-[13px] font-medium shadow-sm border border-transparent transition-all">
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                Add Attendee
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={handleExcelUpload}
              />
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={!canAddMore || !canImportData}
                className="h-9 bg-white border-[#E5E5E5] text-[#333] hover:bg-[#FAFAFA] hover:text-black hover:border-[#D4D4D4] text-[13px] font-medium shadow-sm transition-all"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 mr-2 text-[#666]" />
                Import Excel
                {!canImportData && <Lock className="h-3 w-3 ml-1.5 opacity-50" />}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="icon" className="h-9 w-9 border-[#E5E5E5] text-[#666] hover:text-black hover:bg-[#FAFAFA]">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={downloadSampleExcel}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Sample
                  </DropdownMenuItem>
                  {certType.recipients.length > 0 && (
                    <DropdownMenuItem onClick={handleClearRecipients} className="text-red-600 focus:text-red-600 focus:bg-red-50">
                      <Trash2 className="h-4 w-4 mr-2" />
                      Clear All
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </motion.div>

        {/* Search & Content */}
        <div className="space-y-4">
          {certType.recipients.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="relative max-w-sm"
            >
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#999]" />
              <Input
                placeholder="Filter by name, email, or Reg ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black text-[13px] shadow-sm transition-all placeholder:text-[#AAA]"
              />
            </motion.div>
          )}

          {certType.recipients.length === 0 ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-[#E5E5E5] border-dashed p-16 text-center shadow-sm"
            >
              <div className="w-16 h-16 bg-[#FAFAFA] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#F0F0F0]">
                <Users className="h-8 w-8 text-[#DDD]" />
              </div>
              <h3 className="text-lg font-semibold text-[#171717] mb-2 tracking-tight">No attendees yet</h3>
              <p className="text-[#888] text-[14px] mb-8 max-w-sm mx-auto">
                Get started by adding recipients manually or importing a bulk list from Excel.
              </p>
              <div className="flex justify-center gap-3">
                <Button onClick={openAddDialog} disabled={!canAddMore} className="bg-black hover:bg-[#333] text-white">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add First Attendee
                </Button>
                <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!canAddMore || !canImportData} className="border-[#E5E5E5] text-[#333] hover:bg-[#FAFAFA]">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  Import
                </Button>
              </div>
            </motion.div>
          ) : (
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm overflow-hidden"
            >
              <div className="max-h-[600px] overflow-auto">
                <Table>
                  <TableHeader className="bg-[#FAFAFA] sticky top-0 z-10">
                    <TableRow className="hover:bg-[#FAFAFA] border-b border-[#EBEBEB]">
                      <TableHead className="w-12 text-[11px] font-bold uppercase tracking-wider text-[#888] pl-6">#</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Attendee</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Contact</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Reg ID</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#888]">Status</TableHead>
                      <TableHead className="text-[11px] font-bold uppercase tracking-wider text-[#888] text-right">Downloads</TableHead>
                      <TableHead className="w-16"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <AnimatePresence initial={false}>
                      {filteredRecipients.map((r, i) => (
                        <motion.tr
                          key={r.id}
                          initial="hidden"
                          animate="visible"
                          exit={{ opacity: 0 }}
                          variants={fadeIn}
                          custom={i}
                          className="group hover:bg-[#FAFAFA] transition-colors border-b border-[#F5F5F5] last:border-0"
                        >
                          <TableCell className="text-[#888] font-medium text-[12px] pl-6">{i + 1}</TableCell>
                          <TableCell>
                            <div>
                              <div className="font-semibold text-[13px] text-[#171717]">{r.prefix} {r.firstName} {r.lastName}</div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col">
                              {r.email && <span className="text-[12px] text-[#666]">{r.email}</span>}
                              {r.mobile && <span className="text-[11px] text-[#999]">{r.mobile}</span>}
                            </div>
                          </TableCell>
                          <TableCell>
                            <code className="text-[11px] bg-[#F5F5F5] px-1.5 py-0.5 rounded text-[#555] font-mono border border-[#EBEBEB]">
                              {r.certificateId || r.regNo}
                            </code>
                          </TableCell>
                          <TableCell>
                            {r.status === "downloaded" ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F0FDF4] text-[#166534] border border-[#DCFCE7] uppercase tracking-wide">
                                Downloaded
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#F5F5F5] text-[#666] border border-[#EBEBEB] uppercase tracking-wide">
                                Pending
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="text-right text-[13px] font-medium text-[#171717]">{r.downloadCount}</TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-[#E5E5E5] rounded-full">
                                  <MoreHorizontal className="h-4 w-4 text-[#666]" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="text-[13px]">
                                <DropdownMenuItem onClick={() => openEditDialog(r)}>
                                  <Pencil className="h-3.5 w-3.5 mr-2" />
                                  Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteRecipient(r.id, r.name)}
                                  className="text-red-600 focus:text-red-600 focus:bg-red-50"
                                >
                                  <Trash2 className="h-3.5 w-3.5 mr-2" />
                                  Remove
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </TableBody>
                </Table>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Add Recipient Dialog - Styled */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#E5E5E5] shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#171717]">
              <div className="p-1.5 bg-[#FAFAFA] rounded-md border border-[#EBEBEB]">
                <UserPlus className="h-4 w-4 text-[#171717]" />
              </div>
              Add Attendee
            </DialogTitle>
            <DialogDescription className="text-[13px] text-[#666]">
              Enter the attendee's details manually.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="prefix" className="text-[12px] font-medium text-[#666]">Prefix (Optional)</Label>
              <select
                id="prefix"
                className="flex h-9 w-full items-center justify-between rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-sm placeholder:text-[#BBB] focus:outline-none focus:ring-1 focus:ring-black focus:border-black transition-all"
                value={formPrefix}
                onChange={(e) => setFormPrefix(e.target.value)}
              >
                <option value="">Select Prefix</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
                <option value="Er.">Er.</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName" className="text-[12px] font-medium text-[#171717]">
                  First Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="firstName"
                  placeholder="e.g. John"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  autoFocus
                  className="h-9 border-[#E5E5E5] focus-visible:ring-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName" className="text-[12px] font-medium text-[#666]">Last Name</Label>
                <Input
                  id="lastName"
                  placeholder="e.g. Doe"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  className="h-9 border-[#E5E5E5] focus-visible:ring-black"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-[12px] font-medium text-[#666]">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="h-9 border-[#E5E5E5] focus-visible:ring-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="mobile" className="text-[12px] font-medium text-[#666]">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="+1 234 567 8900"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                className="h-9 border-[#E5E5E5] focus-visible:ring-black"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#F5F5F5]">
              <div className="flex justify-between items-center">
                <Label htmlFor="regNo" className="text-[12px] font-medium text-[#666]">Registration ID</Label>
                <span className="text-[10px] text-[#999] uppercase tracking-wider font-semibold">Auto-Generated</span>
              </div>
              <Input
                id="regNo"
                placeholder="REG-..."
                value={formRegNo}
                onChange={(e) => setFormRegNo(e.target.value)}
                className="h-9 border-[#E5E5E5] bg-[#FAFAFA] font-mono text-[12px] text-[#555] focus-visible:ring-black"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)} className="h-9 border-[#E5E5E5] text-[#333] hover:bg-[#FAFAFA]">
              Cancel
            </Button>
            <Button onClick={handleAddRecipient} className="h-9 bg-black text-white hover:bg-[#333]">
              <Plus className="h-3.5 w-3.5 mr-2" />
              Add Attendee
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog - Styled similarly */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-md bg-white border-[#E5E5E5] shadow-xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-[18px] font-semibold text-[#171717]">
              <div className="p-1.5 bg-[#FAFAFA] rounded-md border border-[#EBEBEB]">
                <Pencil className="h-4 w-4 text-[#171717]" />
              </div>
              Edit Attendee
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-prefix">Prefix</Label>
              <select
                id="edit-prefix"
                className="flex h-9 w-full items-center justify-between rounded-md border border-[#E5E5E5] bg-white px-3 py-2 text-sm placeholder:text-[#BBB] focus:outline-none focus:ring-1 focus:ring-black focus:border-black"
                value={formPrefix}
                onChange={(e) => setFormPrefix(e.target.value)}
              >
                <option value="">Select Prefix</option>
                <option value="Mr.">Mr.</option>
                <option value="Ms.">Ms.</option>
                <option value="Mrs.">Mrs.</option>
                <option value="Dr.">Dr.</option>
                <option value="Prof.">Prof.</option>
                <option value="Er.">Er.</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-firstName">First Name</Label>
                <Input
                  id="edit-firstName"
                  value={formFirstName}
                  onChange={(e) => setFormFirstName(e.target.value)}
                  className="h-9 border-[#E5E5E5] focus-visible:ring-black"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-lastName">Last Name</Label>
                <Input
                  id="edit-lastName"
                  value={formLastName}
                  onChange={(e) => setFormLastName(e.target.value)}
                  className="h-9 border-[#E5E5E5] focus-visible:ring-black"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-email">Email Address</Label>
              <Input
                id="edit-email"
                type="email"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
                className="h-9 border-[#E5E5E5] focus-visible:ring-black"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-mobile">Mobile Number</Label>
              <Input
                id="edit-mobile"
                type="tel"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
                className="h-9 border-[#E5E5E5] focus-visible:ring-black"
              />
            </div>

            <div className="space-y-2 pt-2 border-t border-[#F5F5F5]">
              <Label htmlFor="edit-regNo">Registration ID</Label>
              <Input
                id="edit-regNo"
                value={formRegNo}
                onChange={(e) => setFormRegNo(e.target.value)}
                className="h-9 border-[#E5E5E5] bg-[#FAFAFA] font-mono text-[12px] text-[#555] focus-visible:ring-black"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setIsEditDialogOpen(false); setEditingRecipient(null); resetForm(); }} className="h-9 border-[#E5E5E5] text-[#333]">
              Cancel
            </Button>
            <Button onClick={handleUpdateRecipient} className="h-9 bg-black text-white hover:bg-[#333]">
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
