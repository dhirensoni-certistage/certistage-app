"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { motion } from "framer-motion"
import { Award, Download, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { toast } from "sonner"
import { getEvent, getRecipientByCertificateId, markAsDownloaded } from "@/lib/events"
import { jsPDF } from "jspdf"

export default function DownloadPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("event")
  const certId = searchParams.get("cert")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recipientName, setRecipientName] = useState("")
  const [eventName, setEventName] = useState("")
  const [templateImage, setTemplateImage] = useState<string | null>(null)
  const [textPosition, setTextPosition] = useState({ x: 50, y: 60 })
  const [alignment, setAlignment] = useState<"left" | "center" | "right">("center")
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

    // Load event and recipient data
    const event = getEvent(eventId)
    if (!event) {
      setError("Event not found. This certificate link may be invalid or expired.")
      setLoading(false)
      return
    }

    const result = getRecipientByCertificateId(eventId, certId)
    if (!result) {
      setError("Certificate not found. Please verify your certificate ID.")
      setLoading(false)
      return
    }

    const { recipient, certType } = result

    // Check template from certificate type
    if (!certType.template) {
      setError("Certificate template not available. Please contact the administrator.")
      setLoading(false)
      return
    }

    setRecipientName(recipient.name)
    setEventName(event.name)
    setTemplateImage(certType.template)
    setTextPosition(certType.textPosition)
    setAlignment(certType.alignment)
    setLoading(false)
  }, [eventId, certId])

  const handleDownload = async () => {
    if (!templateImage || !eventId || !certId) return

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
        img.src = templateImage
      })

      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)

      // Draw name (if enabled)
      if (certType.showNameField !== false) {
        const textX = (textPosition.x / 100) * canvas.width
        const textY = (textPosition.y / 100) * canvas.height
        // Use configured font size or default
        const fontSize = Math.round(canvas.height * ((certType.fontSize || 24) / 400)) // approximation based on 400px height base

        ctx.font = `${certType.fontBold ? "bold" : "normal"} ${certType.fontItalic ? "italic" : "normal"} ${fontSize}px ${certType.fontFamily || "Arial"}, sans-serif`
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center" // Name is usually centered
        ctx.textBaseline = "middle"
        ctx.fillText(recipient.name, textX, textY)
      }

      // Draw custom fields from certType
      if (certType.customFields) {
        certType.customFields.forEach(field => {
          const fieldX = (field.position.x / 100) * canvas.width
          const fieldY = (field.position.y / 100) * canvas.height
          const fieldFontSize = Math.round(canvas.height * ((field.fontSize || 24) / 400))

          ctx.font = `${field.fontBold ? "bold" : "normal"} ${field.fontItalic ? "italic" : "normal"} ${fieldFontSize}px ${field.fontFamily || "Arial"}, sans-serif`
          ctx.fillStyle = "#000000"
          ctx.textAlign = "center"
          ctx.textBaseline = "middle"

          // Get value based on variable
          let value = ""
          switch (field.variable) {
            case "EMAIL": value = recipient.email; break;
            case "MOBILE": value = recipient.mobile; break;
            case "REG_NO": value = recipient.certificateId; break;
            case "PREFIX": value = recipient.prefix || ""; break;
            default: value = "";
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
              sigImg.onerror = () => resolve() // Skip if fails
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

      // Mark as downloaded
      markAsDownloaded(eventId, certId)
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
            <h1 className="text-2xl font-bold text-foreground mb-1">{eventName}</h1>
            <p className="text-muted-foreground">Certificate for {recipientName}</p>
          </div>

          {/* Certificate Preview */}
          <Card>
            <CardContent className="p-4">
              <div className="relative rounded-lg overflow-hidden border border-border select-none">
                {templateImage && (
                  <div className="relative">
                    <img
                      src={templateImage}
                      alt="Certificate"
                      className="w-full h-auto pointer-events-none"
                      draggable={false}
                    />
                    {/* Name overlay */}
                    <div
                      className="absolute"
                      style={{
                        left: `${textPosition.x}%`,
                        top: `${textPosition.y}%`,
                        transform: "translate(-50%, -50%)",
                      }}
                    >
                      <span
                        className="text-lg md:text-2xl font-semibold text-foreground whitespace-nowrap"
                        style={{ textAlign: alignment }}
                      >
                        {recipientName}
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
