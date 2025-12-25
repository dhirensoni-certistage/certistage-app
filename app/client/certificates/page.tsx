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
import { getClientSession, getCurrentPlanFeatures, getTrialStatus, PLAN_FEATURES } from "@/lib/auth"
import { LockedFeature } from "@/components/client/upgrade-overlay"
import {
  getCertTypePublicLink,
  type CertificateEvent, type CertificateType, type TextField, type SignatureField
} from "@/lib/events"

// Google Fonts list
const GOOGLE_FONTS = [
  { name: "Roboto", value: "Roboto" },
  { name: "Open Sans", value: "Open Sans" },
  { name: "Lato", value: "Lato" },
  { name: "Montserrat", value: "Montserrat" },
  { name: "Poppins", value: "Poppins" },
  { name: "Playfair Display", value: "Playfair Display" },
  { name: "Merriweather", value: "Merriweather" },
  { name: "Dancing Script", value: "Dancing Script" },
  { name: "Great Vibes", value: "Great Vibes" },
  { name: "Pacifico", value: "Pacifico" },
]

const SYSTEM_FONTS = [
  { name: "Arial", value: "Arial" },
  { name: "Times New Roman", value: "Times New Roman" },
  { name: "Georgia", value: "Georgia" },
  { name: "Verdana", value: "Verdana" },
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
  Bold, Italic, Link as LinkIcon, Copy, Users, Download, Settings, PenTool, X, Crown, Award, Lock
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
  const [draggingSignatureId, setDraggingSignatureId] = useState<string | null>(null)
  const [resizingSignatureId, setResizingSignatureId] = useState<string | null>(null)
  const [resizeStartX, setResizeStartX] = useState<number>(0)
  const [resizeStartWidth, setResizeStartWidth] = useState<number>(0)
  const [showPreview, setShowPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Debounce timer ref for API calls
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const pendingUpdatesRef = useRef<Record<string, unknown>>({})

  // Update local certificate type state immediately (for smooth UI)
  const updateLocalCertType = useCallback((updates: Partial<CertificateType>) => {
    if (!event || !selectedTypeId) return

    setEvent(prev => {
      if (!prev) return prev
      return {
        ...prev,
        certificateTypes: prev.certificateTypes.map(ct =>
          ct.id === selectedTypeId ? { ...ct, ...updates } : ct
        )
      }
    })
  }, [event, selectedTypeId])

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
              showNameField: ct.showNameField !== false,
              customFields: ct.customFields || [],
              signatures: ct.signatures || [],
              recipients: ct.recipients || [],
              stats: ct.stats,
              createdAt: ct.createdAt || new Date().toISOString()
            })),
            stats: apiEvent.stats
          }
          setEvent(convertedEvent)
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
    if (isDraggingText || draggingFieldId || draggingSignatureId || resizingSignatureId) {
      return
    }

    // Also don't poll when in template editor tab with a selected type
    if (selectedTypeId && activeTab === "template") {
      return
    }

    const interval = setInterval(refreshEvent, 5000) // Increased to 5 seconds
    return () => clearInterval(interval)
  }, [refreshEvent, isDraggingText, draggingFieldId, draggingSignatureId, resizingSignatureId, selectedTypeId, activeTab])

  // Load Google Font when selected type changes
  useEffect(() => {
    const type = event?.certificateTypes.find(t => t.id === selectedTypeId)
    if (type?.fontFamily && GOOGLE_FONTS.find(f => f.value === type.fontFamily)) {
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${type.fontFamily.replace(/ /g, '+')}&display=swap`
      link.rel = 'stylesheet'
      document.head.appendChild(link)
    }
  }, [selectedTypeId, event])

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
  const [localSignaturePositions, setLocalSignaturePositions] = useState<Record<string, { x: number; y: number }>>({})
  const lastSaveRef = useRef<number>(0)

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
      // Sync signature positions
      const sigPositions: Record<string, { x: number; y: number }> = {}
      selectedType.signatures?.forEach(s => {
        sigPositions[s.id] = s.position
      })
      setLocalSignaturePositions(sigPositions)
    }
  }, [selectedType?.id])

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingText(true)
  }

  const handleFieldMouseDown = (e: React.MouseEvent, fieldId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingFieldId(fieldId)
  }

  const handleSignatureMouseDown = (e: React.MouseEvent, sigId: string) => {
    e.preventDefault()
    e.stopPropagation()
    setDraggingSignatureId(sigId)
  }

  const handleSignatureResizeStart = (e: React.MouseEvent, sigId: string, currentWidth: number) => {
    e.preventDefault()
    e.stopPropagation()
    setResizingSignatureId(sigId)
    setResizeStartX(e.clientX)
    setResizeStartWidth(currentWidth)
  }

  // Track signature width locally during resize
  const [localSignatureWidths, setLocalSignatureWidths] = useState<Record<string, number>>({})

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!containerRef.current || !eventId || !selectedTypeId) return
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(5, Math.min(95, ((e.clientX - rect.left) / rect.width) * 100))
    const y = Math.max(5, Math.min(95, ((e.clientY - rect.top) / rect.height) * 100))

    if (isDraggingText) {
      // Only update local state during drag - API call on mouseUp
      setLocalPosition({ x, y })
    } else if (draggingFieldId) {
      // Only update local state during drag - API call on mouseUp
      setLocalFieldPositions(prev => ({ ...prev, [draggingFieldId]: { x, y } }))
    } else if (draggingSignatureId) {
      // Only update local state during drag - API call on mouseUp
      setLocalSignaturePositions(prev => ({ ...prev, [draggingSignatureId]: { x, y } }))
    } else if (resizingSignatureId) {
      // Calculate new width based on horizontal drag distance
      const deltaX = e.clientX - resizeStartX
      const deltaPercent = (deltaX / rect.width) * 100 * 2
      const newWidth = Math.max(3, Math.min(80, resizeStartWidth + deltaPercent))
      // Only update local state during resize - API call on mouseUp
      setLocalSignatureWidths(prev => ({ ...prev, [resizingSignatureId]: newWidth }))
    }
  }, [isDraggingText, draggingFieldId, draggingSignatureId, resizingSignatureId, resizeStartX, resizeStartWidth, eventId, selectedTypeId])

  const handleMouseUp = useCallback(() => {
    // Save text position on drag end
    if (isDraggingText && eventId && selectedTypeId) {
      updateCertTypeAPI(selectedTypeId, { textPosition: localPosition })
    }
    // Save custom field position on drag end
    if (draggingFieldId && eventId && selectedTypeId && selectedType) {
      const pos = localFieldPositions[draggingFieldId]
      if (pos) {
        const fields = selectedType.customFields || []
        const updatedFields = fields.map(f =>
          f.id === draggingFieldId ? { ...f, position: pos } : f
        )
        updateCertTypeAPI(selectedTypeId, { customFields: updatedFields })
      }
    }
    // Save signature position on drag end
    if (draggingSignatureId && eventId && selectedTypeId && selectedType) {
      const pos = localSignaturePositions[draggingSignatureId]
      if (pos) {
        const sigs = selectedType.signatures || []
        const updatedSigs = sigs.map(s =>
          s.id === draggingSignatureId ? { ...s, position: pos } : s
        )
        updateCertTypeAPI(selectedTypeId, { signatures: updatedSigs })
      }
    }
    // Save signature width on resize end
    if (resizingSignatureId && eventId && selectedTypeId && selectedType) {
      const newWidth = localSignatureWidths[resizingSignatureId]
      if (newWidth !== undefined) {
        const sigs = selectedType.signatures || []
        const updatedSigs = sigs.map(s =>
          s.id === resizingSignatureId ? { ...s, width: newWidth } : s
        )
        updateCertTypeAPI(selectedTypeId, { signatures: updatedSigs })
      }
    }
    setIsDraggingText(false)
    setDraggingFieldId(null)
    setDraggingSignatureId(null)
    setResizingSignatureId(null)
    // Delay refresh to avoid immediate re-render during interaction
    setTimeout(() => refreshEvent(), 500)
  }, [eventId, selectedTypeId, localPosition, localFieldPositions, localSignaturePositions, localSignatureWidths, refreshEvent, isDraggingText, draggingFieldId, draggingSignatureId, resizingSignatureId, selectedType])

  useEffect(() => {
    if (isDraggingText || draggingFieldId || draggingSignatureId || resizingSignatureId) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDraggingText, draggingFieldId, draggingSignatureId, resizingSignatureId, handleMouseMove, handleMouseUp])

  if (isLoading) {
    return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>
  }

  if (!event) {
    return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>
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
              localSignaturePositions={localSignaturePositions}
              localSignatureWidths={localSignatureWidths}
              isDragging={isDragging}
              isDraggingText={isDraggingText}
              draggingFieldId={draggingFieldId}
              draggingSignatureId={draggingSignatureId}
              resizingSignatureId={resizingSignatureId}
              showPreview={showPreview}
              containerRef={containerRef}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onFileInput={handleFileInput}
              onMouseDown={handleMouseDown}
              onFieldMouseDown={handleFieldMouseDown}
              onSignatureMouseDown={handleSignatureMouseDown}
              onSignatureResizeStart={handleSignatureResizeStart}
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
                // Update local state immediately for instant feedback
                updateLocalCertType(updates as Partial<CertificateType>)
                // Sync to API in background
                if (selectedTypeId) syncToAPI(selectedTypeId, updates)
              }}
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
              onAddSignature={(file) => {
                if (!eventId || !selectedTypeId) return

                // Check if digital signature is allowed in plan
                const planFeatures = getCurrentPlanFeatures()
                if (!planFeatures.canDigitalSignature) {
                  toast.error("Digital signature not available in Free plan", {
                    description: "Upgrade to Professional or higher to add signatures"
                  })
                  return
                }

                const reader = new FileReader()
                reader.onload = (e) => {
                  const img = document.createElement("img")
                  img.onload = async () => {
                    // Compress signature image
                    const canvas = document.createElement("canvas")
                    const maxWidth = 300
                    let width = img.width
                    let height = img.height
                    if (width > maxWidth) {
                      height = (height * maxWidth) / width
                      width = maxWidth
                    }
                    canvas.width = width
                    canvas.height = height
                    const ctx = canvas.getContext("2d")
                    ctx?.drawImage(img, 0, 0, width, height)
                    const compressedData = canvas.toDataURL("image/png", 0.8)

                    const newSig: SignatureField = {
                      id: `sig_${Date.now()}`,
                      image: compressedData,
                      position: { x: 80, y: 80 },
                      width: 15,
                    }
                    const currentSigs = selectedType.signatures || []
                    const updatedSigs = [...currentSigs, newSig]
                    // Optimistic UI update - instant feedback
                    updateLocalCertType({ signatures: updatedSigs })
                    setLocalSignaturePositions(prev => ({ ...prev, [newSig.id]: newSig.position }))
                    // Immediate API call for add/remove operations
                    const success = await updateCertTypeAPI(selectedTypeId, { signatures: updatedSigs })
                    if (success) {
                      toast.success("Signature added! Drag it to position.")
                    } else {
                      toast.error("Failed to add signature")
                      refreshEvent()
                    }
                  }
                  img.src = e.target?.result as string
                }
                reader.readAsDataURL(file)
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
              onRemoveSignature={async (id) => {
                if (eventId && selectedTypeId) {
                  const currentSigs = selectedType.signatures || []
                  const updatedSigs = currentSigs.filter(s => s.id !== id)
                  // Optimistic UI update - instant feedback
                  updateLocalCertType({ signatures: updatedSigs })
                  // Immediate API call for add/remove operations
                  const success = await updateCertTypeAPI(selectedTypeId, { signatures: updatedSigs })
                  if (success) {
                    toast.success("Signature removed")
                  } else {
                    toast.error("Failed to remove signature")
                    refreshEvent()
                  }
                }
              }}
              onSignatureWidthChange={(id, width) => {
                if (eventId && selectedTypeId) {
                  const currentSigs = selectedType.signatures || []
                  const updatedSigs = currentSigs.map(s => s.id === id ? { ...s, width } : s)
                  // Optimistic UI update
                  updateLocalCertType({ signatures: updatedSigs })
                  setLocalSignatureWidths(prev => ({ ...prev, [id]: width }))
                  // Sync to API in background (debounced)
                  syncToAPI(selectedTypeId, { signatures: updatedSigs })
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
          <h1 className="text-2xl font-bold text-foreground">Manage Certificates</h1>
          <p className="text-muted-foreground">Create and manage certificate types for {event.name}</p>
        </div>
        <Button
          onClick={() => setShowAddDialog(true)}
          disabled={maxCertificateTypes !== -1 && event.certificateTypes.length >= maxCertificateTypes}
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
                  You've created {maxCertificateTypes} certificate type{maxCertificateTypes > 1 ? 's' : ''} — the maximum for your {getCurrentPlanFeatures().displayName} plan.
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
      <Card>
        <CardHeader>
          <CardTitle>Certificate Templates</CardTitle>
          <CardDescription>Click on a certificate to edit its template and settings</CardDescription>
        </CardHeader>
        <CardContent>
          {event.certificateTypes.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed rounded-lg">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No Certificate Types Yet</h3>
              <p className="text-muted-foreground mb-4 max-w-md mx-auto">
                Create your first certificate type to start adding templates and recipients
              </p>
              <Button onClick={() => setShowAddDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Certificate Type
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {event.certificateTypes.map((certType) => (
                <Card
                  key={certType.id}
                  className="hover:border-primary/50 transition-colors cursor-pointer group"
                  onClick={() => setSelectedTypeId(certType.id)}
                >
                  <CardContent className="p-4">
                    {/* Template Preview */}
                    <div className="h-24 rounded-lg bg-muted mb-3 overflow-hidden flex items-center justify-center relative">
                      {certType.template ? (
                        <img src={certType.template} alt={certType.name} className="w-full h-full object-cover" />
                      ) : (
                        <Image className="h-8 w-8 text-muted-foreground" />
                      )}
                      {/* Hover overlay */}
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <Settings className="h-6 w-6 text-white" />
                      </div>
                    </div>

                    {/* Info */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-foreground truncate">{certType.name}</h3>
                        {certType.template ? (
                          <Badge variant="default" className="bg-emerald-500 text-xs">Ready</Badge>
                        ) : (
                          <Badge variant="outline" className="text-xs">No Template</Badge>
                        )}
                      </div>

                      {/* Stats */}
                      <div className="flex items-center gap-3 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Users className="h-3.5 w-3.5" />
                          {certType.stats.total}
                        </span>
                        <span className="flex items-center gap-1">
                          <Download className="h-3.5 w-3.5" />
                          {certType.stats.downloaded}
                        </span>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="flex-1" onClick={(e) => { e.stopPropagation(); setSelectedTypeId(certType.id) }}>
                          <Settings className="h-3.5 w-3.5 mr-1" />
                          Manage
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            if (!certType.template) {
                              toast.error("Upload template first")
                              return
                            }
                            const link = `${window.location.origin}${getCertTypePublicLink(eventId!, certType.id)}`
                            navigator.clipboard.writeText(link)
                            toast.success("Download link copied!")
                          }}
                          title="Copy download link"
                        >
                          <LinkIcon className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); setDeleteType(certType) }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}

              {/* Add New Card - only show if not at limit */}
              {(maxCertificateTypes === -1 || event.certificateTypes.length < maxCertificateTypes) && (
                <button
                  onClick={() => setShowAddDialog(true)}
                  className="border-2 border-dashed rounded-lg p-6 flex flex-col items-center justify-center gap-2 text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors min-h-[200px]"
                >
                  <Plus className="h-8 w-8" />
                  <span className="font-medium">Add New Type</span>
                </button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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
  certType, localPosition, localFieldPositions, localSignaturePositions, localSignatureWidths, isDragging, isDraggingText, draggingFieldId, draggingSignatureId, resizingSignatureId, showPreview, containerRef,
  onDragOver, onDragLeave, onDrop, onFileInput, onMouseDown, onFieldMouseDown, onSignatureMouseDown, onSignatureResizeStart,
  onRemoveTemplate, onTogglePreview, onPositionChange, onFontChange, onAddCustomField, onRemoveCustomField,
  onAddSignature, onRemoveSignature, onSignatureWidthChange, onRemoveNameField, onRestoreNameField,
}: {
  certType: CertificateType
  localPosition: { x: number; y: number }
  localFieldPositions: Record<string, { x: number; y: number }>
  localSignaturePositions: Record<string, { x: number; y: number }>
  localSignatureWidths: Record<string, number>
  isDragging: boolean
  isDraggingText: boolean
  draggingFieldId: string | null
  draggingSignatureId: string | null
  resizingSignatureId: string | null
  showPreview: boolean
  containerRef: React.RefObject<HTMLDivElement | null>
  onDragOver: (e: React.DragEvent) => void
  onDragLeave: (e: React.DragEvent) => void
  onDrop: (e: React.DragEvent) => void
  onFileInput: (e: React.ChangeEvent<HTMLInputElement>) => void
  onMouseDown: (e: React.MouseEvent) => void
  onFieldMouseDown: (e: React.MouseEvent, fieldId: string) => void
  onSignatureMouseDown: (e: React.MouseEvent, sigId: string) => void
  onSignatureResizeStart: (e: React.MouseEvent, sigId: string, currentWidth: number) => void
  onRemoveTemplate: () => void
  onTogglePreview: () => void
  onPositionChange: (axis: "x" | "y", value: number) => void
  onFontChange: (updates: { fontSize?: number; fontFamily?: string; fontBold?: boolean; fontItalic?: boolean }) => void
  onAddCustomField: (variable: string) => void
  onRemoveCustomField: (fieldId: string) => void
  onAddSignature: (file: File) => void
  onRemoveSignature: (id: string) => void
  onSignatureWidthChange: (id: string, width: number) => void
  onRemoveNameField: () => void
  onRestoreNameField: () => void
}) {
  if (!certType.template) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Upload Template</CardTitle>
          <CardDescription>Upload your certificate background image</CardDescription>
        </CardHeader>
        <CardContent>
          <div
            className={cn(
              "border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-colors",
              isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50"
            )}
            onDragOver={onDragOver}
            onDragLeave={onDragLeave}
            onDrop={onDrop}
            onClick={() => document.getElementById("template-input")?.click()}
          >
            <input id="template-input" type="file" accept="image/*" className="hidden" onChange={onFileInput} />
            <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <p className="font-medium">Drop your certificate template here</p>
            <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            <p className="text-xs text-muted-foreground mt-4">Supported: JPG, PNG, WebP</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Position Editor</CardTitle>
                <CardDescription>Drag the name placeholder to position it</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onTogglePreview}>
                  <Eye className="h-4 w-4 mr-2" />
                  {showPreview ? "Edit" : "Preview"}
                </Button>
                <Button variant="outline" size="sm" onClick={onRemoveTemplate}>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Remove
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              ref={containerRef}
              className="relative rounded-lg overflow-hidden border select-none [container-type:inline-size]"
              style={{ cursor: isDraggingText ? "grabbing" : "default" }}
            >
              <img src={certType.template} alt="Template" className="w-full h-auto" draggable={false} />
              {/* NAME Field - only show if showNameField is not false */}
              {certType.showNameField !== false && (
                <div
                  className="absolute transition-none"
                  style={{ left: `${localPosition.x}%`, top: `${localPosition.y}%`, transform: "translate(-50%, -50%)" }}
                >
                  {!showPreview ? (
                    <div className="relative">
                      {/* Animated hint arrow */}
                      {!isDraggingText && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 flex flex-col items-center animate-bounce">
                          <span className="text-xs text-primary font-medium bg-primary/10 px-2 py-0.5 rounded whitespace-nowrap">Drag me!</span>
                          <svg className="h-4 w-4 text-primary" fill="currentColor" viewBox="0 0 20 20">
                            <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                          </svg>
                        </div>
                      )}
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-grab transition-all",
                          isDraggingText ? "border-primary bg-primary/10 scale-105" : "border-primary/50 bg-primary/5 hover:border-primary hover:bg-primary/10"
                        )}
                        onMouseDown={onMouseDown}
                      >
                        <Move className="h-4 w-4 text-primary" />
                        <span
                          className="text-primary whitespace-nowrap"
                          style={{
                            fontSize: `max(10px, ${(certType.fontSize || 24) * 0.0625}cqi)`,
                            fontFamily: certType.fontFamily || 'Arial',
                            fontWeight: certType.fontBold ? 'bold' : 'normal',
                            fontStyle: certType.fontItalic ? 'italic' : 'normal'
                          }}
                        >{"{{NAME}}"}</span>
                        <button
                          className="ml-1 h-4 w-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); onRemoveNameField() }}
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <span
                      className="text-black whitespace-nowrap"
                      style={{
                        fontSize: `max(10px, ${(certType.fontSize || 24) * 0.0625}cqi)`,
                        fontFamily: certType.fontFamily || 'Arial',
                        fontWeight: certType.fontBold ? 'bold' : 'normal',
                        fontStyle: certType.fontItalic ? 'italic' : 'normal'
                      }}
                    >John Anderson</span>
                  )}
                </div>
              )}

              {/* Custom Fields */}
              {certType.customFields?.map((field) => {
                const pos = localFieldPositions[field.id] || field.position
                return (
                  <div
                    key={field.id}
                    className="absolute transition-none"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {!showPreview ? (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg px-2 py-1 flex items-center gap-1 cursor-grab transition-all",
                          draggingFieldId === field.id
                            ? "border-amber-500 bg-amber-500/20 scale-105"
                            : "border-amber-500/50 bg-amber-500/5 hover:border-amber-500 hover:bg-amber-500/10"
                        )}
                        onMouseDown={(e) => onFieldMouseDown(e, field.id)}
                      >
                        <Move className="h-3 w-3 text-amber-600" />
                        <span
                          className="text-amber-600 whitespace-nowrap text-xs"
                          style={{
                            fontFamily: field.fontFamily || 'Arial',
                            fontWeight: field.fontBold ? 'bold' : 'normal',
                            fontStyle: field.fontItalic ? 'italic' : 'normal'
                          }}
                        >{`{{${field.variable}}}`}</span>
                        <button
                          className="ml-1 h-4 w-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); onRemoveCustomField(field.id) }}
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <span
                        className="text-black whitespace-nowrap"
                        style={{
                          fontSize: `max(8px, ${(field.fontSize || 24) * 0.0625}cqi)`,
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

              {/* Signatures */}
              {certType.signatures?.map((sig) => {
                const pos = localSignaturePositions[sig.id] || sig.position
                return (
                  <div
                    key={sig.id}
                    className="absolute transition-none"
                    style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)" }}
                  >
                    {!showPreview ? (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg p-1 cursor-grab transition-all relative group",
                          draggingSignatureId === sig.id || resizingSignatureId === sig.id
                            ? "border-purple-500 bg-purple-500/20 scale-105"
                            : "border-purple-500/50 bg-purple-500/5 hover:border-purple-500 hover:bg-purple-500/10"
                        )}
                        onMouseDown={(e) => onSignatureMouseDown(e, sig.id)}
                      >
                        <div className="flex items-center gap-1">
                          <Move className="h-3 w-3 text-purple-600" />
                          <img
                            src={sig.image}
                            alt="Signature"
                            className="object-contain opacity-70"
                            style={{ width: `${(localSignatureWidths[sig.id] ?? sig.width) * 2}px`, maxWidth: '200px' }}
                            draggable={false}
                          />
                        </div>
                        {/* Resize handle - right edge */}
                        <div
                          className="absolute -right-1 top-1/2 -translate-y-1/2 w-2 h-6 bg-purple-500 rounded cursor-ew-resize opacity-0 group-hover:opacity-100 transition-opacity"
                          onMouseDown={(e) => onSignatureResizeStart(e, sig.id, localSignatureWidths[sig.id] ?? sig.width)}
                          title="Drag to resize"
                        />
                        <button
                          className="absolute -top-2 -right-2 h-4 w-4 rounded-full bg-red-500/80 hover:bg-red-500 flex items-center justify-center"
                          onClick={(e) => { e.stopPropagation(); onRemoveSignature(sig.id) }}
                        >
                          <X className="h-2.5 w-2.5 text-white" />
                        </button>
                      </div>
                    ) : (
                      <img
                        src={sig.image}
                        alt="Signature"
                        className="h-auto object-contain"
                        style={{ width: `${localSignatureWidths[sig.id] ?? sig.width}%`, maxWidth: '150px' }}
                        draggable={false}
                      />
                    )}
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        {/* Add Variable Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Add Variable</CardTitle>
            <CardDescription className="text-xs">Click to add a field to certificate</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {/* Show NAME button if it's hidden */}
              {certType.showNameField === false && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-xs"
                  onClick={() => onRestoreNameField()}
                >
                  <Plus className="h-3 w-3 mr-1" />
                  {`{{NAME}}`}
                </Button>
              )}
              {AVAILABLE_VARIABLES
                .filter(v => v.key !== 'NAME') // NAME is handled separately
                .filter(v => !certType.customFields?.find(f => f.variable === v.key)) // Hide already added
                .map((v) => (
                  <Button
                    key={v.key}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                    onClick={() => onAddCustomField(v.key)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    {`{{${v.key}}}`}
                  </Button>
                ))}
              {certType.showNameField !== false &&
                AVAILABLE_VARIABLES.filter(v => v.key !== 'NAME').every(v => certType.customFields?.find(f => f.variable === v.key)) && (
                  <p className="text-xs text-muted-foreground">All variables added</p>
                )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Text Settings</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-xs mb-2 block">Font Family</Label>
              <select
                value={certType.fontFamily || "Arial"}
                onChange={(e) => {
                  onFontChange({ fontFamily: e.target.value })
                  // Load Google Font if selected
                  if (GOOGLE_FONTS.find(f => f.value === e.target.value)) {
                    const link = document.createElement('link')
                    link.href = `https://fonts.googleapis.com/css2?family=${e.target.value.replace(/ /g, '+')}&display=swap`
                    link.rel = 'stylesheet'
                    document.head.appendChild(link)
                  }
                }}
                className="w-full h-9 px-3 rounded-md border border-input bg-background text-sm"
              >
                <optgroup label="System Fonts">
                  {SYSTEM_FONTS.map(f => (
                    <option key={f.value} value={f.value}>{f.name}</option>
                  ))}
                </optgroup>
                <optgroup label="Google Fonts">
                  {GOOGLE_FONTS.map(f => (
                    <option key={f.value} value={f.value}>{f.name}</option>
                  ))}
                </optgroup>
              </select>
            </div>
            <div>
              <Label className="text-xs">Size: {certType.fontSize}px</Label>
              <Slider value={[certType.fontSize]} onValueChange={([v]) => onFontChange({ fontSize: v })} min={12} max={72} step={1} className="mt-2" />
            </div>
            <div className="flex gap-2">
              <Button
                variant={certType.fontBold ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onFontChange({ fontBold: !certType.fontBold })}
              >
                <Bold className="h-4 w-4 mr-1" />
                Bold
              </Button>
              <Button
                variant={certType.fontItalic ? "default" : "outline"}
                size="sm"
                className="flex-1"
                onClick={() => onFontChange({ fontItalic: !certType.fontItalic })}
              >
                <Italic className="h-4 w-4 mr-1" />
                Italic
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Digital Signature Card */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Digital Signature
              {!getCurrentPlanFeatures().canDigitalSignature && (
                <Badge variant="outline" className="text-xs ml-auto">Pro</Badge>
              )}
            </CardTitle>
            <CardDescription className="text-xs">Upload signature</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-lg p-4 text-center transition-colors",
                getCurrentPlanFeatures().canDigitalSignature
                  ? "cursor-pointer hover:border-primary/50"
                  : "opacity-50 cursor-not-allowed"
              )}
              onClick={() => {
                if (getCurrentPlanFeatures().canDigitalSignature) {
                  document.getElementById("signature-input")?.click()
                }
              }}
            >
              <input
                id="signature-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) onAddSignature(file)
                  e.target.value = ''
                }}
              />
              <Upload className="h-6 w-6 text-muted-foreground mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">
                {getCurrentPlanFeatures().canDigitalSignature
                  ? "Click to upload signature"
                  : "Upgrade to add signatures"}
              </p>
            </div>

            {/* Existing Signatures */}
            {certType.signatures && certType.signatures.length > 0 && (
              <div className="space-y-3">
                <Label className="text-xs">Added Signatures</Label>
                {certType.signatures.map((sig, idx) => (
                  <div key={sig.id} className="p-2 bg-muted rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <img src={sig.image} alt={`Signature ${idx + 1}`} className="h-8 w-auto object-contain" />
                      <span className="text-xs text-muted-foreground flex-1">Signature {idx + 1}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6"
                        onClick={() => onRemoveSignature(sig.id)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs whitespace-nowrap">Size: {Math.round(localSignatureWidths[sig.id] ?? sig.width)}%</Label>
                      <Slider
                        value={[localSignatureWidths[sig.id] ?? sig.width]}
                        onValueChange={([v]) => onSignatureWidthChange(sig.id, v)}
                        min={3}
                        max={80}
                        step={1}
                        className="flex-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}


// Links Tab Component
function LinksTab({ certType, eventId }: { certType: CertificateType; eventId: string }) {
  const [searchQuery, setSearchQuery] = useState("")
  const { getCertTypePublicLink, getDownloadLink } = require("@/lib/events")

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

  return (
    <div className="space-y-4">
      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="text-base">Public Download Link</CardTitle>
          <CardDescription>Share this link. Recipients verify with email/mobile.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input readOnly value={`${typeof window !== 'undefined' ? window.location.origin : ''}${getCertTypePublicLink(eventId, certType.id)}`} className="font-mono text-sm bg-background" />
            <Button onClick={handleCopyPublicLink}><Copy className="h-4 w-4 mr-2" />Copy</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Individual Links</CardTitle>
              <CardDescription>Direct download links for each recipient</CardDescription>
            </div>
            <div className="flex gap-2">
              <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="w-48" />
              <Button variant="outline" onClick={handleCopyAllLinks}><Copy className="h-4 w-4 mr-2" />Copy All</Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {certType.recipients.length === 0 ? (
            <div className="text-center py-12">
              <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">Add recipients first to generate links</p>
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden max-h-[400px] overflow-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-muted">
                  <tr>
                    <th className="text-left p-3 font-medium">Name</th>
                    <th className="text-left p-3 font-medium">Reg No</th>
                    <th className="text-left p-3 font-medium">Status</th>
                    <th className="text-right p-3 font-medium">Downloads</th>
                    <th className="p-3 w-20">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRecipients.map((r) => (
                    <tr key={r.id} className="border-t">
                      <td className="p-3 font-medium">{r.name}</td>
                      <td className="p-3"><code className="text-xs bg-muted px-2 py-1 rounded">{r.certificateId}</code></td>
                      <td className="p-3">
                        <Badge variant={r.status === "downloaded" ? "default" : "outline"} className={r.status === "downloaded" ? "bg-emerald-500" : ""}>{r.status}</Badge>
                      </td>
                      <td className="p-3 text-right">{r.downloadCount}</td>
                      <td className="p-3">
                        <Button variant="ghost" size="sm" onClick={() => handleCopyIndividualLink(r.certificateId)}><Copy className="h-4 w-4" /></Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
