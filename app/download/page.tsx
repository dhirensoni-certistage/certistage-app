"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { Download, Check, AlertCircle, Loader2 } from "lucide-react"
import { fieldValue } from "@/lib/certificate-fields"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import Image from "next/image"
import { toast } from "sonner"
import { useTemplateTextScale } from "@/lib/certificate-text"
import { LinkedInAddButton } from "@/components/download/linkedin-add-button"

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
  issuedAt?: string
  customFields?: Record<string, string>
}

interface CertificateType {
  id: string
  name: string
  templateImage?: string
  textPosition: { x: number; y: number }
  fontSize: number
  fontFamily: string
  fontBold: boolean
  fontColor?: string
  fontItalic: boolean
  showNameField: boolean
  textCase?: "none" | "uppercase" | "lowercase" | "capitalize"
  customFields?: any[]
  signatures?: Array<{ image: string; position?: { x: number; y: number }; x?: number; y?: number; width: number }>
}

interface EventData {
  id: string
  name: string
  ownerId?: string
  organization?: string | null
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
  // Same text-size rule as the editor and the PDF (see lib/certificate-text)
  const { ref: previewImgRef, scale: textScale } = useTemplateTextScale()

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
        console.log("[INFO] Fetching certificate data for:", { eventId, certId })
        const res = await fetch(`/api/download?event=${eventId}&cert=${certId}`)
        const data = await res.json()
        
        console.log("[INFO] API Response:", data)
        console.log("[INFO] Template Image URL:", data.certificateType?.templateImage)
        
        if (!res.ok) {
          setError(data.error || "Certificate not found. This link may be invalid or expired.")
          setLoading(false)
          return
        }
        
        console.log("[OK] Setting certificate data...")
        setRecipient(data.recipient)
        setCertType(data.certificateType)
        setEvent(data.event)
        
        setLoading(false)
      } catch (err) {
        console.error("[ERROR] Fetch error:", err)
        setError("Failed to load certificate. Please try again.")
        setLoading(false)
      }
    }
    fetchData()
  }, [eventId, certId])

  // The PDF comes from the server, the same file every other download page gives, so the
  // position and size set in the editor are exactly what the recipient gets
  const handleDownload = async () => {
    if (!recipient) return
    setIsDownloading(true)
    const pdfUrl = `/api/download/pdf?recipientId=${recipient.id}`
    const track = () =>
      fetch("/api/download", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipientId: recipient.id })
      }).catch(() => {})
    try {
      if (/android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)) {
        window.open(pdfUrl, "_blank")
        await track()
        setDownloaded(true)
        return
      }
      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error("Download failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${certType?.name || "certificate"}-${certId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      await track()
      setDownloaded(true)
      toast.success("Certificate downloaded successfully!")
    } catch {
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
              <div className="w-full flex justify-center">
                <div className="relative inline-block max-w-full">
                <img
                  ref={previewImgRef}
                  src={certType.templateImage}
                  alt="Certificate"
                  className="block w-auto max-w-full h-auto mx-auto rounded-lg"
                  draggable={false}
                  style={{
                    maxHeight: 'calc(100vh - 320px)',
                  }}
                  onLoad={() => console.log("[OK] Certificate image loaded successfully")}
                  onError={() => {
                    console.error("[ERROR] Certificate image failed to load:", certType.templateImage)
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
                        fontSize: `${(certType.fontSize || 24) * textScale}px`,
                        fontFamily: `"${certType.fontFamily || 'Arial'}", sans-serif`,
                        fontWeight: certType.fontBold ? 'bold' : 'normal',
                        fontStyle: certType.fontItalic ? 'italic' : 'normal',
                        color: certType.fontColor || "#000"
                      }}
                    >
                      {transformText(recipient?.name || "", certType.textCase)}
                    </span>
                  </div>
                )}

                {/* Custom Fields Overlay */}
                {certType.customFields?.map((field: any, i: number) => {
                  const value = fieldValue(field.variable, recipient)
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
                          fontSize: `${(field.fontSize || 24) * textScale}px`,
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

                {/* Signatures, as on the PDF */}
                {certType.signatures?.map((sig, i) => {
                  const pos = sig.position || { x: sig.x ?? 50, y: sig.y ?? 50 }
                  return (
                    <div key={`sig-${i}`} className="absolute pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", width: `${sig.width || 20}%` }}>
                      <img src={sig.image} alt="" className="w-full h-auto object-contain select-none" draggable={false} />
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

          {recipient && (
            // Shown before download too: on phones the PDF opens in a new tab and many never return
            <div className="max-w-xs mx-auto mt-4">
              <LinkedInAddButton
                className="rounded-full h-11"
                variant={downloaded ? "solid" : "outline"}
                recipientId={recipient.id}
                name={`${certType?.name ? `${certType.name} certificate - ` : ""}${event?.name || ""}`}
                organizationName={event?.organization || event?.name || ""}
                issuedAt={recipient.issuedAt}
                certUrl={window.location.href}
                certId={recipient.certificateId}
              />
              {downloaded && (
                <p className="text-center text-[13px] text-neutral-500 mt-3">Add it to your LinkedIn profile too; it takes 30 seconds.</p>
              )}
            </div>
          )}

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
          <span className="hidden md:inline">|</span>
          <span>(c) {new Date().getFullYear()} All rights reserved</span>
        </div>
      </div>
    </footer>
  )
}

