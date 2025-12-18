"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { getClientSession } from "@/lib/auth"
import { 
  getEvent, updateCertificateType,
  type CertificateEvent, type CertificateType 
} from "@/lib/events"
import { 
  ArrowLeft, Upload, Trash2, Move, AlignLeft, AlignCenter, AlignRight, Eye, Check
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function CertificateTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [event, setEvent] = useState<CertificateEvent | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)

  // Template state
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingText, setIsDraggingText] = useState(false)
  const [showPreview, setShowPreview] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const refreshData = useCallback(() => {
    const session = getClientSession()
    if (session) {
      const eventData = getEvent(session.eventId)
      setEvent(eventData)
      setEventId(session.eventId)
      if (eventData) {
        const type = eventData.certificateTypes.find(t => t.id === typeId)
        setCertType(type || null)
      }
    }
  }, [typeId])

  useEffect(() => { refreshData() }, [refreshData])

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
  }, [])

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files
    if (files && files.length > 0) handleFile(files[0])
  }

  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file")
      return
    }

    // Compress image before storing
    const img = document.createElement("img")
    img.onload = () => {
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

      const compressedData = canvas.toDataURL("image/jpeg", 0.7)
      if (eventId) {
        updateCertificateType(eventId, typeId, { template: compressedData })
        refreshData()
        toast.success("Template uploaded!")
      }
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      img.src = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }

  const removeTemplate = () => {
    if (eventId) {
      updateCertificateType(eventId, typeId, { template: undefined })
      refreshData()
      toast.info("Template removed")
    }
  }

  // Position handlers
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault()
    setIsDraggingText(true)
  }

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingText || !containerRef.current || !certType || !eventId) return

      const rect = containerRef.current.getBoundingClientRect()
      const x = ((e.clientX - rect.left) / rect.width) * 100
      const y = ((e.clientY - rect.top) / rect.height) * 100

      updateCertificateType(eventId, typeId, {
        textPosition: {
          x: Math.max(5, Math.min(95, x)),
          y: Math.max(5, Math.min(95, y)),
        },
      })
      refreshData()
    },
    [isDraggingText, certType, eventId, typeId, refreshData]
  )

  const handleMouseUp = useCallback(() => {
    setIsDraggingText(false)
  }, [])

  useEffect(() => {
    if (isDraggingText) {
      window.addEventListener("mousemove", handleMouseMove)
      window.addEventListener("mouseup", handleMouseUp)
      return () => {
        window.removeEventListener("mousemove", handleMouseMove)
        window.removeEventListener("mouseup", handleMouseUp)
      }
    }
  }, [isDraggingText, handleMouseMove, handleMouseUp])

  const handleAlignmentChange = (alignment: "left" | "center" | "right") => {
    if (eventId) {
      updateCertificateType(eventId, typeId, { alignment })
      refreshData()
    }
  }

  if (!event || !certType) {
    return <div className="p-6"><p className="text-muted-foreground">Loading...</p></div>
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.push("/client/dashboard")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-foreground">{certType.name}</h1>
          <p className="text-muted-foreground">{event.name}</p>
        </div>
        <Badge variant={certType.template ? "default" : "outline"} className={certType.template ? "bg-emerald-500" : ""}>
          {certType.template ? "Template Ready" : "No Template"}
        </Badge>
      </div>

      {/* Upload Section */}
      {!certType.template ? (
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
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => document.getElementById("template-input")?.click()}
            >
              <input
                id="template-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileInput}
              />
              <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium">Drop your certificate template here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
              <p className="text-xs text-muted-foreground mt-4">Supported: JPG, PNG, WebP</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Template Preview & Editor */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Position Editor</CardTitle>
                    <CardDescription>Drag the name placeholder to position it</CardDescription>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setShowPreview(!showPreview)}>
                      <Eye className="h-4 w-4 mr-2" />
                      {showPreview ? "Edit" : "Preview"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={removeTemplate}>
                      <Trash2 className="h-4 w-4 mr-2" />
                      Remove
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div
                  ref={containerRef}
                  className="relative rounded-lg overflow-hidden border select-none"
                  style={{ cursor: isDraggingText ? "grabbing" : "default" }}
                >
                  <img src={certType.template} alt="Template" className="w-full h-auto" draggable={false} />
                  <div
                    className="absolute"
                    style={{
                      left: `${certType.textPosition.x}%`,
                      top: `${certType.textPosition.y}%`,
                      transform: "translate(-50%, -50%)",
                    }}
                  >
                    {!showPreview ? (
                      <div
                        className={cn(
                          "border-2 border-dashed rounded-lg px-3 py-1.5 flex items-center gap-2 cursor-grab",
                          isDraggingText ? "border-primary bg-primary/10" : "border-primary/50 bg-primary/5"
                        )}
                        onMouseDown={handleMouseDown}
                      >
                        <Move className="h-4 w-4 text-primary" />
                        <span 
                          className="font-semibold text-primary"
                          style={{ fontSize: "clamp(12px, 2.5vw, 20px)" }}
                        >
                          {"{{NAME}}"}
                        </span>
                      </div>
                    ) : (
                      <span 
                        className="font-semibold text-black whitespace-nowrap"
                        style={{ fontSize: "clamp(12px, 2.5vw, 20px)" }}
                      >
                        John Anderson
                      </span>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Settings Panel */}
          <div className="space-y-4">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Position</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs">Horizontal: {Math.round(certType.textPosition.x)}%</Label>
                  <Slider
                    value={[certType.textPosition.x]}
                    onValueChange={([v]) => {
                      if (eventId) {
                        updateCertificateType(eventId, typeId, { textPosition: { ...certType.textPosition, x: v } })
                        refreshData()
                      }
                    }}
                    min={0} max={100} className="mt-2"
                  />
                </div>
                <div>
                  <Label className="text-xs">Vertical: {Math.round(certType.textPosition.y)}%</Label>
                  <Slider
                    value={[certType.textPosition.y]}
                    onValueChange={([v]) => {
                      if (eventId) {
                        updateCertificateType(eventId, typeId, { textPosition: { ...certType.textPosition, y: v } })
                        refreshData()
                      }
                    }}
                    min={0} max={100} className="mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Text Alignment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-2">
                  {(["left", "center", "right"] as const).map((align) => (
                    <Button
                      key={align}
                      variant={certType.alignment === align ? "default" : "outline"}
                      size="sm"
                      className="flex-1"
                      onClick={() => handleAlignmentChange(align)}
                    >
                      {align === "left" && <AlignLeft className="h-4 w-4" />}
                      {align === "center" && <AlignCenter className="h-4 w-4" />}
                      {align === "right" && <AlignRight className="h-4 w-4" />}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <Badge className="bg-emerald-500">
                  <Check className="h-3 w-3 mr-1" />
                  Template Ready
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">
                  Now add recipients from the sidebar menu.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      )}
    </div>
  )
}
