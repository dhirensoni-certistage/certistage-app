"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Check, AlertCircle, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
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
  textCase?: "none" | "uppercase" | "lowercase" | "capitalize"
  customFields?: any[]
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

  // Load Google Font if needed
  useEffect(() => {
    if (certType?.fontFamily && certType.fontFamily !== 'Arial') {
      const fontName = certType.fontFamily.replace(/\s+/g, '+')
      const link = document.createElement('link')
      link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@400;700&display=swap`
      link.rel = 'stylesheet'
      document.head.appendChild(link)
      
      return () => {
        document.head.removeChild(link)
      }
    }
  }, [certType?.fontFamily])

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
    if (!eventId || !certId) {
      setError("Invalid certificate link. Please check the URL.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        console.log("ðŸ” Fetching certificate data for:", { eventId, certId })
        const res = await fetch(`/api/download?event=${eventId}&cert=${certId}`)
        const data = await res.json()
        
        console.log("ðŸ“¦ API Response:", data)
        console.log("ðŸ–¼ï¸ Template Image URL:", data.certificateType?.templateImage)
        
        if (!res.ok) {
          setError(data.error || "Certificate not found. This link may be invalid or expired.")
          setLoading(false)
          return
        }
        
        console.log("âœ… Setting certificate data...")
        setRecipient(data.recipient)
        setCertType(data.certificateType)
        setEvent(data.event)
        
        setLoading(false)
      } catch (err) {
        console.error("âŒ Fetch error:", err)
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
      const canvas = document.createElement("canvas")
      const ctx = canvas.getContext("2d")
      if (!ctx) throw new Error("Could not get canvas context")
      const img = new window.Image()
      img.crossOrigin = "anonymous"
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve()
        img.onerror = reject
        img.src = certType.templateImage!
      })
      canvas.width = img.width
      canvas.height = img.height
      ctx.drawImage(img, 0, 0)
      if (certType.showNameField !== false) {
        const textX = (certType.textPosition.x / 100) * canvas.width
        const textY = (certType.textPosition.y / 100) * canvas.height
        // Match preview: fontSize / 10 cqw = fontSize / 10 / 100 * container_width
        const fontSize = Math.max(10, ((certType.fontSize || 24) / 10 / 100) * canvas.width)

        ctx.font = `${certType.fontBold ? "bold" : "normal"} ${certType.fontItalic ? "italic" : "normal"} ${fontSize}px ${certType.fontFamily || "Arial"}, sans-serif`
        ctx.fillStyle = "#000000"
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        
        // Apply text transformation
        const displayName = transformText(recipient.name, certType.textCase)
        ctx.fillText(displayName, textX, textY)
      }

      if (certType.customFields) {
        certType.customFields.forEach((field: any) => {
          const fieldX = (field.position.x / 100) * canvas.width
          const fieldY = (field.position.y / 100) * canvas.height
          const fieldFontSize = Math.max(10, ((field.fontSize || 24) / 10 / 100) * canvas.width)

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
      await fetch("/api/download", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient.id })
      })
      setDownloaded(true)
      toast.success("Certificate downloaded successfully!")
    } catch (error) {
      toast.error("Failed to download certificate. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-neutral-300 mx-auto mb-4" />
          <p className="text-sm text-neutral-500 font-medium">Preparing your certificate...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
        <Header />
        <main className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-md w-full bg-white dark:bg-neutral-950 p-10 rounded-xl border border-neutral-200 dark:border-neutral-800 text-center shadow-sm">
            <div className="h-16 w-16 rounded-full bg-red-500/10 flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="h-8 w-8 text-red-500" />
            </div>
            <h2 className="text-xl font-bold text-neutral-900 dark:text-white mb-2">Unavailable</h2>
            <p className="text-sm text-neutral-500 leading-relaxed font-normal">{error}</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
      <Header />

      <main className="flex-1 flex flex-col items-center justify-center p-6 lg:p-12">
        <div className="max-w-4xl w-full">
          {/* Info Section */}
          <div className="text-center mb-10">
            <h1 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white tracking-tight mb-2">{event?.name}</h1>
            <p className="text-sm text-neutral-500 font-normal">Official digital credential for <span className="text-neutral-900 dark:text-white font-medium">{recipient?.name}</span></p>
          </div>

          <div className="bg-white dark:bg-neutral-950 rounded-xl border border-neutral-200 dark:border-neutral-800 p-2 md:p-3 shadow-sm mb-10 mx-auto w-full max-w-4xl">
            {certType?.templateImage ? (
              <div className="relative w-full">
                <img
                  src={certType.templateImage}
                  alt="Certificate"
                  className="w-full h-auto block mx-auto rounded-lg"
                  draggable={false}
                  style={{
                    maxHeight: 'calc(100vh - 320px)',
                    objectFit: 'contain'
                  }}
                  onLoad={() => console.log("âœ… Certificate image loaded successfully")}
                  onError={() => {
                    console.error("âŒ Certificate image failed to load:", certType.templateImage)
                    toast.error("Failed to load certificate image")
                  }}
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
                      className="whitespace-nowrap leading-none select-none"
                      style={{
                        fontSize: `clamp(8px, ${(certType.fontSize || 24) * 0.04}vw, ${(certType.fontSize || 24) * 0.7}px)`,
                        fontFamily: `"${certType.fontFamily || 'Arial'}", sans-serif`,
                        fontWeight: certType.fontBold ? 'bold' : 'normal',
                        fontStyle: certType.fontItalic ? 'italic' : 'normal',
                        color: "#000"
                      }}
                    >
                      {transformText(recipient?.name || "", certType.textCase)}
                    </span>
                  </div>
                )}

                {/* Custom Fields Overlay */}
                {certType.customFields?.map((field: any, i: number) => {
                  let value = ""
                  switch (field.variable) {
                    case "EMAIL": value = recipient?.email || ""; break
                    case "MOBILE": value = recipient?.mobile || ""; break
                    case "REG_NO": value = recipient?.certificateId || ""; break
                    default: value = `{{${field.variable}}}`
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
                          fontSize: `clamp(6px, ${(field.fontSize || 24) * 0.04}vw, ${(field.fontSize || 24) * 0.7}px)`,
                          fontFamily: `"${field.fontFamily || 'Arial'}", sans-serif`,
                          fontWeight: field.fontBold ? 'bold' : 'normal',
                          fontStyle: field.fontItalic ? 'italic' : 'normal',
                          color: "#000"
                        }}
                      >
                        {value}
                      </span>
                    </div>
                  )
                })}

                {/* Watermark */}
                {!downloaded && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
                    <span className="text-[12vw] font-black text-neutral-900/5 rotate-[-25deg] uppercase tracking-[1em]">
                      Preview
                    </span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-8">
                <AlertCircle className="h-12 w-12 text-neutral-400 mx-auto mb-4" />
                <p className="text-sm text-neutral-500">Certificate template not available</p>
              </div>
            )}
          </div>

          <div className="flex justify-center">
            {downloaded ? (
              <div
                className="flex items-center gap-2.5 px-8 py-3 rounded-full bg-neutral-500/10 text-neutral-600 border border-neutral-500/20"
              >
                <Check className="h-5 w-5" />
                <span className="text-sm font-semibold">Saved Successfully</span>
              </div>
            ) : (
              <Button
                size="lg"
                onClick={handleDownload}
                disabled={isDownloading}
                className="h-12 px-10 rounded-full font-semibold text-sm shadow-md"
              >
                {isDownloading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2.5 animate-spin" />
                    Preparing PDF...
                  </>
                ) : (
                  <>
                    <Download className="h-4 w-4 mr-2.5" />
                    Download PDF
                  </>
                )}
              </Button>
            )}
          </div>

          {downloaded && (
            <p className="text-center text-[13px] text-neutral-400 mt-6 font-normal">
              You can download again by refreshing this page.
            </p>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="border-b border-neutral-200 dark:border-neutral-800 bg-white/50 dark:bg-[#0a0a0a]/50 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
          <span className="font-semibold text-[17px] text-neutral-900 dark:text-white">CertiStage</span>
        </div>
      </div>
    </header>
  )
}

function Footer() {
  return (
    <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 bg-neutral-50 dark:bg-[#080808]">
      <div className="max-w-7xl mx-auto px-6 text-center">
        <div className="flex flex-col md:flex-row items-center justify-center gap-1.5 text-xs text-neutral-400">
          <span>Powered by <Link href="/" className="font-bold text-neutral-900 dark:text-white hover:underline">CertiStage</Link> Digital Credentialing Platform</span>
          <span className="hidden md:inline">â€¢</span>
          <span>Â© {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  )
}

