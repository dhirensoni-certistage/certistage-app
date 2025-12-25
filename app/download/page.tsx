"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Award, Download, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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

  useEffect(() => {
    // Prevent right-click
    const handleContextMenu = (e: MouseEvent) => e.preventDefault()
    document.addEventListener("contextmenu", handleContextMenu)

    // Prevent keyboard shortcuts
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        (e.ctrlKey && (e.key === "s" || e.key === "p" || e.key === "u")) ||
        e.key === "F12"
      ) {
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
    if (!eventId || !certId) {
      setError("Invalid certificate link. Please check the URL.")
      setLoading(false)
      return
    }

    // Fetch data from API
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

      // Draw name (if enabled)
      if (certType.showNameField !== false) {
        const textX = (certType.textPosition.x / 100) * canvas.width
        const textY = (certType.textPosition.y / 100) * canvas.height
        const fontSize = Math.round(canvas.height * ((certType.fontSize || 24) / 400))

        ctx.font = `${certType.fontBold ? "bold" : "normal"} ${certType.fontItalic ? "italic" : "normal"} ${fontSize}px ${certType.fontFamily || "Arial"}, sans-serif`
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
          const fieldFontSize = Math.round(canvas.height * ((field.fontSize || 24) / 400))

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

          if (value) {
            ctx.fillText(value, fieldX, fieldY)
          }
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

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading certificate...</p>
        </div>
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
              <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-destructive" />
              </div>
              <h2 className="text-xl font-semibold text-foreground mb-2">Certificate Not Found</h2>
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
        <div className="max-w-3xl w-full space-y-6">
          {/* Event Info */}
          <div className="text-center">
            <h1 className="text-2xl font-bold text-foreground mb-1">{event?.name}</h1>
            <p className="text-muted-foreground">Certificate for {recipient?.name}</p>
          </div>

          {/* Certificate Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="relative rounded-lg overflow-hidden border border-border select-none">
                {certType?.templateImage && (
                  <div className="relative">
                    <img
                      src={certType.templateImage}
                      alt="Certificate"
                      className="w-full h-auto pointer-events-none"
                      draggable={false}
                    />
                    {/* Name overlay */}
                    <div
                      className="absolute"
                      style={{
                        left: `${certType.textPosition.x}%`,
                        top: `${certType.textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span
                        className="text-lg md:text-2xl font-semibold text-foreground whitespace-nowrap"
                        style={{ textAlign: "center" }}
                      >
                        {recipient?.name}
                      </span>
                    </div>
                    {/* Preview watermark */}
                    {!downloaded && (
                      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <span className="text-4xl md:text-6xl font-bold text-foreground/5 rotate-[-30deg]">
                          PREVIEW
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Download Button */}
              <div className="mt-4 flex justify-center">
                {downloaded ? (
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex items-center gap-2 px-6 py-3 rounded-lg bg-emerald-500/10 text-emerald-600"
                  >
                    <Check className="h-5 w-5" />
                    <span className="font-medium">Downloaded Successfully</span>
                  </motion.div>
                ) : (
                  <Button
                    size="lg"
                    onClick={handleDownload}
                    disabled={isDownloading}
                    className="min-w-48"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating PDF...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download Certificate
                      </>
                    )}
                  </Button>
                )}
              </div>

              {downloaded && (
                <p className="text-center text-sm text-muted-foreground mt-3">
                  You can download again by refreshing this page.
                </p>
              )}
            </CardContent>
          </Card>
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
        <div className="flex items-center gap-1.5">
          <img src="/Certistage_icon.svg" alt="CertiStage" className="h-9 w-9" />
          <span className="font-semibold text-lg text-foreground">CertiStage</span>
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
          Powered by <span className="font-semibold text-primary">CertiStage</span> •
          Certificate Generation Platform
        </p>
        <p className="text-xs text-muted-foreground/60 mt-1">
          © {new Date().getFullYear()} All rights reserved
        </p>
      </div>
    </footer>
  )
}
