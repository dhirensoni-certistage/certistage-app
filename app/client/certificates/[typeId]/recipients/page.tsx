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
  getEvent, addRecipientsToCertType, clearCertTypeRecipients,
  type CertificateType 
} from "@/lib/events"
import { ArrowLeft, Users, FileSpreadsheet, Plus, Search, Trash2, Download, UserPlus } from "lucide-react"
import { toast } from "sonner"
import * as XLSX from "xlsx"

export default function CertTypeRecipientsPage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [eventName, setEventName] = useState("")
  const [searchQuery, setSearchQuery] = useState("")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form fields for adding single recipient
  const [formName, setFormName] = useState("")
  const [formEmail, setFormEmail] = useState("")
  const [formMobile, setFormMobile] = useState("")
  const [formCertId, setFormCertId] = useState("")

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
    setFormName("")
    setFormEmail("")
    setFormMobile("")
    setFormCertId("")
  }

  // Open add dialog
  const openAddDialog = () => {
    resetForm()
    setFormCertId(generateRegNo()) // Auto-generate registration number
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

    if (!formName.trim()) {
      toast.error("Name is required")
      return
    }

    if (!formEmail.trim() && !formMobile.trim()) {
      toast.error("Please enter email or mobile number")
      return
    }

    if (!eventId) return

    const recipient = {
      name: formName.trim(),
      email: formEmail.trim(),
      mobile: formMobile.trim(),
      certificateId: formCertId.trim() || generateRegNo()
    }

    addRecipientsToCertType(eventId, typeId, [recipient])
    refreshData()
    setIsAddDialogOpen(false)
    resetForm()
    toast.success(`${recipient.name} added successfully!`)
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
        toast.success(`${recipients.length} recipients imported!`)
      } catch {
        toast.error("Failed to parse Excel file")
      }
    }
    reader.readAsBinaryString(file)
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  // Clear all recipients
  const handleClearRecipients = () => {
    if (!eventId || !confirm("Remove all recipients? This cannot be undone.")) return
    clearCertTypeRecipients(eventId, typeId)
    refreshData()
    toast.success("All recipients cleared")
  }

  // Download sample Excel
  const downloadSampleExcel = () => {
    const sampleData = [
      ["Name", "Email", "Mobile", "Registration No"],
      ["John Doe", "john@example.com", "+91-9876543210", "REG-001"],
      ["Jane Smith", "jane@example.com", "+91-9876543211", "REG-002"],
      ["Bob Wilson", "bob@example.com", "+91-9876543212", "REG-003"],
    ]
    const ws = XLSX.utils.aoa_to_sheet(sampleData)
    
    // Set column widths
    ws['!cols'] = [
      { wch: 20 }, // Name
      { wch: 25 }, // Email
      { wch: 18 }, // Mobile
      { wch: 15 }, // Certificate ID
    ]
    
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, "Recipients")
    XLSX.writeFile(wb, "sample-recipients.xlsx")
    toast.success("Sample Excel downloaded!")
  }

  // Filter recipients
  const filteredRecipients = certType?.recipients.filter(r => 
    r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    r.mobile.includes(searchQuery) ||
    r.certificateId.toLowerCase().includes(searchQuery.toLowerCase())
  ) || []

  if (!certType) return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push(`/client/certificates/${typeId}`)}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">{certType.name} - Recipients</h1>
          <p className="text-muted-foreground">{eventName}</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{certType.stats.total} recipients</Badge>
          {maxCertificates !== -1 && (
            <Badge variant={remainingSlots <= 10 ? "destructive" : "outline"}>
              {remainingSlots} / {maxCertificates} remaining
            </Badge>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <Button onClick={openAddDialog} disabled={!canAddMore}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Recipient
          </Button>
          <input 
            ref={fileInputRef} 
            type="file" 
            accept=".xlsx,.xls,.csv" 
            className="hidden" 
            onChange={handleExcelUpload} 
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!canAddMore || !canImportData}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Import Excel
            {!canImportData && <Lock className="h-3 w-3 ml-1 inline" />}
          </Button>
          <Button variant="outline" onClick={downloadSampleExcel}>
            <Download className="h-4 w-4 mr-2" />
            Sample Excel
          </Button>
        </div>
        {certType.recipients.length > 0 && (
          <Button variant="outline" className="text-destructive hover:text-destructive" onClick={handleClearRecipients}>
            <Trash2 className="h-4 w-4 mr-2" />
            Clear All
          </Button>
        )}
      </div>

      {/* Recipients List */}
      {certType.recipients.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Users className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Recipients Yet</h3>
            <p className="text-muted-foreground mb-6 max-w-md mx-auto">
              Add recipients one by one or import multiple from an Excel file
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={openAddDialog} disabled={!canAddMore}>
                <UserPlus className="h-4 w-4 mr-2" />
                Add Recipient
              </Button>
              <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={!canAddMore || !canImportData}>
                <FileSpreadsheet className="h-4 w-4 mr-2" />
                Import Excel
                {!canImportData && <Lock className="h-3 w-3 ml-1 inline" />}
              </Button>
            </div>
            {!canAddMore && (
              <p className="text-sm text-destructive mt-4">
                {planFeatures.displayName} plan limit reached ({maxCertificates} certificates). <a href="/client/upgrade" className="underline">Upgrade</a> to add more.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recipients</CardTitle>
                <CardDescription>
                  {filteredRecipients.length} of {certType.recipients.length} shown
                </CardDescription>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name, email, mobile..." 
                  value={searchQuery} 
                  onChange={(e) => setSearchQuery(e.target.value)} 
                  className="pl-9 w-64" 
                />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border overflow-hidden">
              <div className="max-h-[500px] overflow-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-background">
                    <TableRow>
                      <TableHead className="w-12">#</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Mobile</TableHead>
                      <TableHead>Registration No</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Downloads</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecipients.map((r, i) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                        <TableCell className="font-medium">{r.name}</TableCell>
                        <TableCell className="text-muted-foreground">{r.email || "-"}</TableCell>
                        <TableCell className="text-muted-foreground">{r.mobile || "-"}</TableCell>
                        <TableCell>
                          <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                            {r.certificateId}
                          </code>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={r.status === "downloaded" ? "default" : "outline"} 
                            className={r.status === "downloaded" ? "bg-emerald-500" : ""}
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">{r.downloadCount}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            <div className="space-y-2">
              <Label htmlFor="name">
                Full Name <span className="text-destructive">*</span>
              </Label>
              <Input
                id="name"
                placeholder="Enter full name"
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                autoFocus
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email address"
                value={formEmail}
                onChange={(e) => setFormEmail(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="Enter mobile number (e.g., +91-9876543210)"
                value={formMobile}
                onChange={(e) => setFormMobile(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="regNo">Registration No</Label>
              <Input
                id="regNo"
                placeholder="Enter registration number"
                value={formCertId}
                onChange={(e) => setFormCertId(e.target.value)}
                className="font-mono"
              />
              <p className="text-xs text-muted-foreground">
                Unique identifier for this recipient
              </p>
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
