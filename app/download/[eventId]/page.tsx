"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Award, Download, Check, AlertCircle, Loader2, Search, ArrowLeft, FileText, User, Mail, Phone, Hash } from "lucide-react"
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

interface CertificateType {
  id: string
  name: string
  templateImage: string
  textPosition: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  searchFields: SearchFields
}

interface EventData {
  id: string
  name: string
  description?: string
}

interface Recipient {
  id: string
  name: string
  email: string
  mobile: string
  certificateId: string
  regNo?: string
  downloadCount: number
  certTypeId: string
  certTypeName: string
}

type Step = "select-type" | "search" | "select" | "preview"

export default function EventDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [certTypes, setCertTypes] = useState<CertificateType[]>([])
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("select-type")
  const [selectedType, setSelectedType] = useState<CertificateType | null>(null)
  const [searchField, setSearchField] = useState<string>("name")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [matchedRecipients, setMatchedRecipients] = useState<Recipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Disable right-click and shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("contextmenu", handleContextMenu)
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "u")) || e.key === "F12") {
        e.preventDefault()
      }
    }
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Load event and certificate types
  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/download?eventId=${eventId}`)
        if (!res.ok) {
          const data = await res.json()
          setError(data.error || "Event not found")
          setLoading(false)
          return
        }

        const data = await res.json()
        setEvent(data.event)
        
        // Fetch all certificate types with their searchFields
        const typesRes = await fetch(`/api/download/all-types?eventId=${eventId}`)
        if (typesRes.ok) {
          const typesData = await typesRes.json()
          setCertTypes(typesData.certificateTypes || [])
          
          // If only one type, auto-select it
          if (typesData.certificateTypes?.length === 1) {
            const type = typesData.certificateTypes[0]
            setSelectedType(type)
            setDefaultSearchField(type.searchFields)
            setStep("search")
          }
        }
      } catch (err) {
        setError("Failed to load event data")
      } finally {
        setLoading(false)
      }
    }

    if (eventId) {
      loadData()
    }
  }, [eventId])

  // Update searchField when selectedType changes
  useEffect(() => {
    if (selectedType?.searchFields) {
      setDefaultSearchField(selectedType.searchFields)
    }
  }, [selectedType])

  const setDefaultSearchField = (sf: SearchFields) => {
    if (sf.name) setSearchField("name")
    else if (sf.email) setSearchField("email")
    else if (sf.mobile) setSearchField("mobile")
    else if (sf.regNo) setSearchField("regNo")
  }

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
    if (!selectedType?.searchFields) return ["name", "email", "mobile"]
    const fields: string[] = []
    if (selectedType.searchFields.name) fields.push("name")
    if (selectedType.searchFields.email) fields.push("email")
    if (selectedType.searchFields.mobile) fields.push("mobile")
    if (selectedType.searchFields.regNo) fields.push("regNo")
    return fields.length > 0 ? fields : ["name", "email", "mobile"]
  }

  const getSearchDescription = () => {
    if (!selectedType?.searchFields) {
      return "Search using your registered details"
    }
    
    const enabledFields = getEnabledSearchFields()
    if (enabledFields.length === 0) {
      return "Search using your registered details"
    }
    
    if (enabledFields.length === 1) {
      const field = enabledFields[0]
      return `Enter your registered ${getSearchFieldLabel(field).toLowerCase()} to find your certificate`
    }
    
    // Multiple fields enabled
    const fieldLabels = enabledFields.map(f => getSearchFieldLabel(f).toLowerCase())
    if (fieldLabels.length === 2) {
      return `Enter your registered ${fieldLabels.join(" or ")} to find your certificate`
    }
    
    const lastField = fieldLabels.pop()
    return `Enter your registered ${fieldLabels.join(", ")} or ${lastField} to find your certificate`
  }

  const handleSelectType = (type: CertificateType) => {
    setSelectedType(type)
    setDefaultSearchField(type.searchFields)
    setStep("search")
  }

  const handleSearch = async () => {
    if (!searchValue.trim() || !selectedType) {
      const enabledFields = getEnabledSearchFields()
      if (enabledFields.length === 2) {
        toast.error(`Please enter your ${enabledFields.map(f => getSearchFieldLabel(f).toLowerCase()).join(" or ")}`)
      } else {
        toast.error(`Please enter your ${getSearchFieldLabel(searchField).toLowerCase()}`)
      }
      return
    }

    setIsSearching(true)

    try {
      const enabledFields = getEnabledSearchFields()
      let searchResults: any[] = []
      let found = false

      // If 2 fields enabled, search in both fields
      if (enabledFields.length === 2) {
        // Try searching in both fields
        const searchPromises = enabledFields.map(async (field) => {
          const res = await fetch("/api/download", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              eventId,
              typeId: selectedType.id,
              searchQuery: searchValue.trim(),
              searchType: field
            })
          })
          return res.json()
        })

        const results = await Promise.all(searchPromises)
        
        // Combine results from both searches
        const allRecipients = new Map()
        results.forEach(result => {
          if (result.found && result.recipients) {
            result.recipients.forEach((r: any) => {
              if (!allRecipients.has(r.id)) {
                allRecipients.set(r.id, r)
              }
            })
          }
        })

        searchResults = Array.from(allRecipients.values())
        found = searchResults.length > 0
      } else {
        // Single field or dropdown selected
        const res = await fetch("/api/download", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId,
            typeId: selectedType.id,
            searchQuery: searchValue.trim(),
            searchType: searchField
          })
        })

        const data = await res.json()
        found = data.found || false
        searchResults = data.recipients || []
      }

      if (!found || searchResults.length === 0) {
        const enabledFields = getEnabledSearchFields()
        if (enabledFields.length === 2) {
          toast.error(`No certificate found. Please check your ${enabledFields.map(f => getSearchFieldLabel(f).toLowerCase()).join(" or ")} and try again.`)
        } else {
          toast.error("No certificate found. Please check your details and try again.")
        }
        setIsSearching(false)
        return
      }

      setMatchedRecipients(searchResults.map((r: any) => ({
        id: r.id,
        name: r.name,
        email: r.email || "",
        mobile: r.mobile || "",
        certificateId: r.regNo || r.id,
        regNo: r.regNo,
        downloadCount: r.downloadCount || 0,
        certTypeId: selectedType.id,
        certTypeName: selectedType.name
      })))

      if (searchResults.length === 1) {
        setSelectedRecipient({
          id: searchResults[0].id,
          name: searchResults[0].name,
          email: searchResults[0].email || "",
          mobile: searchResults[0].mobile || "",
          certificateId: searchResults[0].regNo || searchResults[0].id,
          regNo: searchResults[0].regNo,
          downloadCount: searchResults[0].downloadCount || 0,
          certTypeId: selectedType.id,
          certTypeName: selectedType.name
        })
        setStep("preview")
      } else {
        setStep("select")
      }
    } catch (err) {
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
    } else if (step === "preview" || step === "select") {
      setStep("search")
      setSelectedRecipient(null)
      setMatchedRecipients([])
    } else if (step === "search" && certTypes.length > 1) {
      setStep("select-type")
      setSelectedType(null)
    }
    setDownloaded(false)
  }

  const handleDownload = async () => {
    if (!selectedRecipient || !selectedType) return

    setIsDownloading(true)

    try {
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

      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error("Download failed")

      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${selectedType.name}-${selectedRecipient.certificateId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)

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

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">{event?.name}</h1>
            <p className="text-muted-foreground">Download your certificate</p>
          </div>

          {/* Step 0: Select Certificate Type (if multiple) */}
          {step === "select-type" && certTypes.length > 1 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Select Certificate Type
                </CardTitle>
                <CardDescription>
                  Choose which certificate you want to download
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {certTypes.map((type) => (
                    <button
                      key={type.id}
                      onClick={() => handleSelectType(type)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-colors",
                        "hover:bg-accent hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Award className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-foreground">{type.name}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 1: Search */}
          {step === "search" && selectedType && (
            <Card>
              <CardHeader>
                {certTypes.length > 1 && (
                  <Button variant="ghost" size="sm" className="w-fit -ml-2 mb-2" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Change Certificate Type
                  </Button>
                )}
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Your Certificate
                </CardTitle>
                <CardDescription>
                  {selectedType.name} - {getSearchDescription()}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Search Field Selector (only if 3+ fields enabled) */}
                {enabledFields.length > 2 && (
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
                  {enabledFields.length <= 2 && enabledFields.length > 1 ? (
                    // If 2 fields enabled, show combined label
                    <Label className="flex items-center gap-2">
                      <Search className="h-4 w-4" />
                      {enabledFields.map((f, idx) => (
                        <span key={f}>
                          {getSearchFieldLabel(f)}
                          {idx < enabledFields.length - 1 && " or "}
                        </span>
                      ))}
                    </Label>
                  ) : (
                    // Single field or 3+ fields (with dropdown)
                    <Label className="flex items-center gap-2">
                      {getSearchFieldIcon(searchField)}
                      {getSearchFieldLabel(searchField)}
                    </Label>
                  )}
                  <Input
                    type={searchField === "email" ? "email" : "text"}
                    placeholder={
                      enabledFields.length === 2 && enabledFields.length > 1
                        ? `Enter your ${enabledFields.map(f => getSearchFieldLabel(f).toLowerCase()).join(" or ")}`
                        : getSearchFieldPlaceholder(searchField)
                    }
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                  />
                </div>

                <Button className="w-full" onClick={handleSearch} disabled={isSearching}>
                  {isSearching ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" />Find Certificate</>
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
                    <CardTitle>Select Your Certificate</CardTitle>
                    <CardDescription>
                      {matchedRecipients.length} certificates found
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
                          <Badge variant="outline">Reg: {recipient.certificateId}</Badge>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Download */}
          {step === "preview" && selectedRecipient && selectedType && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>

              <Card>
                <CardHeader className="text-center pb-2">
                  <Badge className="w-fit mx-auto mb-2">{selectedType.name}</Badge>
                  <CardTitle>Certificate Preview</CardTitle>
                  <CardDescription>
                    For <span className="font-medium text-foreground">{selectedRecipient.name}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative rounded-lg overflow-hidden border select-none">
                    <img
                      src={selectedType.templateImage}
                      alt="Certificate"
                      className="w-full h-auto pointer-events-none"
                      draggable={false}
                    />
                    <div
                      className="absolute"
                      style={{
                        left: `${selectedType.textPosition.x}%`,
                        top: `${selectedType.textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: "clamp(10px, 2.5vw, 18px)",
                        fontWeight: selectedType.fontBold ? "bold" : "normal",
                        fontStyle: selectedType.fontItalic ? "italic" : "normal",
                        fontFamily: selectedType.fontFamily
                      }}
                    >
                      <span className="text-black whitespace-nowrap">
                        {selectedRecipient.name}
                      </span>
                    </div>
                    {!downloaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl md:text-6xl font-bold text-foreground/5 rotate-[-30deg]">
                          PREVIEW
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="mt-4 flex justify-center">
                    {downloaded ? (
                      <div className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/10 text-emerald-600">
                        <Check className="h-5 w-5" />
                        <span className="font-medium">Downloaded!</span>
                      </div>
                    ) : (
                      <Button size="lg" onClick={handleDownload} disabled={isDownloading} className="min-w-48">
                        {isDownloading ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Generating...</>
                        ) : (
                          <><Download className="h-4 w-4 mr-2" />Download Certificate</>
                        )}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
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
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-sm">
      <div className="container mx-auto px-4 h-16 flex items-center justify-center">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
            <Award className="h-5 w-5 text-primary-foreground" />
          </div>
          <span className="font-semibold text-lg">CertiStage</span>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-border/50 bg-card/50 py-4">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-primary">CertiStage</span>
        </p>
      </div>
    </footer>
  )
}
