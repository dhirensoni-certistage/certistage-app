"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Download, Check, AlertCircle, Loader2, Search, ArrowLeft, FileText, User, Mail, Phone, Hash } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface SearchFields {
  name: boolean
  email: boolean
  mobile: boolean
  regNo: boolean
}

interface Recipient {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
  regNo?: string
  downloadCount: number
}

interface CertificateType {
  id: string
  name: string
  templateImage: string
  textPosition: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  fontColor?: string
  textCase?: "none" | "uppercase" | "lowercase" | "capitalize"
  searchFields: SearchFields
  customFields?: Array<{
    variable: string
    position: { x: number; y: number }
    fontSize: number
    fontFamily: string
    fontBold: boolean
    fontItalic: boolean
    fontColor?: string
  }>
  signatures?: Array<{
    image: string
    position?: { x: number; y: number }
    x?: number
    y?: number
    width: number
  }>
}

interface EventData {
  id: string
  name: string
}

type Step = "search" | "select" | "preview"

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("search")
  const [searchField, setSearchField] = useState<string>("name")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [matchedRecipients, setMatchedRecipients] = useState<Recipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Transform text based on textCase setting
  const transformText = (text: string, textCase?: string): string => {
    if (!textCase || textCase === "none") return text
    
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

  // Load certificate type data
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/download?eventId=${eventId}&typeId=${typeId}`)
        if (!res.ok) {
          const data = await res.json()
          console.error("[ERROR] [Type Download] API Error:", data.error)
          setError(data.error || "Failed to load certificate")
          setLoading(false)
          return
        }

        const data = await res.json()
        
        setEvent(data.event)
        setCertType(data.certificateType)

        // Set default search field based on enabled fields
        const sf = data.certificateType?.searchFields || { name: true, email: false, mobile: false, regNo: false }
        if (sf.name) setSearchField("name")
        else if (sf.email) setSearchField("email")
        else if (sf.mobile) setSearchField("mobile")
        else if (sf.regNo) setSearchField("regNo")
      } catch (err) {
        console.error("[ERROR] [Type Download] Fetch error:", err)
        setError("Failed to load certificate data")
      } finally {
        setLoading(false)
      }
    }

    if (eventId && typeId) {
      loadData()
    }
  }, [eventId, typeId])

  const getSearchFieldLabel = (field: string) => {
    switch (field) {
      case "name": return "Name"
      case "email": return "Email"
      case "mobile": return "Mobile Number"
      case "regNo": return "Registration No"
      default: return field
    }
  }

  const getSearchFieldIcon = (field: string) => {
    switch (field) {
      case "name": return <User className="h-4 w-4" />
      case "email": return <Mail className="h-4 w-4" />
      case "mobile": return <Phone className="h-4 w-4" />
      case "regNo": return <Hash className="h-4 w-4" />
      default: return <Search className="h-4 w-4" />
    }
  }

  const getSearchFieldPlaceholder = (field: string) => {
    switch (field) {
      case "name": return "Enter your full name"
      case "email": return "Enter your email address"
      case "mobile": return "Enter your mobile number"
      case "regNo": return "Enter your registration number"
      default: return "Enter search value"
    }
  }

  const getEnabledSearchFields = () => {
    if (!certType?.searchFields) return []
    const fields: string[] = []
    if (certType.searchFields.name) fields.push("name")
    if (certType.searchFields.email) fields.push("email")
    if (certType.searchFields.mobile) fields.push("mobile")
    if (certType.searchFields.regNo) fields.push("regNo")
    return fields
  }

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      toast.error(`Please enter your ${getSearchFieldLabel(searchField).toLowerCase()}`)
      return
    }

    setIsSearching(true)

    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          typeId,
          searchQuery: searchValue.trim(),
          searchType: searchField
        })
      })

      const data = await res.json()

      if (!data.found || data.recipients.length === 0) {
        toast.error("No certificate found. Please check your details and try again.")
        setIsSearching(false)
        return
      }

      setMatchedRecipients(data.recipients.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email || "",
        mobile: r.mobile || "",
        certificateId: r.regNo || r.id,
        regNo: r.regNo,
        downloadCount: r.downloadCount || 0
      })))

      if (data.recipients.length === 1) {
        const recipient = {
          id: data.recipients[0].id,
          name: data.recipients[0].name,
          email: data.recipients[0].email || "",
          mobile: data.recipients[0].mobile || "",
          certificateId: data.recipients[0].regNo || data.recipients[0].id,
          regNo: data.recipients[0].regNo,
          downloadCount: data.recipients[0].downloadCount || 0
        }
        setSelectedRecipient(recipient)
        setStep("preview")
      } else {
        setStep("select")
      }
    } catch (err) {
      console.error("[ERROR] [Search Error]:", err)
      toast.error("Search failed. Please try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setStep("preview")
  }

  const handleBack = () => {
    if (step === "preview" && matchedRecipients.length > 1) {
      setStep("select")
    } else {
      setStep("search")
      setSelectedRecipient(null)
      setMatchedRecipients([])
    }
    setDownloaded(false)
  }

  const handleDownload = async () => {
    if (!selectedRecipient) return

    setIsDownloading(true)

    try {
      // Check if mobile/WebView
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      const pdfUrl = `/api/download/pdf?recipientId=${selectedRecipient.id}`

      if (isMobile) {
        window.open(pdfUrl, "_blank")
        setTimeout(() => {
          setDownloaded(true)
          setIsDownloading(false)
          toast.success("Opening certificate...")
        }, 1500)
        return
      }

      // Desktop: fetch and download
      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${certType?.name}-${selectedRecipient.certificateId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

      // Track download
      await fetch("/api/download", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedRecipient.id })
      })

      setDownloaded(true)
      toast.success("Certificate downloaded!")
    } catch (err) {
      toast.error("Download failed. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-4">
          <Card className="max-w-md w-full">
            <CardContent className="py-12 text-center">
              <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Error</h2>
              <p className="text-muted-foreground">{error}</p>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    )
  }

  const enabledFields = getEnabledSearchFields()

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />

      <main className="flex-1 flex items-center justify-center p-4 overflow-x-hidden">
        <div className="max-w-xl w-full space-y-6 overflow-x-hidden">
          <div className="text-center">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-neutral-900 mb-2">{event?.name}</h1>
            <span className="inline-flex items-center rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-medium text-gold-deep">
              {certType?.name} certificate
            </span>
          </div>

          {/* Step 1: Search */}
          {step === "search" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-gold-deep" />
                  Find your certificate
                </CardTitle>
                <CardDescription>
                  {enabledFields.length === 1 
                    ? `Enter the ${getSearchFieldLabel(enabledFields[0]).toLowerCase()} you registered with`
                    : "Use the details you registered with"
                  }
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Field Selector (if multiple fields enabled) */}
                {enabledFields.length > 1 && (
                  <div className="space-y-2">
                    <Label>Search By</Label>
                    <Select value={searchField} onValueChange={setSearchField}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {enabledFields.map((field) => (
                          <SelectItem key={field} value={field}>
                            <div className="flex items-center gap-2">
                              {getSearchFieldIcon(field)}
                              {getSearchFieldLabel(field)}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Search Input */}
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    {getSearchFieldIcon(searchField)}
                    {getSearchFieldLabel(searchField)}
                  </Label>
                  <Input
                    type={searchField === "email" ? "email" : "text"}
                    placeholder={getSearchFieldPlaceholder(searchField)}
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                <Button type="button" className="w-full" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" />Find my certificate</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select (if multiple matches) */}
          {step === "select" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>Which one is you?</CardTitle>
                    <CardDescription>
                      {matchedRecipients.length} matches. Contact details are partly hidden for privacy.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {matchedRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      onClick={() => handleSelectRecipient(recipient)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-colors",
                        "hover:bg-accent hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{recipient.name}</p>
                          {recipient.email && (
                            <p className="text-sm text-muted-foreground">{recipient.email}</p>
                          )}
                        </div>
                        {recipient.certificateId && (
                          <Badge variant="outline" className="font-mono">{recipient.certificateId}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Download */}
          {step === "preview" && selectedRecipient && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              {!certType ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertCircle className="h-16 w-16 text-destructive mx-auto mb-4" />
                    <h2 className="text-xl font-semibold mb-2">Error</h2>
                    <p className="text-muted-foreground">Certificate type data not loaded</p>
                  </CardContent>
                </Card>
              ) : (
              <Card>
                <CardHeader className="text-center pb-2">
                  <Badge className="w-fit mx-auto mb-2 bg-gold text-neutral-900 hover:bg-gold">{certType.name}</Badge>
                  <CardTitle>Your certificate is ready</CardTitle>
                  <CardDescription>
                    Issued to <span className="font-medium text-foreground">{selectedRecipient.name}</span>. The download is a print-quality PDF.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {!certType.templateImage ? (
                    <div className="text-center p-8 border rounded-lg bg-muted/50">
                      <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <p className="text-sm text-muted-foreground">Certificate template not available</p>
                      <p className="text-xs text-muted-foreground mt-2">Template URL is missing from database</p>
                    </div>
                  ) : (
                    <div className="w-full flex justify-center">
                      <div
                        className="relative inline-block max-w-full rounded-lg overflow-hidden border select-none bg-white"
                      >
                      <img
                        src={certType.templateImage}
                        alt="Certificate"
                        className="block w-auto max-w-full h-auto pointer-events-none"
                        draggable={false}
                        style={{ maxHeight: "70vh" }}
                        onLoad={() => console.log("[OK] [Type Download] Certificate image loaded")}
                        onError={() => {
                          console.error("[ERROR] [Type Download] Failed to load image:", certType.templateImage)
                          toast.error("Failed to load certificate image")
                        }}
                      />
                    {/* Name Field */}
                    <div
                      className="absolute pointer-events-none"
                      style={{
                        left: `${certType.textPosition.x}%`,
                        top: `${certType.textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span
                        className="whitespace-nowrap leading-none select-none"
                        style={{
                          fontSize: `clamp(8px, ${(certType.fontSize || 24) * 0.04}cqw, ${(certType.fontSize || 24) * 0.7}px)`,
                          fontFamily: `"${certType.fontFamily || 'Arial'}", sans-serif`,
                          fontWeight: certType.fontBold ? 'bold' : 'normal',
                          fontStyle: certType.fontItalic ? 'italic' : 'normal',
                          color: certType.fontColor || "#000"
                        }}
                      >
                        {transformText(selectedRecipient.name, certType.textCase)}
                      </span>
                    </div>

                    {/* Custom Fields */}
                    {certType.customFields?.map((field: any, i: number) => {
                      let value = ""
                      switch (field.variable) {
                        case "EMAIL": value = selectedRecipient.email || ""; break
                        case "MOBILE": value = selectedRecipient.mobile || ""; break
                        case "REG_NO": value = selectedRecipient.certificateId || ""; break
                        default: value = ""
                      }
                      if (!value) return null

                      return (
                        <div
                          key={i}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${field.position.x}%`,
                            top: `${field.position.y}%`,
                            transform: "translate(-50%, -50%)",
                          }}
                        >
                          <span
                            className="whitespace-nowrap leading-none select-none"
                            style={{
                              fontSize: `clamp(6px, ${(field.fontSize || 24) * 0.04}cqw, ${(field.fontSize || 24) * 0.7}px)`,
                              fontFamily: `"${field.fontFamily || 'Arial'}", sans-serif`,
                              fontWeight: field.fontBold ? 'bold' : 'normal',
                              fontStyle: field.fontItalic ? 'italic' : 'normal',
                              color: field.fontColor || "#000"
                            }}
                          >
                            {value}
                          </span>
                        </div>
                      )
                    })}

                    {/* Signatures */}
                    {certType.signatures?.map((sig: any, i: number) => {
                      const sigPos = sig.position || { x: sig.x ?? 50, y: sig.y ?? 50 }
                      return (
                        <div
                          key={i}
                          className="absolute pointer-events-none"
                          style={{
                            left: `${sigPos.x}%`,
                            top: `${sigPos.y}%`,
                            transform: "translate(-50%, -50%)",
                            width: `${sig.width || 20}%`
                          }}
                        >
                          <img
                            src={sig.image}
                            alt="Signature"
                            className="w-full h-auto object-contain select-none"
                            draggable={false}
                          />
                        </div>
                      )
                    })}

                    {/* Watermark */}
                    {!downloaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl md:text-6xl font-bold text-gray-200/30 rotate-[-30deg] select-none">
                          PREVIEW
                        </span>
                      </div>
                    )}
                      </div>
                    </div>
                  )}

                  <div className="mt-4 flex justify-center">
                    {downloaded ? (
                      <div className="flex flex-col items-center gap-3">
                        <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-gold-soft text-gold-deep">
                          <Check className="h-5 w-5" />
                          <span className="font-medium">Downloaded. Check your downloads folder.</span>
                        </div>
                        <button type="button" onClick={handleDownload} disabled={isDownloading} className="text-sm text-neutral-500 hover:text-neutral-900 underline underline-offset-4">
                          Download again
                        </button>
                      </div>
                    ) : (
                      <Button size="lg" onClick={handleDownload} disabled={isDownloading} className="min-w-48">
                        {isDownloading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><Download className="h-4 w-4 mr-2" />Download PDF</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
              )}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-neutral-200 bg-white/80 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-center">
        <a href="https://www.certistage.com?utm_source=download_page&utm_medium=header" target="_blank" rel="noopener" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} />
          <span className="font-semibold text-lg text-neutral-900">CertiStage</span>
        </a>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 bg-white py-5">
      <div className="container mx-auto px-4 text-center space-y-1">
        <p className="text-sm text-neutral-500">
          Powered by{" "}
          <a href="https://www.certistage.com?utm_source=download_page&utm_medium=footer" target="_blank" rel="noopener" className="font-semibold text-neutral-900 hover:text-gold-deep transition-colors">
            CertiStage
          </a>
        </p>
        <p className="text-xs text-neutral-400">Issue certificates for your own event, college or course in minutes.</p>
      </div>
    </footer>
  )
}
