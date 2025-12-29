"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { useParams, useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { getClientSession } from "@/lib/auth"
import { 
  ArrowLeft, Upload, Trash2, Move, AlignLeft, AlignCenter, AlignRight, Eye, Check, Loader2,
  Users, Link as LinkIcon, Settings, Search, Type
} from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface SearchFields {
  name: boolean
  email: boolean
  mobile: boolean
  regNo: boolean
}

type TextCase = "none" | "uppercase" | "lowercase" | "capitalize"

interface CertificateType {
  id: string
  name: string
  templateImage?: string
  textPosition: { x: number; y: number }
  fontSize?: number
  fontFamily?: string
  fontBold?: boolean
  fontItalic?: boolean
  textCase?: TextCase
  alignment?: "left" | "center" | "right"
  stats: { total: number; downloaded: number; pending: number }
  searchFields?: SearchFields
}

export default function CertificateTemplatePage() {
  const params = useParams()
  const router = useRouter()
  const typeId = params.typeId as string

  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventId, setEventId] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)

  // Template editing state
  const [textPosition, setTextPosition] = useState({ x: 50, y: 60 })
  const [fontSize, setFontSize] = useState(24)
  const [textCase, setTextCase] = useState<TextCase>("none")
  const [isDragging, setIsDragging] = useState(false)
  const [searchFields, setSearchFields] = useState<SearchFields>({
    name: true,
    email: false,
    mobile: false,
    regNo: false
  })
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const session = getClientSession()
    if (!session) {
      router.push("/client/login")
      return
    }
    setEventId(session.eventId || null)
    setUserId(session.userId || null)
  }, [router])

  // Fetch certificate type data
  useEffect(() => {
    if (!userId || !typeId) return
    
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/client/certificate-types?userId=${userId}&typeId=${typeId}`)
        if (res.ok) {
          const data = await res.json()
          setCertType(data.certificateType)
          if (data.certificateType?.textPosition) {
            setTextPosition(data.certificateType.textPosition)
          }
          if (data.certificateType?.fontSize) {
            setFontSize(data.certificateType.fontSize)
          }
          if (data.certificateType?.searchFields) {
            setSearchFields(data.certificateType.searchFields)
          }
          if (data.certificateType?.textCase) {
            setTextCase(data.certificateType.textCase)
          }
        }
      } catch (error) {
        console.error("Failed to fetch certificate type:", error)
      } finally {
        setIsLoading(false)
      }
    }
    fetchData()
  }, [userId, typeId])

  // Handle template upload
  const handleTemplateUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !userId) return

    setIsUploading(true)
    const formData = new FormData()
    formData.append("file", file)
    formData.append("userId", userId)
    formData.append("typeId", typeId)

    try {
      const res = await fetch("/api/client/upload-template", {
        method: "POST",
        body: formData
      })
      
      if (res.ok) {
        const data = await res.json()
        setCertType(prev => prev ? { ...prev, templateImage: data.url } : null)
        toast.success("Template uploaded successfully!")
      } else {
        toast.error("Failed to upload template")
      }
    } catch {
      toast.error("Upload failed")
    } finally {
      setIsUploading(false)
    }
  }

  // Save text position
  const savePosition = async () => {
    if (!userId || !typeId) return
    
    setIsSaving(true)
    try {
      const res = await fetch("/api/client/certificate-types", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          typeId,
          textPosition,
          fontSize,
          textCase,
          searchFields
        })
      })
      
      if (res.ok) {
        const data = await res.json()
        // Update local state with saved data
        if (data.certificateType) {
          setCertType(prev => prev ? { ...prev, ...data.certificateType } : null)
        }
        toast.success("Settings saved!")
      } else {
        toast.error("Failed to save")
      }
    } catch {
      toast.error("Save failed")
    } finally {
      setIsSaving(false)
    }
  }

  // Handle mouse drag for text positioning
  const handleMouseDown = () => setIsDragging(true)
  const handleMouseUp = () => setIsDragging(false)
  
  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !containerRef.current) return
    
    const rect = containerRef.current.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    
    setTextPosition({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y))
    })
  }

  // Transform text based on textCase setting
  const transformText = (text: string): string => {
    switch (textCase) {
      case "uppercase":
        return text.toUpperCase()
      case "lowercase":
        return text.toLowerCase()
      case "capitalize":
        return text.split(" ").map(word => 
          word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
        ).join(" ")
      default:
        return text
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{certType?.name || "Certificate Template"}</h1>
            <p className="text-muted-foreground">Design and manage your certificate</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href={`/client/certificates/${typeId}/recipients`}>
              <Users className="h-4 w-4 mr-2" />
              Recipients
            </Link>
          </Button>
          <Button variant="outline" asChild>
            <Link href={`/client/certificates/${typeId}/links`}>
              <LinkIcon className="h-4 w-4 mr-2" />
              Download Links
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats */}
      {certType?.stats && (
        <div className="grid grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold">{certType.stats.total}</div>
              <p className="text-sm text-muted-foreground">Total Recipients</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-green-600">{certType.stats.downloaded}</div>
              <p className="text-sm text-muted-foreground">Downloaded</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-4">
              <div className="text-2xl font-bold text-amber-600">{certType.stats.pending}</div>
              <p className="text-sm text-muted-foreground">Pending</p>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Template Preview */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Template Design</CardTitle>
              <CardDescription>Upload template and position the name text</CardDescription>
            </CardHeader>
            <CardContent>
              <div 
                ref={containerRef}
                className="relative bg-muted rounded-lg overflow-hidden aspect-[1.414/1] cursor-crosshair"
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
              >
                {certType?.templateImage ? (
                  <>
                    <img 
                      src={certType.templateImage} 
                      alt="Certificate Template"
                      className="w-full h-full object-contain"
                    />
                    {/* Draggable text position indicator */}
                    <div
                      className="absolute bg-primary/20 border-2 border-primary border-dashed rounded px-4 py-2 cursor-move select-none"
                      style={{
                        left: `${textPosition.x}%`,
                        top: `${textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: `${fontSize}px`
                      }}
                      onMouseDown={handleMouseDown}
                    >
                      <span className="text-primary font-semibold">{transformText("Recipient Name")}</span>
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                    <p className="text-muted-foreground mb-4">No template uploaded</p>
                    <Label htmlFor="template-upload" className="cursor-pointer">
                      <Button variant="outline" asChild>
                        <span>
                          {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                          Upload Template
                        </span>
                      </Button>
                    </Label>
                    <Input
                      id="template-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleTemplateUpload}
                    />
                  </div>
                )}
              </div>
              
              {certType?.templateImage && (
                <div className="mt-4 flex gap-2">
                  <Label htmlFor="template-reupload" className="cursor-pointer flex-1">
                    <Button variant="outline" className="w-full" asChild>
                      <span>
                        {isUploading ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Upload className="h-4 w-4 mr-2" />}
                        Change Template
                      </span>
                    </Button>
                  </Label>
                  <Input
                    id="template-reupload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleTemplateUpload}
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Settings Panel */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Text Settings
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Horizontal Position: {textPosition.x.toFixed(0)}%</Label>
                <Slider
                  value={[textPosition.x]}
                  onValueChange={([x]) => setTextPosition(prev => ({ ...prev, x }))}
                  max={100}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Vertical Position: {textPosition.y.toFixed(0)}%</Label>
                <Slider
                  value={[textPosition.y]}
                  onValueChange={([y]) => setTextPosition(prev => ({ ...prev, y }))}
                  max={100}
                  step={1}
                />
              </div>
              
              <div className="space-y-2">
                <Label>Font Size: {fontSize}px</Label>
                <Slider
                  value={[fontSize]}
                  onValueChange={([size]) => setFontSize(size)}
                  min={12}
                  max={72}
                  step={1}
                />
              </div>

              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Type className="h-4 w-4" />
                  Text Case
                </Label>
                <Select value={textCase} onValueChange={(value: TextCase) => setTextCase(value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select text case" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">As Entered</SelectItem>
                    <SelectItem value="uppercase">UPPERCASE</SelectItem>
                    <SelectItem value="lowercase">lowercase</SelectItem>
                    <SelectItem value="capitalize">Capitalize Each Word</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={savePosition} disabled={isSaving} className="w-full">
                {isSaving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Check className="h-4 w-4 mr-2" />}
                Save Settings
              </Button>
            </CardContent>
          </Card>

          {/* Search Fields Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                Search Fields
              </CardTitle>
              <CardDescription>
                Select which fields users can search by on download page
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="search-name"
                  checked={searchFields.name}
                  onCheckedChange={(checked) => 
                    setSearchFields(prev => ({ ...prev, name: checked as boolean }))
                  }
                />
                <Label htmlFor="search-name" className="cursor-pointer">Name</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="search-email"
                  checked={searchFields.email}
                  onCheckedChange={(checked) => 
                    setSearchFields(prev => ({ ...prev, email: checked as boolean }))
                  }
                />
                <Label htmlFor="search-email" className="cursor-pointer">Email</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="search-mobile"
                  checked={searchFields.mobile}
                  onCheckedChange={(checked) => 
                    setSearchFields(prev => ({ ...prev, mobile: checked as boolean }))
                  }
                />
                <Label htmlFor="search-mobile" className="cursor-pointer">Mobile</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="search-regNo"
                  checked={searchFields.regNo}
                  onCheckedChange={(checked) => 
                    setSearchFields(prev => ({ ...prev, regNo: checked as boolean }))
                  }
                />
                <Label htmlFor="search-regNo" className="cursor-pointer">Registration No</Label>
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                At least one field must be selected for search
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
