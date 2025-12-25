"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { 
  Award, Download, Check, AlertCircle, Loader2, Shield, 
  Sparkles, FileCheck, User, ChevronRight
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { jsPDF } from "jspdf"

interface Recipient {
  id: string
  name: string
  prefix?: string
  firstName?: string
  lastName?: string
  email?: string
  mobile?: string
  certificateId: string
  downloadCount: number
}

interface CertificateType {
  id: string
  name: string
  templateImage?: string
  textPosition: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontItalic: boolean
  showNameField: boolean
  customFields?: any[]
  signatures?: any[]
}

interface EventData {
  id: string
  name: string
  ownerId?: string
}

const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
}

export default function DownloadPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("event")
  const certId = searchParams.get("cert")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [event, setEvent] = useState<EventData | null>(null)
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
    if (!eventId || !certId) {
      setError("Invalid certificate link. Please check the URL.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/download?event=${eventId}&cert=${certId}`)
        const data = await res.json()

        if (!res.ok) {
          setError(data.error || "Certificate not found. This link may be invalid or expired.")
          setLoading(false)
          return
        }

        if (!data.certificateType?.templateImage) {
          setError("Certificate template not available. Please contact the administrator.")
          setLoading(false)
          return
        }

        setRecipient(data.recipient)
        setCertType(data.certificateType)
        setEvent(data.event)
        setLoading(false)
      } catch (err) {
        console.error("Fetch error:", err)
        setError("Failed to load certificate. Please try again.")
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId, certId])

  const handleDownload = async () => {
    if (!certType?.templateImage || !eventId || !certId || !recipient) return

    setIsDownloading(true)

    try {
      // Create canvas
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")

      // Load template image
      const img = new Image()
      img.crossOrigin = "anonymous"

      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = certType.templateImage!
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      const scaleFactor = canvas.width / 1600

      // Draw name (if enabled)
      if (certType.showNameField !== false) {
        const textX = (certType.textPosition.x / 100) * canvas.width
        const textY = (certType.textPosition.y / 100) * canvas.height
        const scaledFontSize = Math.round((certType.fontSize || 24) * scaleFactor)

        ctx.font = `${certType.fontBold ? "bold" : "normal"} ${certType.fontItalic ? "italic" : "normal"} ${scaledFontSize}px ${certType.fontFamily || "Arial"}, sans-serif`
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText(recipient.name, textX, textY)
      }

      // Draw custom fields
      if (certType.customFields) {
        certType.customFields.forEach((field: any) => {
          const fieldX = (field.position.x / 100) * canvas.width
          const fieldY = (field.position.y / 100) * canvas.height
          const fieldFontSize = Math.round((field.fontSize || 24) * scaleFactor)

          ctx.font = `${field.fontBold ? "bold" : "normal"} ${field.fontItalic ? "italic" : "normal"} ${fieldFontSize}px ${field.fontFamily || "Arial"}, sans-serif`
          ctx.fillStyle = "#000000"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          let value = ""
          switch (field.variable) {
            case "EMAIL": value = recipient.email || ""; break
            case "MOBILE": value = recipient.mobile || ""; break
            case "REG_NO": value = recipient.certificateId || ""; break
            default: value = ""
          }

          if (value) ctx.fillText(value, fieldX, fieldY)
        })
      }

      // Draw signatures
      if (certType.signatures) {
        for (const sig of certType.signatures) {
          if (sig.image) {
            const sigImg = new Image()
            sigImg.crossOrigin = "anonymous"
            await new Promise<void>((resolve) => {
              sigImg.onload = () => resolve()
              sigImg.onerror = () => resolve()
              sigImg.src = sig.image
            })

            const sigWidth = (sig.width / 100) * canvas.width
            const sigHeight = (sigWidth / sigImg.width) * sigImg.height
            const sigX = (sig.position.x / 100) * canvas.width - (sigWidth / 2)
            const sigY = (sig.position.y / 100) * canvas.height - (sigHeight / 2)

            ctx.drawImage(sigImg, sigX, sigY, sigWidth, sigHeight)
          }
        }
      }

      // Create PDF
      const pdfWidth = 297
      const pdfHeight = (canvas.height / canvas.width) * pdfWidth

      const pdf = new jsPDF({
        orientation: pdfWidth > pdfHeight ? "landscape" : "portrait",
        unit: "mm",
        format: [pdfWidth, pdfHeight],
      })

      const imgData = canvas.toDataURL("image/jpeg", 1.0)
      pdf.addImage(imgData, "JPEG", 0, 0, pdfWidth, pdfHeight)
      pdf.save(`certificate-${certId}.pdf`)

      // Track download via API
      try {
        await fetch("/api/download", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ recipientId: recipient.id })
        })
      } catch (e) {
        console.error("Failed to track download:", e)
      }

      setDownloaded(true)
      toast.success("Certificate downloaded successfully!")
    } catch (error) {
      console.error("Download error:", error)
      toast.error("Failed to download certificate. Please try again.")
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
          <p className="text-muted-foreground font-medium">Loading your certificate...</p>
        </motion.div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-background to-destructive/5 flex flex-col">
        <Header eventName="" />
        <main className="flex-1 flex items-center justify-center p-4">
          <motion.div {...fadeInUp} className="max-w-md w-full">
            <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm">
              <CardContent className="py-12 text-center">
                <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-6">
                  <AlertCircle className="h-10 w-10 text-destructive" />
                </div>
                <h2 className="text-2xl font-bold text-foreground mb-3">Certificate Not Found</h2>
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
      <Header eventName={event?.name || ""} />

      <main className="flex-1 flex items-center justify-center p-4 py-8">
        <motion.div {...fadeInUp} className="max-w-2xl w-full space-y-6">
          {/* Recipient Info Card */}
          <Card className="border-0 shadow-xl bg-card/80 backdrop-blur-sm overflow-hidden">
            <div className="h-2 bg-gradient-to-r from-primary via-primary/80 to-primary/60" />
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center relative">
                  <User className="h-8 w-8 text-primary" />
                  <motion.div
                    className="absolute -top-1 -right-1"
                    animate={{ rotate: [0, 15, -15, 0] }}
                    transition={{ duration: 2, repeat: Infinity }}
                  >
                    <Sparkles className="h-5 w-5 text-amber-500" />
                  </motion.div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-muted-foreground mb-1">Certificate for</p>
                  <h1 className="text-2xl font-bold text-foreground truncate">{recipient?.name}</h1>
                  <p className="text-sm text-muted-foreground mt-1">ID: {recipient?.certificateId}</p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-sm px-3 py-1">
                  {certType?.name || "Certificate"}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Certificate Preview */}
          <Card className="border-0 shadow-2xl bg-card/80 backdrop-blur-sm overflow-hidden">
            <CardContent className="p-6">
              <div className="relative rounded-xl overflow-hidden border-2 border-border/50 select-none [container-type:inline-size] shadow-inner bg-muted/30">
                {certType?.templateImage && (
                  <>
                    <img
                      src={certType.templateImage}
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
                          {recipient?.name}
                        </span>
                      </div>
                    )}
                    
                    {/* Custom fields */}
                    {certType.customFields?.map((field: any) => (
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
                          {field.variable === 'EMAIL' ? recipient?.email :
                           field.variable === 'MOBILE' ? recipient?.mobile :
                           field.variable === 'REG_NO' ? recipient?.certificateId : ''}
                        </span>
                      </div>
                    ))}
                    
                    {/* Signatures */}
                    {certType.signatures?.map((sig: any) => (
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
                  </>
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

              {/* Trust badges */}
              <div className="mt-6 pt-6 border-t border-border/50">
                <div className="flex items-center justify-center gap-6 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Shield className="h-4 w-4 text-emerald-500" />
                    <span>Secure Download</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <FileCheck className="h-4 w-4 text-blue-500" />
                    <span>Verified Certificate</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <Footer />
    </div>
  )
}

// Header Component
function Header({ eventName }: { eventName: string }) {
  return (
    <header className="border-b border-border/50 bg-card/50 backdrop-blur-md sticky top-0 z-50">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <img src="/Certistage_icon.svg" alt="CertiStage" className="h-9 w-9" />
          <span className="font-bold text-lg">CertiStage</span>
        </div>
        {eventName && (
          <Badge variant="secondary" className="font-medium">
            {eventName}
          </Badge>
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
