"use client"

import { useState, useEffect, useCallback } from "react"
import { useParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Award, Download, Check, AlertCircle, Loader2, Search, User, 
  ArrowLeft, Shield, Sparkles, FileCheck, ChevronRight, Mail, Phone
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { type EventRecipient, type CertificateType } from "@/lib/events"
import { jsPDF } from "jspdf"
import { cn } from "@/lib/utils"

type Step = "search" | "select" | "preview"

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

const staggerContainer = {
  animate: { transition: { staggerChildren: 0.1 } }
}

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string

  const [loading, setLoading] = useState(true)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [eventName, setEventName] = useState("")
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("search")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  
  const [matchedRecipients, setMatchedRecipients] = useState<EventRecipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<EventRecipient | null>(null)
  
  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

  // Security: Prevent right-click and keyboard shortcuts
  useEffect(() => {
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "u")) || e.key === "F12") {
        e.preventDefault()
      }
    }
    document.addEventListener("contextmenu", handleContextMenu)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("contextmenu", handleContextMenu)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [])

  // Fetch certificate data
  useEffect(() => {
    if (!eventId || !typeId) {
      setError("Invalid link")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/download?eventId=${eventId}&typeId=${typeId}`)
        const data = await res.json()
        
        if (!res.ok) {
          setError(data.error || "Failed to load")
          setLoading(false)
          return
        }

        if (!data.certificateType?.templateImage) {
          setError("Certificate template not available yet")
          setLoading(false)
          return
        }

        setEventName(data.event?.name || "")
        setCertType({
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
          stats: data.certificateType.stats,
          createdAt: data.certificateType.createdAt
        })
        setLoading(false)
      } catch {
        setError("Failed to load certificate data")
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId, typeId])

  const handleSearch = useCallback(() => {
    if (!searchValue.trim() || !certType) {
      toast.error("Please enter your email or mobile number")
      return
    }

    setIsSearching(true)
    
    setTimeout(() => {
      const searchLower = searchValue.toLowerCase().trim()
      const searchDigits = searchValue.replace(/[^0-9]/g, "")
      
      const matches = certType.recipients.filter(r => {
        if (r.email && r.email.toLowerCase() === searchLower) return true
        if (searchDigits.length >= 10) {
          const recipientDigits = r.mobile.replace(/[^0-9]/g, "")
          const searchLast10 = searchDigits.slice(-10)
          const recipientLast10 = recipientDigits.slice(-10)
          if (searchLast10 === recipientLast10 && recipientLast10.length === 10) return true
        }
        return false
      })

      if (matches.length === 0) {
        toast.error("No certificate found with this email or mobile")
        setIsSearching(false)
        return
      }

      setMatchedRecipients(matches)
      if (matches.length === 1) {
        setSelectedRecipient(matches[0])
        setStep("preview")
      } else {
        setStep("select")
      }
      setIsSearching(false)
    }, 600)
  }, [searchValue, certType])

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
    if (!certType?.template || !selectedRecipient) return

    setIsDownloading(true)

    try {
      // Check download permission
      const checkRes = await fetch("/api/download", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: selectedRecipient.id })
      })
      
      const checkData = await checkRes.json()
      
      if (!checkRes.ok) {
        if (checkData.limitReached) {
          toast.error("Download limit reached! Contact the organizer to upgrade.")
          setIsDownloading(false)
          return
        }
        toast.error(checkData.error || "Download failed")
        setIsDownloading(false)
        return
      }

      // Generate certificate
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

      const scaleFactor = canvas.width / 1600
      
      // Draw name field
      if (certType.showNameField !== false) {
        const textX = (certType.textPosition.x / 100) * canvas.width
        const textY = (certType.textPosition.y / 100) * canvas.height
        const scaledFontSize = Math.round((certType.fontSize || 24) * scaleFactor)
        const fontWeight = certType.fontBold ? "bold" : "normal"
        const fontStyle = certType.fontItalic ? "italic" : "normal"
        
        ctx.font = `${fontStyle} ${fontWeight} ${scaledFontSize}px ${certType.fontFamily || "Arial"}`
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(selectedRecipient.name, textX, textY)
      }

      // Draw custom fields
      if (certType.customFields) {
        for (const field of certType.customFields) {
          const fieldX = (field.position.x / 100) * canvas.width
          const fieldY = (field.position.y / 100) * canvas.height
          const fieldFontSize = Math.round((field.fontSize || 24) * scaleFactor)
          
          ctx.font = `${field.fontItalic ? "italic" : "normal"} ${field.fontBold ? "bold" : "normal"} ${fieldFontSize}px ${field.fontFamily || "Arial"}`
          
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

      // Generate PDF
      const pdfWidth = 297
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      pdf.addImage(canvas.toDataURL("image/jpeg", 1.0), "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`${certType.name}-${selectedRecipient.certificateId}.pdf`)
      
      setDownloaded(true)
      toast.success("Certificate downloaded successfully!")
    } catch (error) {
      console.error(error)
      toast.error("Download failed. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center"
        >
          <div className="relative">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
            <motion.div
              className="absolute -inset-2 rounded-3xl bg-primary/20 blur-xl"
              animate={{ opacity: [0.5, 0.8, 0.5] }}
              transition={{ duration: 2, repeat: Infinity }}
            />
          </div>
          <p className="text-muted-foreground font-medium">Loading certificate...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex flex-col">
        <Header eventName="" certName="" />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div {...fadeInUp} className="max-w-md w-full">
            <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Oops!</h2>
                <p className="text-muted-foreground">{error}</p>
              </CardContent>
            </Card>
          </motion.div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex flex-col">
      <Header eventName={eventName} certName={certType?.name || ""} />
      
      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <div className="w-full max-w-lg">
          <AnimatePresence mode="wait">
            {/* Step 1: Search */}
            {step === "search" && (
              <motion.div key="search" {...fadeInUp} transition={{ duration: 0.3 }}>
                <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
                  {/* Decorative top gradient */}
                  <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
                  
                  <CardContent className="p-8">
                    {/* Icon & Title */}
                    <div className="text-center mb-8">
                      <motion.div 
                        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center mx-auto mb-5 relative"
                        whileHover={{ scale: 1.05 }}
                      >
                        <Award className="h-10 w-10 text-primary" />
                        <motion.div
                          className="absolute -top-1 -right-1"
                          animate={{ rotate: [0, 15, -15, 0] }}
                          transition={{ duration: 2, repeat: Infinity }}
                        >
                          <Sparkles className="h-5 w-5 text-amber-500" />
                        </motion.div>
                      </motion.div>
                      <h1 className="text-2xl font-bold text-foreground mb-2">Download Your Certificate</h1>
                      <p className="text-muted-foreground">Enter your registered email or mobile number</p>
                    </div>

                    {/* Search Input */}
                    <div className="space-y-4">
                      <div className="relative">
                        <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">
                          <Search className="h-5 w-5" />
                        </div>
                        <Input
                          type="text"
                          placeholder="Email or mobile number"
                          value={searchValue}
                          onChange={(e) => setSearchValue(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                          className="h-14 pl-12 pr-4 text-base rounded-xl border-2 focus:border-primary transition-colors"
                        />
                      </div>
                      
                      <Button 
                        className="w-full h-14 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all" 
                        onClick={handleSearch} 
                        disabled={isSearching}
                      >
                        {isSearching ? (
                          <><Loader2 className="h-5 w-5 mr-2 animate-spin" />Searching...</>
                        ) : (
                          <>Find My Certificate<ChevronRight className="h-5 w-5 ml-2" /></>
                        )}
                      </Button>
                    </div>

                    {/* Trust badges */}
                    <div className="mt-8 pt-6 border-t border-border/50">
                      <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                        <div className="flex items-center gap-1.5">
                          <Shield className="h-4 w-4 text-emerald-500" />
                          <span>Secure</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <FileCheck className="h-4 w-4 text-blue-500" />
                          <span>Verified</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Download className="h-4 w-4 text-primary" />
                          <span>Instant</span>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 2: Select Profile */}
            {step === "select" && (
              <motion.div key="select" {...fadeInUp} transition={{ duration: 0.3 }}>
                <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-amber-500 via-amber-400 to-amber-300" />
                  
                  <CardContent className="p-6">
                    {/* Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={handleBack}
                        className="h-10 w-10 rounded-xl hover:bg-muted"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </Button>
                      <div>
                        <h2 className="text-xl font-bold">Select Your Profile</h2>
                        <p className="text-sm text-muted-foreground">
                          {matchedRecipients.length} certificate{matchedRecipients.length > 1 ? "s" : ""} found
                        </p>
                      </div>
                    </div>

                    {/* Profile List */}
                    <motion.div 
                      className="space-y-3"
                      variants={staggerContainer}
                      initial="initial"
                      animate="animate"
                    >
                      {matchedRecipients.map((recipient, index) => (
                        <motion.button
                          key={recipient.id}
                          variants={fadeInUp}
                          onClick={() => {
                            setSelectedRecipient(recipient)
                            setStep("preview")
                          }}
                          className={cn(
                            "w-full p-4 rounded-xl border-2 text-left transition-all duration-200",
                            "hover:border-primary hover:bg-primary/5 hover:shadow-lg",
                            "focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                          )}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0">
                              <User className="h-6 w-6 text-primary" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-semibold text-foreground truncate">{recipient.name}</p>
                              <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                                {recipient.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <Mail className="h-3.5 w-3.5" />
                                    {recipient.email}
                                  </span>
                                )}
                                {recipient.mobile && (
                                  <span className="flex items-center gap-1">
                                    <Phone className="h-3.5 w-3.5" />
                                    {recipient.mobile}
                                  </span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="h-5 w-5 text-muted-foreground" />
                          </div>
                        </motion.button>
                      ))}
                    </motion.div>
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {/* Step 3: Preview & Download */}
            {step === "preview" && selectedRecipient && certType && (
              <motion.div 
                key="preview" 
                {...fadeInUp} 
                transition={{ duration: 0.3 }}
                className="max-w-2xl mx-auto"
              >
                {/* Back button */}
                <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={handleBack}
                    className="mb-4 hover:bg-muted rounded-lg"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                </motion.div>
                
                <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
                  {/* Success gradient when downloaded */}
                  <div className={cn(
                    "h-2 transition-all duration-500",
                    downloaded 
                      ? "bg-gradient-to-r from-emerald-500 via-emerald-400 to-emerald-300" 
                      : "bg-gradient-to-r from-primary via-primary/80 to-primary/60"
                  )} />
                  
                  <CardContent className="p-6">
                    {/* Recipient info */}
                    <div className="flex items-center gap-4 mb-6 p-4 rounded-xl bg-muted/50">
                      <div className="h-14 w-14 rounded-full bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
                        <User className="h-7 w-7 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-bold text-lg text-foreground">{selectedRecipient.name}</p>
                        <p className="text-sm text-muted-foreground">Certificate ID: {selectedRecipient.certificateId}</p>
                      </div>
                      <Badge variant="secondary" className="shrink-0">{certType.name}</Badge>
                    </div>

                    {/* Certificate Preview */}
                    <div className="relative rounded-xl overflow-hidden border-2 border-border/50 select-none [container-type:inline-size] shadow-inner bg-muted/30">
                      <img
                        src={certType.template}
                        alt="Certificate"
                        className="w-full h-auto pointer-events-none"
                        draggable={false}
                      />
                      
                      {/* Name overlay */}
                      {certType.showNameField !== false && (
                        <div
                          className="absolute pointer-events-none"
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
                          className="absolute pointer-events-none"
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
                          className="absolute pointer-events-none"
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
                      
                      {/* Preview watermark */}
                      {!downloaded && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-5xl md:text-7xl font-black text-foreground/[0.03] rotate-[-30deg] select-none">
                            PREVIEW
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Download Button */}
                    <div className="mt-6 flex justify-center">
                      <AnimatePresence mode="wait">
                        {downloaded ? (
                          <motion.div
                            key="success"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            className="flex flex-col items-center gap-3"
                          >
                            <div className="flex items-center gap-3 px-8 py-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                              <div className="h-10 w-10 rounded-full bg-emerald-500 flex items-center justify-center">
                                <Check className="h-6 w-6 text-white" />
                              </div>
                              <div>
                                <p className="font-semibold text-emerald-600">Downloaded Successfully!</p>
                                <p className="text-sm text-emerald-600/70">Check your downloads folder</p>
                              </div>
                            </div>
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => setDownloaded(false)}
                              className="text-muted-foreground hover:text-foreground"
                            >
                              Download Again
                            </Button>
                          </motion.div>
                        ) : (
                          <motion.div key="download" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                            <Button 
                              size="lg" 
                              onClick={handleDownload} 
                              disabled={isDownloading}
                              className="h-14 px-10 text-base font-semibold rounded-xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all"
                            >
                              {isDownloading ? (
                                <>
                                  <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                                  Generating PDF...
                                </>
                              ) : (
                                <>
                                  <Download className="h-5 w-5 mr-2" />
                                  Download Certificate
                                </>
                              )}
                            </Button>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <Footer />
    </div>
  )
}

// Header Component
function Header({ eventName, certName }: { eventName: string; certName: string }) {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/Certistage_icon.svg" alt="CertiStage" className="h-9 w-9" />
          <span className="font-bold text-lg">CertiStage</span>
        </div>
        {eventName && (
          <div className="hidden sm:flex items-center gap-2 text-sm">
            <span className="text-muted-foreground">{eventName}</span>
            {certName && (
              <>
                <span className="text-muted-foreground/50">•</span>
                <Badge variant="secondary" className="font-medium">{certName}</Badge>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}

// Footer Component
function Footer() {
  return (
    <footer className="py-6 mt-auto">
      <div className="container mx-auto px-4 text-center">
        <p className="text-sm text-muted-foreground">
          Powered by <span className="font-semibold text-foreground">CertiStage</span>
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          © {new Date().getFullYear()} All rights reserved
        </p>
      </div>
    </footer>
  )
}
