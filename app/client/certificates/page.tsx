"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Slider } from "@/components/ui/slider"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { getClientSession, getCurrentPlanFeatures, getTrialStatus, PLAN_FEATURES } from "@/lib/auth"
import { LockedFeature } from "@/components/client/upgrade-overlay"
import {
  getCertTypePublicLink,
  type CertificateEvent, type CertificateType, type TextField
} from "@/lib/events"
import { motion, AnimatePresence } from "framer-motion"

// PDF-compatible fonts only (jsPDF limitation)
const PDF_FONTS = [
  { name: "Helvetica", value: "Helvetica", category: "Sans-serif" },
  { name: "Times New Roman", value: "Times", category: "Serif" },
  { name: "Courier", value: "Courier", category: "Monospace" },
]

// Available variables for certificates
const AVAILABLE_VARIABLES = [
  { key: "NAME", label: "Recipient Name", field: "name" },
  { key: "EMAIL", label: "Email Address", field: "email" },
  { key: "MOBILE", label: "Mobile Number", field: "mobile" },
  { key: "REG_NO", label: "Registration No", field: "certificateId" },
]
import {
  Plus, FileText, Trash2, Image, Upload, Move, Eye, Check, ArrowLeft,
  Bold, Italic, Link as LinkIcon, Copy, Users, Download, Settings, PenTool, X, Crown, Award, Lock, Search, Loader2, MoreHorizontal, ExternalLink
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CertificatesPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [event, setEvent] = useState<CertificateEvent | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [selectedTypeId, setSelectedTypeId] = useState<string | null>(null)
  const [showAddDialog, setShowAddDialog] = useState(false)
  const [newTypeName, setNewTypeName] = useState("")
  const [deleteType, setDeleteType] = useState<CertificateType | null>(null)
  const [activeTab, setActiveTab] = useState("template")
  const [isUserLogin, setIsUserLogin] = useState(false)
  const [isTrialExpired, setIsTrialExpired] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [maxCertificateTypes, setMaxCertificateTypes] = useState<number>(-1) // -1 = unlimited

  // Template editor state
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [draggingFieldId, setDraggingFieldId] = useState<string | null>(null)
  const [showPreview, setShowPreview] = useState(false)

  const [selectedFieldId, setSelectedFieldId] = useState<string>("NAME") // NAME or field ID
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce timer ref for API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Record<string, unknown>>({})
  const lastSaveTimeRef = useRef<number>(0)

  // Update local certificate type state immediately (for smooth UI)
  const updateLocalCertType = useCallback((updates: Partial<CertificateType>) => {
    if (!selectedTypeId) return

    setEvent(prev => {
      if (!prev) return prev
      return {
        ...prev,
        certificateTypes: prev.certificateTypes.map(ct =>
          ct.id === selectedTypeId ? { ...ct, ...updates } : ct
        )
      }
    })
  }, [selectedTypeId])

  // Track current typeId for flush
  const currentTypeIdRef = useRef<string | null>(null)
  useEffect(() => {
    currentTypeIdRef.current = selectedTypeId
  }, [selectedTypeId])

  // Flush pending updates immediately (used on unmount/navigation)
  const flushPendingUpdates = useCallback(async () => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
      debounceTimerRef.current = null
    }

    const updates = pendingUpdatesRef.current
    const typeId = currentTypeIdRef.current
    if (Object.keys(updates).length === 0 || !typeId) return

    pendingUpdatesRef.current = {}

    const session = getClientSession()
    if (!session?.userId) return

    try {
      await fetch('/api/client/certificate-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          typeId,
          ...updates
        })
      })
    } catch (error) {
      console.error('Failed to flush updates:', error)
    }
  }, [])

  // Flush pending updates on unmount (navigation away)
  useEffect(() => {
    return () => {
      flushPendingUpdates()
    }
  }, [flushPendingUpdates])

  // Sync to API in background (debounced)
  const syncToAPI = useCallback((typeId: string, updates: Record<string, unknown>) => {
    // Merge with pending updates
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }

    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    // Set new timer - sync after 500ms of no changes (reduced from 800ms)
    debounceTimerRef.current = setTimeout(async () => {
      const session = getClientSession()
      if (!session?.userId) return

      const updatesToSend = { ...pendingUpdatesRef.current }
      pendingUpdatesRef.current = {} // Clear pending

      try {
        lastSaveTimeRef.current = Date.now()
        await fetch('/api/client/certificate-types', {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.userId,
            typeId,
            ...updatesToSend
          })
        })
      } catch (error) {
        console.error('Failed to sync:', error)
      }
    }, 500)
  }, [])

  // API helper to update certificate type (immediate - for non-frequent updates)
  const updateCertTypeAPI = async (typeId: string, updates: Record<string, unknown>) => {
    const session = getClientSession()
    if (!session?.userId) return false

    try {
      const res = await fetch('/api/client/certificate-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          typeId,
          ...updates
        })
      })
      lastSaveTimeRef.current = Date.now()
      return res.ok
    } catch {
      return false
    }
  }

  // Fetch event data from API
  const fetchEventData = async (evtId: string) => {
    try {
      const res = await fetch(`/api/client/dashboard?eventId=${evtId}`)
      if (res.ok) {
        const data = await res.json()
        // Convert API response to match expected format
        if (data.event) {
          const apiEvent = data.event
          const convertedEvent: CertificateEvent = {
            id: apiEvent._id,
            name: apiEvent.name,
            description: apiEvent.description,
            createdAt: apiEvent.createdAt || new Date().toISOString(),
            certificateTypes: apiEvent.certificateTypes.map((ct: any) => ({
              id: ct.id,
              name: ct.name,
              template: ct.templateImage || ct.template || "",
              textPosition: ct.textPosition || { x: 50, y: 60 },
              fontSize: ct.fontSize || 24,
              fontFamily: ct.fontFamily || "Arial",
              fontBold: ct.fontBold || false,
              fontItalic: ct.fontItalic || false,
              textCase: ct.textCase || "none",
              showNameField: ct.showNameField !== false,
              customFields: ct.customFields || [],
              signatures: ct.signatures || [],
              searchFields: ct.searchFields || { name: true, email: false, mobile: false, regNo: false },
              recipients: ct.recipients || [],
              stats: ct.stats,
              createdAt: ct.createdAt || new Date().toISOString()
            })),
            stats: apiEvent.stats
          }

          // Only update state if not recently saved (within 3 seconds)
          if (Date.now() - lastSaveTimeRef.current > 3000) {
            setEvent(convertedEvent)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch event data:", error)
    }
    setIsLoading(false)
  }

  const refreshEvent = useCallback(() => {
    const session = getClientSession()
    if (session) {
      if (session.eventId) {
        setEventId(session.eventId)
        fetchEventData(session.eventId)
      } else {
        setIsLoading(false)
      }

      if (session.loginType === "user") {
        setIsUserLogin(true)
        const trialStatus = getTrialStatus(session.userId)
        setIsTrialExpired(trialStatus.isExpired)
        const planFeatures = getCurrentPlanFeatures()
        setMaxCertificateTypes(planFeatures.maxCertificateTypes)
      } else {
        setIsUserLogin(false)
        setMaxCertificateTypes(-1)
      }
    } else {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    refreshEvent()
    // Check URL for type parameter
    const typeParam = searchParams.get('type')
    if (typeParam) {
      setSelectedTypeId(typeParam)
    }
  }, [refreshEvent, searchParams])

  // Only poll when NOT actively editing (dragging/resizing)
  useEffect(() => {
    // Don't poll while user is interacting with the editor
    if (isDraggingText || draggingFieldId) {
      return
    }

    // Also don't poll when in template editor tab with a selected type
    if (selectedTypeId && activeTab === "template") {
      return
    }

    const interval = setInterval(refreshEvent, 5000) // Increased to 5 seconds
    return () => clearInterval(interval)
  }, [refreshEvent, isDraggingText, draggingFieldId, selectedTypeId, activeTab])

  // No need to load Google Fonts anymore - using only PDF-compatible system fonts

  const selectedType = event?.certificateTypes.find(t => t.id === selectedTypeId) || null

  const handleAddCertificateType = async () => {
    if (!newTypeName.trim() || !eventId) {
      toast.error("Please enter certificate type name")
      return
    }

    // Check certificate type limit
    if (maxCertificateTypes !== -1 && event && event.certificateTypes.length >= maxCertificateTypes) {
      const planFeatures = getCurrentPlanFeatures()
      toast.error("Certificate type limit reached!", {
        description: `Your ${planFeatures.displayName} plan allows ${maxCertificateTypes} certificate type${maxCertificateTypes > 1 ? 's' : ''}.`,
        action: {
          label: "Upgrade",
          onClick: () => window.location.href = "/client/upgrade"
        }
      })
      setShowAddDialog(false)
      return
    }

    // Get userId from session
    const session = getClientSession()
    if (!session?.userId) {
      toast.error("Session expired. Please login again.")
      return
    }

    try {
      const res = await fetch('/api/client/certificate-types', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          eventId,
          name: newTypeName.trim()
        })
      })

      const data = await res.json()

      if (res.ok && data.certificateType) {
        fetchEventData(eventId)
        setSelectedTypeId(data.certificateType.id)
        setShowAddDialog(false)
        setNewTypeName("")
        toast.success(`"${newTypeName}" created!`)
      } else {
        toast.error(data.error || "Failed to create certificate type")
      }
    } catch (error) {
      toast.error("Failed to create certificate type")
    }
  }

  const handleDeleteType = async () => {
    if (!eventId || !deleteType) return

    const session = getClientSession()
    if (!session?.userId) {
      toast.error("Session expired")
      return
    }

    try {
      const res = await fetch(`/api/client/certificate-types?typeId=${deleteType.id}&userId=${session.userId}&permanent=true`, {
        method: 'DELETE'
      })

      if (res.ok) {
        setDeleteType(null)
        if (selectedTypeId === deleteType.id) {
          setSelectedTypeId(null)
        }
        fetchEventData(eventId)
        toast.success("Certificate type deleted")
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete")
      }
    } catch (error) {
      toast.error("Failed to delete certificate type")
    }
  }

  const handleBackToList = async () => {
    // Flush any pending updates before navigating
    await flushPendingUpdates()
    setSelectedTypeId(null)
    router.push('/client/certificates')
  }

  // Template handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }, [])

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    const files = e.dataTransfer.files
    if (files.length > 0) handleFile(files[0])
  }, [eventId, selectedTypeId])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }
    if (!eventId || !selectedTypeId) return

    const session = getClientSession()
    if (!session?.userId) {
      toast.error("Session expired")
      return
    }

    toast.loading("Uploading template...", { id: "template-upload" })

    const img = document.createElement("img")
    img.onload = async () => {
      const canvas = document.createElement("canvas")
      const maxWidth = 1200
      const maxHeight = 900
      let { width, height } = img
      if (width > maxWidth || height > maxHeight) {
        const ratio = Math.min(maxWidth / width, maxHeight / height)
        width = width * ratio
        height = height * ratio
      }
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext("2d")
      ctx?.drawImage(img, 0, 0, width, height)
      const compressedData = canvas.toDataURL("image/jpeg", 0.8)

      // Upload to Cloudinary via API
      try {
        const res = await fetch('/api/client/upload-template', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: session.userId,
            typeId: selectedTypeId,
            imageData: compressedData
          })
        })

        if (res.ok) {
          fetchEventData(eventId)
          toast.success("Template uploaded!", { id: "template-upload" })
        } else {
          const data = await res.json()
          toast.error(data.error || "Failed to upload template", { id: "template-upload" })
        }
      } catch (error) {
        toast.error("Failed to upload template", { id: "template-upload" })
      }
    }
    const reader = new FileReader()
    reader.onload = (e) => { img.src = e.target?.result as string }
    reader.readAsDataURL(file)
  }

  const removeTemplate = async () => {
    if (!eventId || !selectedTypeId) return

    const session = getClientSession()
    if (!session?.userId) {
      toast.error("Session expired")
      return
    }

    try {
      const res = await fetch('/api/client/certificate-types', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: session.userId,
          typeId: selectedTypeId,
          templateImage: ""
        })
      })

      if (res.ok) {
        fetchEventData(eventId)
        toast.info("Template removed")
      } else {
        toast.error("Failed to remove template")
      }
    } catch (error) {
      toast.error("Failed to remove template")
    }
  }

  // Local position state for smooth dragging
  const [localPosition, setLocalPosition] = useState({ x: 50, y: 60 })
  const [localFieldPositions, setLocalFieldPositions] = useState<Record<string, { x: number; y: number }>>({})

  const lastSaveRef = useRef<number>(0)

  // Refs for event handlers to avoid dependency cycles and frequent listener re-binding
  const localPositionRef = useRef(localPosition)
  const localFieldPositionsRef = useRef(localFieldPositions)

  // Update refs when state changes
  useEffect(() => { localPositionRef.current = localPosition }, [localPosition])
  useEffect(() => { localFieldPositionsRef.current = localFieldPositions }, [localFieldPositions])

  // Sync local position with selected type
  useEffect(() => {
    if (selectedType) {
      setLocalPosition(selectedType.textPosition)
      // Sync custom field positions
      const fieldPositions: Record<string, { x: number; y: number }> = {}
      selectedType.customFields?.forEach(f => {
        fieldPositions[f.id] = f.position
      })
      setLocalFieldPositions(fieldPositions)
    }
  }, [selectedType?.id])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingText(true)
    setSelectedFieldId("NAME")
  }

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingFieldId(fieldId)
    setSelectedFieldId(fieldId)
  }

  const handleMouseMove = useCallback((e: MouseEvent) => {
    e.preventDefault()
    if (!containerRef.current) return

    // Find image within the container for precise bounds
    const imgElement = containerRef.current.querySelector('img')
    if (!imgElement) return

    const rect = imgElement.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) return

    // Calculate percentage relative to the image dimensions
    const rawX = ((e.clientX - rect.left) / rect.width) * 100
    const rawY = ((e.clientY - rect.top) / rect.height) * 100

    // Clamp to valid range (allow slight edge buffer 0-100)
    const x = Math.max(0, Math.min(100, rawX))
    const y = Math.max(0, Math.min(100, rawY))

    if (isDraggingText) {
      setLocalPosition({ x, y })
    } else if (draggingFieldId) {
      setLocalFieldPositions(prev => ({ ...prev, [draggingFieldId]: { x, y } }))
    }
  }, [isDraggingText, draggingFieldId])

  const handleMouseUp = useCallback(() => {
    // We use refs to get the latest values without needing them in the dependency array
    // This keeps the event listener stable.

    // Save text position on drag end
    if (isDraggingText && eventId && selectedTypeId) {
      const newPos = localPositionRef.current
      updateLocalCertType({ textPosition: newPos })
      updateCertTypeAPI(selectedTypeId, { textPosition: newPos })
    }
    // Save custom field position on drag end
    if (draggingFieldId && eventId && selectedTypeId && selectedType) {
      const pos = localFieldPositionsRef.current[draggingFieldId]
      if (pos) {
        const fields = selectedType.customFields || []
        const updatedFields = fields.map(f =>
          f.id === draggingFieldId ? { ...f, position: pos } : f
        )
        updateLocalCertType({ customFields: updatedFields })
        updateCertTypeAPI(selectedTypeId, { customFields: updatedFields })
      }
    }
    // State flags are cleared immediately
    setIsDraggingText(false)
    setDraggingFieldId(null)
  }, [eventId, selectedTypeId, selectedType, isDraggingText, draggingFieldId, refreshEvent])

  useEffect(() => {
    if (isDraggingText || draggingFieldId) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDraggingText, draggingFieldId, handleMouseMove, handleMouseUp])

  if (isLoading) {
    return (
      <div className="flex bg-[#FDFDFD] h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-200" />
      </div>
    )
  }

  if (!event) {
    return (
      <div className="flex bg-[#FDFDFD] h-[80vh] w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-neutral-200" />
      </div>
    )
  }

  // If a certificate type is selected, show the editor
  if (selectedType) {
    return (
      <div className="p-6 space-y-6">
        {/* Header with Back Button */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={handleBackToList}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{selectedType.name}</h1>
            <p className="text-muted-foreground">Configure template and manage download links</p>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList>
            <TabsTrigger value="template" className="gap-2">
              <Image className="h-4 w-4" />
              Template
            </TabsTrigger>
            <TabsTrigger value="links" className="gap-2">
              <LinkIcon className="h-4 w-4" />
              Download Links
            </TabsTrigger>
          </TabsList>

          <TabsContent value="template" className="space-y-4">
            <TemplateEditor
              certType={selectedType}
              localPosition={localPosition}
              localFieldPositions={localFieldPositions}
              isDragging={isDragging}
              isDraggingText={isDraggingText}
              draggingFieldId={draggingFieldId}
              showPreview={showPreview}
              selectedFieldId={selectedFieldId}
              containerRef={containerRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
              onMouseDown={handleMouseDown}
              onFieldMouseDown={handleFieldMouseDown}
              onRemoveTemplate={removeTemplate}
              onTogglePreview={() => setShowPreview(!showPreview)}
              onPositionChange={(axis, value) => {
                const newPosition = { ...localPosition, [axis]: value }
                setLocalPosition(newPosition)
                // Update local state immediately
                updateLocalCertType({ textPosition: newPosition })
                // Sync to API in background
                if (selectedTypeId) syncToAPI(selectedTypeId, { textPosition: newPosition })
              }}
              onFontChange={(updates) => {
                // Check if this is a critical setting that needs immediate save
                const isCriticalUpdate = 'textCase' in updates || 'fontFamily' in updates
                
                // Update based on selected field
                if (selectedFieldId === "NAME") {
                  updateLocalCertType(updates as Partial<CertificateType>)
                  if (selectedTypeId) {
                    if (isCriticalUpdate) {
                      // Immediate save for critical settings
                      updateCertTypeAPI(selectedTypeId, updates)
                    } else {
                      // Debounced save for frequent updates (fontSize, etc.)
                      syncToAPI(selectedTypeId, updates)
                    }
                  }
                } else {
                  // Custom field update
                  if (selectedType && selectedType.customFields) {
                    const updatedFields = selectedType.customFields.map(f =>
                      f.id === selectedFieldId ? { ...f, ...updates } : f
                    )
                    updateLocalCertType({ customFields: updatedFields })
                    if (selectedTypeId) {
                      if (isCriticalUpdate) {
                        updateCertTypeAPI(selectedTypeId, { customFields: updatedFields })
                      } else {
                        syncToAPI(selectedTypeId, { customFields: updatedFields })
                      }
                    }
                  }
                }
              }}
              onSelectField={setSelectedFieldId}
              onAddCustomField={async (variable) => {
                if (eventId && selectedTypeId) {
                  const newField: TextField = {
                    id: `field_${Date.now()}`,
                    variable,
                    position: { x: 50, y: 50 },
                    fontSize: selectedType.fontSize,
                    fontFamily: selectedType.fontFamily,
                    fontBold: selectedType.fontBold,
                    fontItalic: selectedType.fontItalic,
                  }
                  const currentFields = selectedType.customFields || []
                  if (currentFields.find(f => f.variable === variable)) {
                    toast.error(`{{${variable}}} already added`)
                    return
                  }
                  const updatedFields = [...currentFields, newField]
                  // Optimistic UI update - instant feedback
                  updateLocalCertType({ customFields: updatedFields })
                  setLocalFieldPositions(prev => ({ ...prev, [newField.id]: newField.position }))
                  // Immediate API call for add/remove operations
                  const success = await updateCertTypeAPI(selectedTypeId, { customFields: updatedFields })
                  if (success) {
                    toast.success(`{{${variable}}} added! Drag it to position.`)
                  } else {
                    // Revert on failure
                    toast.error("Failed to add field")
                    refreshEvent()
                  }
                }
              }}
              onRemoveCustomField={async (fieldId) => {
                if (eventId && selectedTypeId) {
                  const currentFields = selectedType.customFields || []
                  const updatedFields = currentFields.filter(f => f.id !== fieldId)
                  // Optimistic UI update - instant feedback
                  updateLocalCertType({ customFields: updatedFields })
                  // Immediate API call for add/remove operations
                  const success = await updateCertTypeAPI(selectedTypeId, { customFields: updatedFields })
                  if (success) {
                    toast.success("Field removed")
                  } else {
                    // Revert on failure
                    toast.error("Failed to remove field")
                    refreshEvent()
                  }
                }
              }}
              onRemoveNameField={() => {
                if (eventId && selectedTypeId) {
                  // Optimistic UI update
                  updateLocalCertType({ showNameField: false })
                  // Sync to API in background
                  syncToAPI(selectedTypeId, { showNameField: false })
                  toast.success("NAME field removed")
                }
              }}
              onRestoreNameField={() => {
                if (eventId && selectedTypeId) {
                  // Optimistic UI update
                  updateLocalCertType({ showNameField: true })
                  // Sync to API in background
                  syncToAPI(selectedTypeId, { showNameField: true })
                  toast.success("NAME field restored")
                }
              }}
              onSearchFieldsChange={async (searchFields) => {
                if (eventId && selectedTypeId) {
                  // Optimistic UI update
                  updateLocalCertType({ searchFields })
                  // Immediate API call (not debounced) for critical settings
                  const success = await updateCertTypeAPI(selectedTypeId, { searchFields })
                  if (success) {
                    toast.success("Search fields updated")
                  } else {
                    toast.error("Failed to save search fields")
                    // Revert on failure
                    refreshEvent()
                  }
                }
              }}
            />
          </TabsContent>

          <TabsContent value="links">
            <LinksTab certType={selectedType} eventId={eventId!} />
          </TabsContent>
        </Tabs>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteType} onOpenChange={(open) => !open && setDeleteType(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Certificate Type?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete "{deleteType?.name}" and all its {deleteType?.stats.total || 0} recipients.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    )
  }

  // Default view - Certificate Cards Grid
  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[11px] font-semibold text-[#888] uppercase tracking-[0.15em]">Configure</span>
          </div>
          <h1 className="text-[24px] font-semibold text-black tracking-tight leading-none">Manage Certificates</h1>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          disabled={maxCertificateTypes !== -1 && event.certificateTypes.length >= maxCertificateTypes}
          className="h-9 px-4 text-sm bg-black text-white hover:bg-[#222]"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create New Certificate
          {maxCertificateTypes !== -1 && event.certificateTypes.length >= maxCertificateTypes && <Lock className="h-3 w-3 ml-1 inline" />}
        </Button>
      </div>

      {/* Limit Warning - Professional Design */}
      {maxCertificateTypes !== -1 && event.certificateTypes.length >= maxCertificateTypes && (
        <Card className="border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-orange-500/5">
          <CardContent className="p-6">
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                <Award className="h-6 w-6 text-amber-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-foreground mb-1">Certificate Type Limit Reached</h3>
                <p className="text-sm text-muted-foreground mb-3">
                  You've created {maxCertificateTypes} certificate type{maxCertificateTypes > 1 ? 's' : ''} â€” the maximum for your {getCurrentPlanFeatures().displayName} plan.
                  Upgrade to create more certificate types and unlock premium features.
                </p>
                <div className="flex items-center gap-3">
                  <a
                    href="/client/upgrade"
                    className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-gradient-to-r from-amber-500 to-orange-500 rounded-lg hover:from-amber-600 hover:to-orange-600 transition-all shadow-sm"
                  >
                    <Crown className="h-4 w-4" />
                    Upgrade Now
                  </a>
                  <span className="text-xs text-muted-foreground">Starting from ₹2,999/year</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Certificate Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
        {event.certificateTypes.length === 0 ? (
          <div className="col-span-full py-24 border border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA] flex flex-col items-center justify-center text-center">
            <div className="h-12 w-12 rounded-xl bg-white border border-[#E5E5E5] flex items-center justify-center mb-4 shadow-sm">
              <FileText className="h-6 w-6 text-[#999]" />
            </div>
            <h3 className="text-[15px] font-semibold text-black mb-1">No certificates created</h3>
            <p className="text-[13px] text-[#666] mb-6 max-w-[300px]">Design your first certificate template visually and send it to attendees.</p>
            <Button onClick={() => setShowAddDialog(true)} className="h-9 text-xs font-medium bg-black text-white hover:bg-[#333] px-5 rounded-md shadow-sm">
              Create First Certificate
            </Button>
          </div>
        ) : (
          <>
            {event.certificateTypes.map((certType, index) => (
              <motion.div
                key={certType.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.2 }}
              >
                <div
                  className="group relative flex flex-col bg-white rounded-xl border border-[#E5E5E5] hover:border-[#D4D4D4] hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all duration-300 cursor-pointer overflow-hidden h-auto hover:-translate-y-0.5"
                  onClick={() => setSelectedTypeId(certType.id)}
                >
                  {/* Thumbnail Section - 16:10 Aspect Ratio */}
                  <div className="aspect-[16/10] bg-[#F9F9FA] relative border-b border-[#F0F0F0] overflow-hidden group-hover:bg-[#F5F5F7] transition-colors">
                    {certType.template ? (
                      <div className="w-full h-full p-4 flex items-center justify-center">
                        <img
                          src={certType.template}
                          alt={certType.name}
                          className="w-full h-full object-contain shadow-sm group-hover:scale-[1.03] transition-transform duration-500 ease-out"
                        />
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full gap-3 text-[#A3A3A3]">
                        <div className="p-3 bg-white rounded-lg border border-[#EBEBEB] shadow-sm">
                          <Image className="h-5 w-5 opacity-40" />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider opacity-50">Empty Template</span>
                      </div>
                    )}

                    {/* Status Indicator (Top Left) */}
                    <div className="absolute top-3 left-3">
                      {certType.template ? (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur shadow-sm border border-black/5">
                          <div className="w-1.5 h-1.5 rounded-full bg-neutral-500"></div>
                          <span className="text-[9px] font-bold text-[#444] tracking-wide uppercase">Active</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/90 backdrop-blur shadow-sm border border-black/5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          <span className="text-[9px] font-bold text-[#444] tracking-wide uppercase">Draft</span>
                        </div>
                      )}
                    </div>

                    {/* Context Menu (Top Right) */}
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7 bg-white/90 backdrop-blur hover:bg-white text-black shadow-sm border border-black/5 rounded-md" onClick={(e) => e.stopPropagation()}>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            if (!certType.template) {
                              toast.error("Upload template first")
                              return
                            }
                            const link = `${window.location.origin}${getCertTypePublicLink(eventId!, certType.id)}`
                            navigator.clipboard.writeText(link)
                            toast.success("Link copied!")
                          }}>
                            <LinkIcon className="h-3.5 w-3.5 mr-2" />
                            Copy Public Link
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation()
                            const path = getCertTypePublicLink(eventId!, certType.id)
                            window.open(path, '_blank')
                          }}>
                            <ExternalLink className="h-3.5 w-3.5 mr-2" />
                            Preview Page
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600 focus:text-red-600 focus:bg-red-50" onClick={(e) => { e.stopPropagation(); setDeleteType(certType) }}>
                            <Trash2 className="h-3.5 w-3.5 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {/* Content Section */}
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="text-[14px] font-semibold text-[#0F0F0F] leading-snug group-hover:text-black transition-colors">{certType.name}</h3>
                        <p className="text-[11px] text-[#666] mt-0.5 line-clamp-1">Created on {new Date(certType.createdAt || Date.now()).toLocaleDateString()}</p>
                      </div>
                    </div>

                    {/* Stats Grid */}
                    <div className="flex items-center gap-4 py-2 border-t border-dashed border-[#F0F0F0]">
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-[#888] uppercase tracking-wide">Attendees</span>
                        <div className="flex items-center gap-1.5">
                          <Users className="h-3.5 w-3.5 text-[#444]" />
                          <span className="text-[13px] font-semibold text-[#171717]">{certType.stats.total}</span>
                        </div>
                      </div>
                      <div className="w-px h-6 bg-[#F0F0F0]"></div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-[10px] font-medium text-[#888] uppercase tracking-wide">Downloads</span>
                        <div className="flex items-center gap-1.5">
                          <Download className="h-3.5 w-3.5 text-[#444]" />
                          <span className="text-[13px] font-semibold text-[#171717]">{certType.stats.downloaded}</span>
                        </div>
                      </div>
                    </div>

                    {/* Hover Action */}
                    <div className="absolute bottom-4 right-4 translate-x-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300">
                      <div className="h-8 px-3 flex items-center gap-2 bg-black text-white text-[11px] font-medium rounded-md shadow-sm">
                        Manage <ArrowLeft className="h-3 w-3 rotate-180" />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add New Card (Minimalist Dashed) */}
            {(maxCertificateTypes === -1 || event.certificateTypes.length < maxCertificateTypes) && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
              >
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="group w-full h-full min-h-[290px] rounded-xl border border-dashed border-[#D4D4D4] bg-[#FAFAFA]/50 hover:bg-[#FAFAFA] hover:border-[#999] transition-all duration-300 flex flex-col items-center justify-center gap-4 box-border outline-none focus:ring-2 focus:ring-black/5"
                >
                  <div className="h-10 w-10 rounded-full bg-white border border-[#E5E5E5] flex items-center justify-center shadow-sm group-hover:scale-115 transition-transform duration-300 group-hover:border-[#999]">
                    <Plus className="h-5 w-5 text-[#666] group-hover:text-black transition-colors" />
                  </div>
                  <div className="text-center">
                    <span className="block text-[13px] font-semibold text-[#444] group-hover:text-black transition-colors">Create New Type</span>
                    <span className="text-[11px] text-[#888] group-hover:text-[#666]">Add a new certificate template</span>
                  </div>
                </button>
              </motion.div>
            )}
          </>
        )}
      </div>

      {/* Create Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Certificate</DialogTitle>
            <DialogDescription>Add a new certificate category for your event</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label>Certificate Type Name</Label>
            <Input
              placeholder="e.g., Participation Certificate, Winner Certificate"
              value={newTypeName}
              onChange={(e) => setNewTypeName(e.target.value)}
              className="mt-1"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleAddCertificateType()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddCertificateType}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteType} onOpenChange={(open) => !open && setDeleteType(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Certificate Type?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{deleteType?.name}" and all its {deleteType?.stats.total || 0} recipients.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteType} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}


// Template Editor Component
function TemplateEditor({
  certType, localPosition, localFieldPositions, isDragging, isDraggingText, draggingFieldId, showPreview, selectedFieldId, containerRef,
  onDragOver, onDragLeave, onDrop, onFileInput, onMouseDown, onFieldMouseDown,
  onRemoveTemplate, onTogglePreview, onPositionChange, onFontChange, onAddCustomField, onRemoveCustomField, onSelectField,
  onRemoveNameField, onRestoreNameField, onSearchFieldsChange,
}: {
  certType: CertificateType
  localPosition: { x: number; y: number }
  localFieldPositions: Record<string, { x: number; y: number }>
  isDragging: boolean
  isDraggingText: boolean
  draggingFieldId: string | null
  showPreview: boolean
  selectedFieldId: string
  containerRef: React.RefObject<HTMLDivElement | null>
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onMouseDown: (e: React.MouseEvent) => void
  onFieldMouseDown: (e: React.MouseEvent, fieldId: string) => void
  onRemoveTemplate: () => void
  onTogglePreview: () => void
  onPositionChange: (axis: "x" | "y", value: number) => void
  onFontChange: (updates: { fontSize?: number; fontFamily?: string; fontBold?: boolean; fontItalic?: boolean; textCase?: string }) => void
  onSelectField: (id: string) => void
  onAddCustomField: (variable: string) => void
  onRemoveCustomField: (fieldId: string) => void
  onRemoveNameField: () => void
  onRestoreNameField: () => void
  onSearchFieldsChange: (searchFields: { name: boolean; email: boolean; mobile: boolean; regNo: boolean }) => void
}) {
  if (!certType.template) {
    return (
      <div className="flex flex-col items-center justify-center p-12 border-2 border-dashed border-[#E5E5E5] rounded-xl bg-[#FAFAFA] min-h-[400px]">
        <div className="h-16 w-16 rounded-2xl bg-white border border-[#E5E5E5] flex items-center justify-center mb-6 shadow-sm">
          <Upload className="h-8 w-8 text-[#999]" />
        </div>
        <h3 className="text-lg font-semibold text-[#171717] mb-2">Upload Certificate Template</h3>
        <p className="text-[#666] mb-8 max-w-[400px] text-center text-sm">Upload a high-quality background image (JPG, PNG) for your certificate. Avoid including text placeholders in the image itself.</p>

        <Button
          onClick={() => document.getElementById("template-input")?.click()}
          className="h-10 px-6 font-medium bg-black text-white hover:bg-[#333] shadow-sm active:scale-95 transition-all"
        >
          Choose Image
        </Button>
        <input id="template-input" type="file" accept="image/*" className="hidden" onChange={onFileInput} />
        <p className="text-xs text-[#999] mt-6">Recommended size: 1920 x 1080px</p>
      </div>
    )
  }



  // existing effects...

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-130px)] min-h-[600px]">
      {/* Left: Canvas Area */}
      <div className="flex-1 bg-[#F5F5F7] rounded-xl border border-[#E5E5E5] relative overflow-hidden flex flex-col">
        {/* Canvas Toolbar */}
        <div className="h-12 border-b border-[#E5E5E5] bg-white flex items-center justify-between px-4 z-10 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#444] uppercase tracking-wider">Editor Canvas</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-[#666]" onClick={onTogglePreview}>
              <Eye className="h-3.5 w-3.5 mr-1.5" />
              {showPreview ? "Edit Mode" : "Preview"}
            </Button>
            <div className="w-px h-4 bg-[#E5E5E5] mx-1"></div>
            <Button variant="ghost" size="sm" className="h-8 text-xs font-medium text-red-600 hover:bg-red-50 hover:text-red-700" onClick={onRemoveTemplate}>
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Clear
            </Button>
          </div>
        </div>

        {/* Canvas Scroller */}
        <div className="flex-1 overflow-auto bg-[url('/grid-pattern.svg')] relative">
          <div className="absolute inset-0 flex items-center justify-center p-8 min-h-full min-w-full">
            <div
              ref={containerRef}
              className="relative inline-flex flex-col items-center justify-center rounded shadow-sm border border-[#E5E5E5] select-none bg-white transition-opacity duration-300 hover:shadow-md"
              style={{
                cursor: isDraggingText ? "grabbing" : "default",
              }}
            >
              <img
                id="certificate-template-image"
                src={certType.template}
                alt="Template"
                className="block max-w-[90vw] lg:max-w-[calc(100vw-400px)] shadow-md"
                draggable={false}
                style={{
                  maxHeight: 'calc(100vh - 180px)',
                  width: 'auto',
                  height: 'auto',
                  objectFit: 'contain'
                }}
              />

              {/* NAME Field */}
              {certType.showNameField !== false && (
                <div
                  className={cn(
                    "absolute transition-none",
                    selectedFieldId === "NAME" && !showPreview ? "z-50" : "z-20"
                  )}
                  style={{ left: `${localPosition.x}%`, top: `${localPosition.y}%`, transform: "translate(-50%, -50%)" }}
                  onClick={(e) => {
                    e.stopPropagation()
                    onSelectField("NAME")
                  }}
                >
                  {!showPreview ? (
                    <div className="relative group">
                      <div className={cn(
                        "absolute -inset-2 border border-dashed rounded-lg transition-opacity",
                        selectedFieldId === "NAME" ? "border-blue-600 opacity-100 ring-2 ring-blue-400/20" : "border-blue-400 opacity-0 group-hover:opacity-100"
                      )}></div>
                      {/* Drag Handle */}
                      <div
                        className={cn(
                          "absolute -top-6 left-1/2 -translate-x-1/2 bg-blue-600 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10",
                          isDraggingText && "opacity-100 cursor-grabbing"
                        )}
                        onMouseDown={onMouseDown}
                      >
                        <Move className="h-2.5 w-2.5" /> Drag
                      </div>

                      <div className="border border-blue-600 bg-blue-100 rounded px-2 py-0.5 flex items-center justify-center relative min-w-[60px] min-h-[20px] shadow-sm">
                        <span
                          className="whitespace-nowrap leading-none select-none text-blue-800 font-bold"
                          style={{
                            fontSize: `${certType.fontSize || 24}px`,
                            fontFamily: certType.fontFamily || 'Arial',
                            fontWeight: certType.fontBold ? 'bold' : 'normal',
                            fontStyle: certType.fontItalic ? 'italic' : 'normal',
                            textTransform: certType.textCase === 'uppercase' ? 'uppercase' : certType.textCase === 'lowercase' ? 'lowercase' : certType.textCase === 'capitalize' ? 'capitalize' : 'none'
                          }}
                        >
                          {"{{NAME}}"}
                        </span>
                      </div>

                      {/* Remove Button */}
                      <button
                        className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white border border-[#E5E5E5] shadow-sm flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100 z-20"
                        onClick={(e) => { e.stopPropagation(); onRemoveNameField() }}
                        title="Remove Name Field"
                      >
                        <X className="h-2.5 w-2.5 text-[#666] hover:text-red-600" />
                      </button>
                    </div>
                  ) : (
                    <span
                      className="text-black whitespace-nowrap leading-none select-none"
                      style={{
                        fontSize: `${certType.fontSize || 24}px`,
                        fontFamily: certType.fontFamily || 'Arial',
                        fontWeight: certType.fontBold ? 'bold' : 'normal',
                        fontStyle: certType.fontItalic ? 'italic' : 'normal',
                        textTransform: certType.textCase === 'uppercase' ? 'uppercase' : certType.textCase === 'lowercase' ? 'lowercase' : certType.textCase === 'capitalize' ? 'capitalize' : 'none',
                        textShadow: '0px 0px 1px rgba(0,0,0,0.1)'
                      }}
                    >John Doe</span>
                  )}
                </div>
              )}

              {/* Custom Fields - Same Logic */}
              {certType.customFields?.map((field) => {
                const pos = localFieldPositions[field.id] || field.position
                return (
                  <div
                    key={field.id}
                    className={cn(
                      "absolute transition-none",
                      selectedFieldId === field.id && !showPreview ? "z-50" : "z-20"
                    )}
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                    onClick={(e) => {
                      e.stopPropagation()
                      onSelectField(field.id)
                    }}
                  >
                    {!showPreview ? (
                      <div className="relative group">
                        <div className={cn(
                          "absolute -inset-2 border border-dashed rounded-lg transition-opacity",
                          selectedFieldId === field.id ? "border-amber-600 opacity-100 ring-2 ring-amber-400/20" : "border-amber-600 opacity-0 group-hover:opacity-100"
                        )}></div>

                        <div
                          className="absolute -top-6 left-1/2 -translate-x-1/2 bg-amber-600 text-white text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 cursor-grab active:cursor-grabbing opacity-0 group-hover:opacity-100 transition-opacity z-10"
                          onMouseDown={(e) => onFieldMouseDown(e, field.id)}
                        >
                          <Move className="h-2.5 w-2.5" /> Drag
                        </div>

                        <div className="border border-amber-600 bg-amber-100 rounded px-2 py-0.5 flex items-center justify-center relative min-w-[60px] min-h-[20px] shadow-sm">
                          <span
                            className="whitespace-nowrap leading-none select-none text-amber-800 font-bold"
                            style={{
                              fontSize: `${field.fontSize || 24}px`,
                              fontFamily: field.fontFamily || 'Arial',
                              fontWeight: field.fontBold ? 'bold' : 'normal',
                              fontStyle: field.fontItalic ? 'italic' : 'normal'
                            }}
                          >
                            {`{{${field.variable}}}`}
                          </span>
                        </div>

                        <button
                          className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-white border border-[#E5E5E5] shadow-sm flex items-center justify-center hover:bg-red-50 hover:border-red-200 transition-colors opacity-0 group-hover:opacity-100 z-20"
                          onClick={(e) => { e.stopPropagation(); onRemoveCustomField(field.id) }}
                        >
                          <X className="h-2.5 w-2.5 text-[#666] hover:text-red-600" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-black whitespace-nowrap leading-none select-none"
                        style={{
                          fontSize: `${field.fontSize || 24}px`,
                          fontFamily: field.fontFamily || 'Arial',
                          fontWeight: field.fontBold ? 'bold' : 'normal',
                          fontStyle: field.fontItalic ? 'italic' : 'normal'
                        }}
                      >
                        {field.variable === 'EMAIL' ? 'john@example.com' :
                          field.variable === 'MOBILE' ? '+91 98765 43210' :
                            field.variable === 'REG_NO' ? 'REG-2024-001' : field.variable}
                      </span>
                    )}
                  </div>
                )
              })}

            </div>
          </div>
        </div>
      </div>

      {/* Right Sidebar: Properties Panel */}
      <div className="w-full lg:w-[320px] bg-white border-l border-[#E5E5E5] flex flex-col shrink-0 h-full">
        <Tabs defaultValue="design" className="w-full h-full flex flex-col">
          <div className="p-3 border-b border-[#F0F0F0]">
            <TabsList className="w-full bg-[#F5F5F7]">
              <TabsTrigger value="design" className="flex-1 text-xs">Design</TabsTrigger>
              <TabsTrigger value="variables" className="flex-1 text-xs">Fields</TabsTrigger>
              <TabsTrigger value="settings" className="flex-1 text-xs">Settings</TabsTrigger>
            </TabsList>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* DESIGN TAB */}
            <TabsContent value="design" className="p-4 space-y-6 m-0 h-full">
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666]">Typography</h3>
                  {selectedFieldId && (
                    <span className="text-[10px] font-medium px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-100 truncate max-w-[120px]">
                      {selectedFieldId === "NAME" ? "Name Field" : certType.customFields?.find(f => f.id === selectedFieldId)?.variable || "Custom"}
                    </span>
                  )}
                </div>

                {/* Helper getter and UI for current field values */}
                {(() => {
                  const selectedField = selectedFieldId === "NAME"
                    ? certType
                    : certType.customFields?.find(f => f.id === selectedFieldId) || certType

                  return (
                    <div className="space-y-5">
                      {/* Font Family */}
                      <div>
                        <Label className="text-[11px] font-medium text-[#444] mb-2 block">Font Family</Label>
                        <select
                          value={selectedField.fontFamily || "Helvetica"}
                          onChange={(e) => {
                            onFontChange({ fontFamily: e.target.value })
                          }}
                          className="w-full h-9 px-3 rounded-md border border-[#E5E5E5] bg-white text-xs text-[#333] focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none cursor-pointer transition-all hover:border-[#CCC]"
                        >
                          {PDF_FONTS.map(f => (
                            <option key={f.value} value={f.value}>
                              {f.name} ({f.category})
                            </option>
                          ))}
                        </select>
                        <p className="text-[10px] text-[#888] mt-1.5">
                          Only PDF-compatible fonts
                        </p>
                      </div>

                      {/* Font Size & Weight Row */}
                      <div className="grid grid-cols-1 gap-4">
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <Label className="text-[11px] font-medium text-[#444]">Size</Label>
                            <span className="text-[10px] font-mono text-[#666] bg-[#F5F5F7] px-1.5 py-0.5 rounded">{selectedField.fontSize || 24}px</span>
                          </div>
                          <Slider
                            value={[selectedField.fontSize || 24]}
                            onValueChange={([v]) => onFontChange({ fontSize: v })}
                            min={12}
                            max={200}
                            step={1}
                            className="py-1"
                          />
                        </div>
                      </div>

                      {/* Style & Casing Grid */}
                      <div className="grid grid-cols-2 gap-3">
                        {/* Font Style */}
                        <div>
                          <Label className="text-[11px] font-medium text-[#444] mb-2 block">Style</Label>
                          <div className="flex bg-[#F5F5F7] p-1 rounded-md h-9 items-center">
                            <button
                              onClick={() => onFontChange({ fontBold: !selectedField.fontBold })}
                              className={cn(
                                "flex-1 h-full rounded text-[#666] hover:text-[#333] flex items-center justify-center transition-all",
                                selectedField.fontBold && "bg-white text-black shadow-sm"
                              )}
                              title="Bold"
                            >
                              <Bold className="h-3.5 w-3.5" />
                            </button>
                            <div className="w-px h-3 bg-[#E5E5E5] mx-1"></div>
                            <button
                              onClick={() => onFontChange({ fontItalic: !selectedField.fontItalic })}
                              className={cn(
                                "flex-1 h-full rounded text-[#666] hover:text-[#333] flex items-center justify-center transition-all",
                                selectedField.fontItalic && "bg-white text-black shadow-sm"
                              )}
                              title="Italic"
                            >
                              <Italic className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Text Casing */}
                        {selectedFieldId === "NAME" && (
                          <div>
                            <Label className="text-[11px] font-medium text-[#444] mb-2 block">Casing</Label>
                            <div className="flex bg-[#F5F5F7] p-1 rounded-md h-9 items-center">
                              {[
                                { value: 'none', label: 'Aa', title: 'As Entered' },
                                { value: 'uppercase', label: 'AA', title: 'UPPERCASE' },
                                { value: 'capitalize', label: 'Aa', title: 'Capitalize' }
                              ].map((option) => (
                                <button
                                  key={option.value}
                                  onClick={() => {
                                    console.log('Casing button clicked:', option.value)
                                    onFontChange({ textCase: option.value })
                                  }}
                                  className={cn(
                                    "flex-1 h-full rounded text-[10px] font-medium text-[#666] hover:text-[#333] flex items-center justify-center transition-all",
                                    ((certType.textCase || 'none') === option.value) && "bg-white text-black shadow-sm"
                                  )}
                                  title={option.title}
                                >
                                  {option.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })()}
              </div>

              <div className="h-px bg-[#F0F0F0] w-full"></div>
            </TabsContent>

            {/* VARIABLES TAB */}
            <TabsContent value="variables" className="p-4 m-0 h-full">
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/50 rounded-lg border border-blue-100 mb-6">
                  <h4 className="text-xs font-semibold text-blue-900 mb-1">Dynamic Fields</h4>
                  <p className="text-[11px] text-blue-700/80 leading-relaxed">
                    Click to add variables. Drag them on the canvas to position where they will appear on the final certificate.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-medium text-[#444] mb-2 block">Available Variables</Label>

                  {certType.showNameField === false && (
                    <button onClick={onRestoreNameField} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#E5E5E5] bg-white hover:border-black/30 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#EBEBEB]">
                          <span className="text-xs font-bold text-[#444]">N</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-[#222]">Recipient Name</span>
                          <span className="block text-[10px] text-[#888] font-mono mt-0.5">{`{{NAME}}`}</span>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-[#CCC] group-hover:text-black" />
                    </button>
                  )}

                  {AVAILABLE_VARIABLES.filter(v => v.key !== 'NAME' && !certType.customFields?.find(f => f.variable === v.key)).map((v) => (
                    <button key={v.key} onClick={() => onAddCustomField(v.key)} className="w-full flex items-center justify-between p-3 rounded-lg border border-[#E5E5E5] bg-white hover:border-black/30 hover:shadow-sm transition-all group text-left">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-[#F5F5F7] flex items-center justify-center group-hover:bg-[#EBEBEB]">
                          <span className="text-xs font-bold text-[#444]">{v.key.charAt(0)}</span>
                        </div>
                        <div>
                          <span className="block text-xs font-semibold text-[#222]">{v.label}</span>
                          <span className="block text-[10px] text-[#888] font-mono mt-0.5">{`{{${v.key}}}`}</span>
                        </div>
                      </div>
                      <Plus className="h-4 w-4 text-[#CCC] group-hover:text-black" />
                    </button>
                  ))}

                  {certType.showNameField !== false && AVAILABLE_VARIABLES.filter(v => v.key !== 'NAME').every(v => certType.customFields?.find(f => f.variable === v.key)) && (
                    <div className="text-center py-8 text-[#999] text-xs">
                      All available variables have been added.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>

            {/* SETTINGS TAB */}
            <TabsContent value="settings" className="p-4 m-0 h-full">
              <div className="space-y-6">
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[#666]">Search Configuration</h3>
                  <p className="text-[11px] text-[#666] leading-relaxed">
                    Control which fields attendees can use to find their certificates on the public download page.
                  </p>

                  <div className="space-y-2 mt-4">
                    {['name', 'email', 'mobile', 'regNo'].map((key) => (
                      <div key={key} className="flex items-center justify-between p-2 rounded hover:bg-[#F5F5F7]">
                        <Label htmlFor={`search-${key}`} className="text-xs cursor-pointer capitalize">{key === 'regNo' ? 'Registration No' : key}</Label>
                        <Checkbox
                          id={`search-${key}`}
                          checked={certType.searchFields?.[key as keyof typeof certType.searchFields] ?? (key === 'name')}
                          onCheckedChange={(checked) => onSearchFieldsChange({
                            ...certType.searchFields || { name: true, email: false, mobile: false, regNo: false },
                            [key]: checked
                          })}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="h-px bg-[#F0F0F0] w-full"></div>

                <div className="p-3 rounded-lg bg-orange-50 border border-orange-100 text-orange-800">
                  <h4 className="text-xs font-semibold mb-1 flex items-center gap-1"><Lock className="h-3 w-3" /> Pro Tip</h4>
                  <p className="text-[10px] opacity-80">
                    Ensure your text fields contrast well with your background image. You can test this by clicking "Preview" in the toolbar.
                  </p>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>
      </div>

    </div>
  )
}



// Links Tab Component
// Links Tab Component
function LinksTab({ certType, eventId }: { certType: CertificateType; eventId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10
  const { getCertTypePublicLink, getDownloadLink } = require("@/lib/events")

  // Lucide icons need to be imported or we check if they are available in scope.
  // Assuming Chevrons are available or using text fallback if not, but better to use existing icons from scope if possible.
  // We have ArrowLeft, maybe we can use that for 'Prev' or just ensure imports.
  // Actually, we can add ChevronLeft, ChevronRight to the main imports at the top, but for now let's reuse what we have or add simple buttons.
  // Let's rely on adding ChevronLeft, ChevronRight to imports first to be safe, or used available ones.
  // ArrowLeft is available. Let's stick to ArrowLeft/ArrowRight or just text for simplicity if imports are tricky in this block.
  // Wait, I can just use text "<" and ">" or "Prev" "Next" nicely styled.

  // Reset page when search changes
  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const handleCopyPublicLink = () => {
    const link = `${window.location.origin}${getCertTypePublicLink(eventId, certType.id)}`
    navigator.clipboard.writeText(link)
    toast.success("Public link copied!")
  }

  const handleCopyIndividualLink = (certId: string) => {
    const link = `${window.location.origin}${getDownloadLink(eventId, certId)}`
    navigator.clipboard.writeText(link)
    toast.success("Link copied!")
  }

  const handleCopyAllLinks = () => {
    const links = certType.recipients.map((r) => `${r.name}: ${window.location.origin}${getDownloadLink(eventId, r.certificateId)}`).join("\n")
    navigator.clipboard.writeText(links)
    toast.success("All links copied!")
  }

  const filteredRecipients = certType.recipients.filter(r =>
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || r.certificateId?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const totalPages = Math.ceil(filteredRecipients.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const currentRecipients = filteredRecipients.slice(startIndex, startIndex + itemsPerPage)

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-6">
      <div className="bg-white rounded-xl border border-[#E5E5E5] p-6 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Public Download Link</h3>
            <p className="text-xs text-[#666] mt-1">Share this with all attendees. They can verify using their registered details.</p>
          </div>
          <Button onClick={handleCopyPublicLink} className="h-8 text-xs bg-black text-white hover:bg-[#333]">
            <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Public Link
          </Button>
        </div>
        <div className="flex items-center gap-2 bg-[#F9F9FA] p-3 rounded-lg border border-[#F0F0F0]">
          <div className="h-8 w-8 rounded bg-white border border-[#E5E5E5] flex items-center justify-center shrink-0">
            <LinkIcon className="h-4 w-4 text-[#888]" />
          </div>
          <code className="text-xs text-[#444] font-mono break-all line-clamp-1 flex-1">
            {`${typeof window !== 'undefined' ? window.location.origin : ''}${getCertTypePublicLink(eventId, certType.id)}`}
          </code>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E5E5] shadow-sm flex flex-col overflow-hidden">
        <div className="p-4 border-b border-[#F0F0F0] flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#FAFAFA]">
          <div>
            <h3 className="text-sm font-semibold text-[#171717]">Individual Links</h3>
            <p className="text-xs text-[#666] mt-1">Direct access links for specific recipients.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[#999]" />
              <input
                placeholder="Search recipient..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-64 pl-8 pr-3 rounded-md border border-[#E5E5E5] text-xs focus:ring-1 focus:ring-black outline-none transition-all"
              />
            </div>
            <Button variant="outline" onClick={handleCopyAllLinks} className="h-8 text-xs border-[#E5E5E5] bg-white hover:bg-[#F5F5F7]">
              <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy All
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          {filteredRecipients.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="h-12 w-12 rounded-full bg-[#F5F5F7] flex items-center justify-center mb-3">
                <Search className="h-5 w-5 text-[#999]" />
              </div>
              <p className="text-sm font-medium text-[#222]">No recipients found</p>
              <p className="text-xs text-[#888] mt-1">Try adjusting your search query</p>
            </div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white border-b border-[#F0F0F0]">
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#666] uppercase tracking-wider w-[30%]">Recipient Name</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#666] uppercase tracking-wider w-[20%]">Reg No</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#666] uppercase tracking-wider w-[15%]">Status</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#666] uppercase tracking-wider text-right w-[15%]">Downloads</th>
                  <th className="py-3 px-4 text-[11px] font-semibold text-[#666] uppercase tracking-wider text-right w-[20%]">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F5F5F5]">
                {currentRecipients.map((r) => (
                  <tr key={r.id} className="group hover:bg-[#F9F9FA] transition-colors">
                    <td className="py-3 px-4">
                      <span className="text-sm font-medium text-[#171717]">{r.name}</span>
                      <div className="text-[11px] text-[#888]">{r.email || r.mobile || "No contact info"}</div>
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-flex items-center px-2 py-1 rounded bg-[#F5F5F7] border border-[#E5E5E5] text-[11px] font-mono text-[#555]">
                        {r.certificateId}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      {r.status === "downloaded" ? (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-neutral-50 text-neutral-700 border border-neutral-100 text-[11px] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-neutral-500"></span> Downloaded
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-100 text-[11px] font-medium">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-500"></span> Pending
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <span className="text-sm text-[#444]">{r.downloadCount}</span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs hover:bg-white hover:border-[#E5E5E5] hover:shadow-sm border border-transparent"
                        onClick={() => handleCopyIndividualLink(r.certificateId)}
                      >
                        <Copy className="h-3 w-3 mr-1.5" /> Copy Link
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Footer */}
        {filteredRecipients.length > 0 && (
          <div className="p-3 border-t border-[#F0F0F0] flex items-center justify-between bg-white">
            <div className="text-xs text-[#666]">
              Showing <span className="font-medium text-[#222]">{startIndex + 1}</span> to <span className="font-medium text-[#222]">{Math.min(startIndex + itemsPerPage, filteredRecipients.length)}</span> of <span className="font-medium text-[#222]">{filteredRecipients.length}</span> recipients
            </div>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div className="text-xs font-medium px-2">
                Page {currentPage} of {totalPages || 1}
              </div>
              <Button // Reusing ArrowLeft rotated for Next if ArrowRight isn't imported, but assuming standard imports. 
                // Actually, let's use a standard chevron text if icons fail or rotation.
                // Ideally I should import ArrowRight but for safety in this replace execution:
                variant="outline"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                <ArrowLeft className="h-4 w-4 rotate-180" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}


