"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Award, Download, Check, AlertCircle, Loader2, Search, User, ArrowLeft, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { getEvent, markAsDownloaded, findRecipientsByContact, type EventRecipient, type CertificateEvent, type CertificateType } from "@/lib/events"
import { jsPDF } from "jspdf"
import { cn } from "@/lib/utils"

type Step = "verify" | "select-profile" | "preview"

interface MatchedCertificate {
  recipient: EventRecipient
  certType: CertificateType
}

export default function EventDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<CertificateEvent | null>(null)
  const [error, setError] = useState<string | null>(null)
  
  const [step, setStep] = useState<Step>("verify")
  const [searchValue, setSearchValue] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [matchedCertificates, setMatchedCertificates] = useState<MatchedCertificate[]>([])
  const [selectedCertificate, setSelectedCertificate] = useState<MatchedCertificate | null>(null)
  
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

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

  useEffect(() => {
    if (!eventId) {
      setError("Invalid event link.")
      setLoading(false)
      return
    }

    const loadedEvent = getEvent(eventId)
    if (!loadedEvent) {
      setError("Event not found. This link may be invalid or expired.")
      setLoading(false)
      return
    }

    if (loadedEvent.certificateTypes.length === 0) {
      setError("No certificates available yet. Please contact the administrator.")
      setLoading(false)
      return
    }

    setEvent(loadedEvent)
    setLoading(false)
  }, [eventId])

  const handleVerify = () => {
    if (!searchValue.trim() || !event) {
      toast.error("Please enter your email or mobile number")
      return
    }

    setIsVerifying(true)
    
    setTimeout(() => {
      const matches = findRecipientsByContact(eventId, searchValue)

      if (matches.length === 0) {
        toast.error("No certificate found. Please check and try again.")
        setIsVerifying(false)
        return
      }

      setMatchedCertificates(matches)
      
      if (matches.length === 1) {
        setSelectedCertificate(matches[0])
        setStep("preview")
      } else {
        setStep("select-profile")
      }
      
      setIsVerifying(false)
    }, 800)
  }

  const handleSelectCertificate = (cert: MatchedCertificate) => {
    setSelectedCertificate(cert)
    setStep("preview")
  }

  const handleBack = () => {
    if (step === "preview" && matchedCertificates.length > 1) {
      setStep("select-profile")
    } else {
      setStep("verify")
      setSelectedCertificate(null)
      setMatchedCertificates([])
    }
    setDownloaded(false)
  }

  const handleDownload = async () => {
    if (!selectedCertificate?.certType.template) return

    setIsDownloading(true)

    try {
      const { recipient, certType } = selectedCertificate
      
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Canvas error")

      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = certType.template!
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const textX = (certType.textPosition.x / 100) * canvas.width
      const textY = (certType.textPosition.y / 100) * canvas.height
      const fontSize = Math.round(canvas.height * 0.04)
      
      ctx.font = `600 ${fontSize}px sans-serif`
      ctx.fillStyle = "#000000"
      ctx.textAlign = (certType as any).alignment || "center"
      ctx.textBaseline = "middle"
      ctx.fillText(recipient.name, textX, textY)

      const pdfWidth = 297
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight)
      
      const fileName = `${certType.name}-${recipient.certificateId}.pdf`
      
      // Get PDF as base64 data URI - works better in WebView
      const pdfDataUri = pdf.output('datauristring')
      
      // Detect mobile device
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
      
      if (isMobile) {
        // Mobile: Create a download link with data URI
        const link = document.createElement('a')
        link.href = pdfDataUri
        link.download = fileName
        
        // For iOS - try opening in new tab (will show PDF with share option)
        if (isIOS) {
          // Convert to blob for iOS
          const pdfBlob = pdf.output('blob')
          const blobUrl = URL.createObjectURL(pdfBlob)
          
          // Try multiple approaches for iOS
          const newWindow = window.open(blobUrl, '_blank')
          if (!newWindow) {
            // Fallback: use location.href
            window.location.href = pdfDataUri
          }
          setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
        } else {
          // Android: Use anchor click with data URI
          link.style.display = 'none'
          document.body.appendChild(link)
          
          // Try click
          link.click()
          
          // Fallback: Also try opening data URI directly
          setTimeout(() => {
            const pdfBlob = pdf.output('blob')
            const blobUrl = URL.createObjectURL(pdfBlob)
            window.open(blobUrl, '_system') // _system hint for WebView
            setTimeout(() => URL.revokeObjectURL(blobUrl), 30000)
          }, 500)
          
          document.body.removeChild(link)
        }
      } else {
        // Desktop browser - standard save
        pdf.save(fileName)
      }

      markAsDownloaded(eventId, recipient.certificateId)
      setDownloaded(true)
      toast.success("Certificate downloaded!")
    } catch (error) {
      console.error(error)
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

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      
      <main className="flex-1 flex items-center justify-center p-4">
        <div className="max-w-xl w-full space-y-6">
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">{event?.name}</h1>
            <p className="text-muted-foreground">Download your certificate</p>
          </div>

          {/* Step 1: Verify */}
          {step === "verify" && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Your Certificate
                </CardTitle>
                <CardDescription>
                  Enter your registered email or mobile number
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Email or Mobile Number</Label>
                  <Input
                    type="text"
                    placeholder="Enter email or mobile"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                  />
                </div>
                <Button className="w-full" onClick={handleVerify} disabled={isVerifying}>
                  {isVerifying ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" />Find Certificate</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Certificate (if multiple) */}
          {step === "select-profile" && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="icon" onClick={handleBack}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <CardTitle>Select Certificate</CardTitle>
                    <CardDescription>
                      {matchedCertificates.length} certificates found
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {matchedCertificates.map((cert, index) => (
                    <button
                      key={`${cert.certType.id}-${cert.recipient.id}`}
                      onClick={() => handleSelectCertificate(cert)}
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
                          <p className="font-medium text-foreground">{cert.recipient.name}</p>
                          <p className="text-sm text-muted-foreground">{cert.certType.name}</p>
                        </div>
                        <Badge variant="outline">Reg: {cert.recipient.certificateId}</Badge>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Download */}
          {step === "preview" && selectedCertificate && (
            <div className="space-y-4">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              
              <Card>
                <CardHeader className="text-center pb-2">
                  <Badge className="w-fit mx-auto mb-2">{selectedCertificate.certType.name}</Badge>
                  <CardTitle>Certificate Preview</CardTitle>
                  <CardDescription>
                    For <span className="font-medium text-foreground">{selectedCertificate.recipient.name}</span>
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="relative rounded-lg overflow-hidden border select-none">
                    <img
                      src={selectedCertificate.certType.template}
                      alt="Certificate"
                      className="w-full h-auto pointer-events-none"
                      draggable={false}
                    />
                    <div
                      className="absolute"
                      style={{
                        left: `${selectedCertificate.certType.textPosition.x}%`,
                        top: `${selectedCertificate.certType.textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                        fontSize: "clamp(10px, 2.5vw, 18px)",
                        textAlign: (selectedCertificate.certType as any).alignment || "center",
                      }}
                    >
                      <span className="font-semibold text-black whitespace-nowrap">
                        {selectedCertificate.recipient.name}
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
