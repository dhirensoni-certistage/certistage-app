"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Award, Download, Check, AlertCircle, Loader2, Search, User, ArrowLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { type EventRecipient, type CertificateType, type CertificateEvent } from "@/lib/events"
import { jsPDF } from "jspdf"
import { cn } from "@/lib/utils"

type Step = "verify" | "select-profile" | "preview"

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string

  const [loading, setLoading] = useState(true)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventData, setEventData] = useState<CertificateEvent | null>(null)
  const [eventName, setEventName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [downloadLimit, setDownloadLimit] = useState<number>(-1)
  
  const [step, setStep] = useState<Step>("verify")
  const [searchValue, setSearchValue] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  
  const [matchedRecipients, setMatchedRecipients] = useState<EventRecipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<EventRecipient | null>(null)
  
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
    if (!eventId || !typeId) {
      setError("Invalid link.")
      setLoading(false)
      return
    }

    // Fetch from API instead of localStorage
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/download?eventId=${eventId}&typeId=${typeId}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || "Failed to load certificate data.")
          setLoading(false)
          return
        }

        if (!data.event) {
          setError("Event not found.")
          setLoading(false)
          return
        }

        if (!data.certificateType) {
          setError("Certificate type not found.")
          setLoading(false)
          return
        }

        if (!data.certificateType.templateImage) {
          setError("Certificate template not available yet.")
          setLoading(false)
          return
        }

        setEventName(data.event.name)
        setEventData(data.event)
        
        // Map API response to expected format
        const certTypeData: CertificateType = {
          id: data.certificateType.id,
          name: data.certificateType.name,
          template: data.certificateType.templateImage,
          textPosition: data.certificateType.textPosition || { x: 50, y: 60 },
          fontSize: data.certificateType.fontSize || 24,
          fontFamily: data.certificateType.fontFamily || "Arial",
          fontBold: data.certificateType.fontBold || false,
          fontItalic: data.certificateType.fontItalic || false,
          showNameField: data.certificateType.showNameField !== false,
          customFields: data.certificateType.customFields || [],
          signatures: data.certificateType.signatures || [],
          recipients: data.recipients || [],
          stats: data.certificateType.stats || { total: 0, downloaded: 0, pending: 0 },
          createdAt: data.certificateType.createdAt || new Date().toISOString()
        }
        
        setCertType(certTypeData)
        setDownloadLimit(data.downloadLimit ?? -1)
        setLoading(false)
      } catch (error) {
        console.error("Failed to fetch certificate data:", error)
        setError("Failed to load certificate data. Please try again.")
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId, typeId])

  const handleVerify = () => {
    if (!searchValue.trim() || !certType) {
      toast.error("Please enter your email or mobile number")
      return
    }

    setIsVerifying(true)
    
    setTimeout(() => {
      const searchLower = searchValue.toLowerCase().trim()
      const searchDigits = searchValue.replace(/[^0-9]/g, "")
      
      const matches = certType.recipients.filter(r => 
        r.email.toLowerCase() === searchLower ||
        r.mobile.replace(/[^0-9]/g, "").includes(searchDigits) ||
        r.mobile === searchValue
      )

      if (matches.length === 0) {
        toast.error("No certificate found. Please check and try again.")
        setIsVerifying(false)
        return
      }

      setMatchedRecipients(matches)
      
      if (matches.length === 1) {
        setSelectedRecipient(matches[0])
        setStep("preview")
      } else {
        setStep("select-profile")
      }
      
      setIsVerifying(false)
    }, 800)
  }

  const handleSelectRecipient = (recipient: EventRecipient) => {
    setSelectedRecipient(recipient)
    setStep("preview")
  }

  const handleBack = () => {
    if (step === "preview" && matchedRecipients.length > 1) {
      setStep("select-profile")
    } else {
      setStep("verify")
      setSelectedRecipient(null)
      setMatchedRecipients([])
    }
    setDownloaded(false)
  }

  const handleDownload = async () => {
    if (!certType?.template || !selectedRecipient) return

    // Check download limit using current recipient data
    const currentDownloadCount = selectedRecipient.downloadCount || 0

    // Check download limit
    if (downloadLimit !== -1 && currentDownloadCount >= downloadLimit) {
      toast.error(`Download limit reached! You can only download this certificate ${downloadLimit} time(s). Please contact the organizer to upgrade their plan.`)
      return
    }

    setIsDownloading(true)

    try {
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
      // Scale font size relative to canvas width for consistent sizing
      // Using width/1600 gives proper scaling - 50px font at 1600px width = 50px, at 800px = 25px
      const scaleFactor = canvas.width / 1600
      const scaledFontSize = Math.round((certType.fontSize || 24) * scaleFactor)
      const fontWeight = certType.fontBold ? "bold" : "normal"
      const fontStyle = certType.fontItalic ? "italic" : "normal"
      const fontFamily = certType.fontFamily || "Arial"
      
      ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${fontFamily}`
      ctx.fillStyle = "#000000"
      ctx.textAlign = "center"
      ctx.textBaseline = "middle"
      
      // Draw NAME field only if showNameField is not false
      if (certType.showNameField !== false) {
        ctx.fillText(selectedRecipient.name, textX, textY)
      }

      // Draw custom fields
      if (certType.customFields) {
        for (const field of certType.customFields) {
          const fieldX = (field.position.x / 100) * canvas.width
          const fieldY = (field.position.y / 100) * canvas.height
          const fieldFontSize = Math.round((field.fontSize || 24) * scaleFactor)
          const fieldFontWeight = field.fontBold ? "bold" : "normal"
          const fieldFontStyle = field.fontItalic ? "italic" : "normal"
          const fieldFontFamily = field.fontFamily || "Arial"
          
          ctx.font = `${fieldFontStyle} ${fieldFontWeight} ${fieldFontSize}px ${fieldFontFamily}`
          
          let value = ""
          switch (field.variable) {
            case "NAME": value = selectedRecipient.name; break
            case "EMAIL": value = selectedRecipient.email; break
            case "MOBILE": value = selectedRecipient.mobile; break
            case "REG_NO": value = selectedRecipient.certificateId; break
            default: value = field.variable
          }
          
          ctx.fillText(value, fieldX, fieldY)
        }
      }

      // Draw signatures
      if (certType.signatures) {
        for (const sig of certType.signatures) {
          const sigImg = new Image()
          sigImg.crossOrigin = "anonymous"
          await new Promise<void>((resolve) => {
            sigImg.onload = () => resolve()
            sigImg.onerror = () => resolve()
            sigImg.src = sig.image
          })
          
          const sigWidth = (sig.width / 100) * canvas.width
          const sigHeight = (sigImg.height / sigImg.width) * sigWidth
          const sigX = (sig.position.x / 100) * canvas.width - sigWidth / 2
          const sigY = (sig.position.y / 100) * canvas.height - sigHeight / 2
          
          ctx.drawImage(sigImg, sigX, sigY, sigWidth, sigHeight)
        }
      }

      const pdfWidth = 297
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${certType.name}-${selectedRecipient.certificateId}.pdf`)

      // Track download via API
      try {
        await fetch("/api/download", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: selectedRecipient.id })
        })
      } catch (e) {
        console.error("Failed to track download:", e)
      }
      
      setDownloaded(true)
      toast.success("Certificate downloaded!")
    } catch (error) {
      console.error(error)
      toast.error("Download failed.")
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
        <div className="max-w-md w-full space-y-6">

          {/* Step 1: Verify */}
          {step === "verify" && (
            <Card className="shadow-lg border-0">
              <CardContent className="p-6 space-y-5">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-semibold">Download Certificate</h2>
                  <p className="text-sm text-muted-foreground">Enter your registered email or mobile number</p>
                </div>
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Email or Mobile Number</Label>
                  <Input
                    type="text"
                    placeholder="Enter email or mobile"
                    value={searchValue}
                    onChange={(e) => setSearchValue(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleVerify()}
                    className="h-11"
                  />
                </div>
                <Button className="w-full h-11" onClick={handleVerify} disabled={isVerifying}>
                  {isVerifying ? (
                    <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Searching...</>
                  ) : (
                    <><Search className="h-4 w-4 mr-2" />Find Certificate</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Select Profile */}
          {step === "select-profile" && (
            <Card className="shadow-lg border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-3 mb-4">
                  <Button variant="ghost" size="icon" onClick={handleBack} className="h-8 w-8">
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <div>
                    <h2 className="font-semibold">Select Your Profile</h2>
                    <p className="text-sm text-muted-foreground">{matchedRecipients.length} profiles found</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {matchedRecipients.map((recipient) => (
                    <button
                      key={recipient.id}
                      onClick={() => handleSelectRecipient(recipient)}
                      className={cn(
                        "w-full p-4 rounded-lg border text-left transition-colors cursor-pointer",
                        "hover:bg-accent hover:border-primary/50"
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <User className="h-5 w-5 text-primary" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{recipient.name}</p>
                          <p className="text-sm text-muted-foreground">{recipient.email || recipient.mobile}</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Preview & Download */}
          {step === "preview" && selectedRecipient && certType && (
            <div className="space-y-4 max-w-2xl mx-auto">
              <Button variant="ghost" size="sm" onClick={handleBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />Back
              </Button>
              
              <Card className="shadow-lg border-0">
                <CardContent className="p-5">
                  <div className="relative rounded-lg overflow-hidden border select-none [container-type:inline-size]">
                    <img
                      src={certType.template}
                      alt="Certificate"
                      className="w-full h-auto pointer-events-none"
                      draggable={false}
                    />
                    {/* NAME field - only show if showNameField is not false */}
                    {certType.showNameField !== false && (
                      <div
                        className="absolute"
                        style={{
                          left: `${certType.textPosition.x}%`,
                          top: `${certType.textPosition.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span 
                          className="text-black whitespace-nowrap"
                          style={{
                            fontSize: `max(10px, ${(certType.fontSize || 24) * 0.0625}cqi)`,
                            fontFamily: certType.fontFamily || 'Arial',
                            fontWeight: certType.fontBold ? 'bold' : 'normal',
                            fontStyle: certType.fontItalic ? 'italic' : 'normal',
                          }}
                        >
                          {selectedRecipient.name}
                        </span>
                      </div>
                    )}
                    {/* Custom Fields */}
                    {certType.customFields?.map((field) => (
                      <div
                        key={field.id}
                        className="absolute"
                        style={{
                          left: `${field.position.x}%`,
                          top: `${field.position.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <span 
                          className="text-black whitespace-nowrap"
                          style={{
                            fontSize: `max(8px, ${(field.fontSize || 24) * 0.0625}cqi)`,
                            fontFamily: field.fontFamily || 'Arial',
                            fontWeight: field.fontBold ? 'bold' : 'normal',
                            fontStyle: field.fontItalic ? 'italic' : 'normal',
                          }}
                        >
                          {field.variable === 'NAME' ? selectedRecipient.name :
                           field.variable === 'EMAIL' ? selectedRecipient.email :
                           field.variable === 'MOBILE' ? selectedRecipient.mobile :
                           field.variable === 'REG_NO' ? selectedRecipient.certificateId : field.variable}
                        </span>
                      </div>
                    ))}
                    {/* Signatures */}
                    {certType.signatures?.map((sig) => (
                      <div
                        key={sig.id}
                        className="absolute"
                        style={{
                          left: `${sig.position.x}%`,
                          top: `${sig.position.y}%`,
                          transform: "translate(-50%, -50%)",
                        }}
                      >
                        <img 
                          src={sig.image} 
                          alt="Signature" 
                          className="h-auto object-contain"
                          style={{ width: `${sig.width}%`, maxWidth: '150px' }}
                          draggable={false}
                        />
                      </div>
                    ))}
                    {!downloaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl md:text-6xl font-bold text-foreground/5 rotate-[-30deg]">PREVIEW</span>
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
    <header className="bg-background">
      <div className="container mx-auto px-4 h-14 flex items-center justify-center">
        <div className="flex items-center gap-1.5">
          <img src="/Certistage_icon.svg" alt="CertiStage" className="h-9 w-9" />
          <span className="font-semibold text-lg">CertiStage</span>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="py-6">
      <div className="container mx-auto px-4 text-center">
        <p className="text-xs text-muted-foreground">
          Powered by <span className="font-medium text-foreground">CertiStage</span>
        </p>
      </div>
    </footer>
  )
}
