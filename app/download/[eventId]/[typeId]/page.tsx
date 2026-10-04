"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { Loader2, ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { useTemplateTextScale } from "@/lib/certificate-text"
import { individualCertificateUrl } from "@/lib/linkedin"
import { LinkedInAddButton } from "@/components/download/linkedin-add-button"

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
  issuedAt?: string
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
  organization?: string | null
}

type Step = "search" | "select" | "preview"
type SearchKey = "name" | "email" | "mobile" | "regNo"

const FIELD_META: Record<SearchKey, { label: string; placeholder: string; inputMode: "text" | "email" | "tel" }> = {
  name: { label: "Full name", placeholder: "As entered at registration", inputMode: "text" },
  email: { label: "Email", placeholder: "you@example.com", inputMode: "email" },
  mobile: { label: "Mobile number", placeholder: "Registered mobile number", inputMode: "tel" },
  regNo: { label: "Registration number", placeholder: "e.g. DEL-0042", inputMode: "text" }
}

const transformText = (text: string, textCase?: string): string => {
  switch (textCase) {
    case "uppercase": return text.toUpperCase()
    case "lowercase": return text.toLowerCase()
    case "capitalize": return text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
    default: return text
  }
}

// Wait at most this long for the design before showing the preview anyway (slow networks)
const TEMPLATE_WAIT_MS = 4000

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("search")
  const [searchField, setSearchField] = useState<SearchKey>("name")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)

  const [matchedRecipients, setMatchedRecipients] = useState<Recipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)
  // Preview text uses the same scale rule as the PDF (see lib/certificate-text)
  const { ref: measureImgRef, scale: textScale } = useTemplateTextScale()
  // Size of the design, known once the preload below finishes; reserves the preview's space
  const [templateSize, setTemplateSize] = useState<{ w: number; h: number } | null>(null)
  // Name and fields are drawn only once the design is on screen, so they never show alone
  const [templateShown, setTemplateShown] = useState(false)
  const previewImgRef = useCallback((el: HTMLImageElement | null) => {
    measureImgRef(el)
    setTemplateShown(!!el && el.complete && el.naturalWidth > 0)
  }, [measureImgRef])

  // Start loading and decoding the design (and signatures) while the recipient is still
  // typing. The preview waits for this, so it opens in one go with the image already there.
  const templateReady = useRef<Promise<void>>(Promise.resolve())
  useEffect(() => {
    const src = certType?.templateImage
    if (!src) return
    const img = new window.Image()
    img.src = src
    templateReady.current = img.decode()
      .then(() => setTemplateSize({ w: img.naturalWidth, h: img.naturalHeight }))
      .catch(() => {})
    certType?.signatures?.forEach((sig) => { if (sig.image) new window.Image().src = sig.image })
  }, [certType?.templateImage, certType?.signatures])

  const openPreview = async (recipient: Recipient) => {
    await Promise.race([templateReady.current, new Promise((r) => setTimeout(r, TEMPLATE_WAIT_MS))])
    setSelectedRecipient(recipient)
    setDownloaded(false)
    setStep("preview")
  }

  useEffect(() => {
    const loadData = async () => {
      try {
        const res = await fetch(`/api/download?eventId=${eventId}&typeId=${typeId}`)
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          setError(data.error || "This certificate link is not available.")
          return
        }
        const data = await res.json()
        setEvent(data.event)
        setCertType(data.certificateType)
        const sf: SearchFields = data.certificateType?.searchFields || { name: true, email: false, mobile: false, regNo: false }
        const first = (["name", "email", "mobile", "regNo"] as SearchKey[]).find((k) => sf[k])
        if (first) setSearchField(first)
      } catch {
        setError("Could not load this certificate page. Please check your connection and try again.")
      } finally {
        setLoading(false)
      }
    }
    if (eventId && typeId) loadData()
  }, [eventId, typeId])

  const enabledFields = useMemo<SearchKey[]>(() => {
    const sf = certType?.searchFields
    if (!sf) return []
    return (["name", "email", "mobile", "regNo"] as SearchKey[]).filter((k) => sf[k])
  }, [certType])

  const mapRecipient = (r: any): Recipient => ({
    id: r.id,
    name: r.name,
    email: r.email || "",
    mobile: r.mobile || "",
    certificateId: r.regNo || r.id,
    regNo: r.regNo,
    downloadCount: r.downloadCount || 0,
    issuedAt: r.issuedAt
  })

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = searchValue.trim()
    if (value.length < 3) {
      setSearchError(`Enter at least 3 characters of your ${FIELD_META[searchField].label.toLowerCase()}.`)
      return
    }
    setSearchError(null)
    setIsSearching(true)
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, typeId, searchQuery: value, searchType: searchField })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setSearchError(data.error || "Search failed. Please try again.")
        return
      }
      if (!data.found || !data.recipients?.length) {
        setSearchError(`No certificate found for that ${FIELD_META[searchField].label.toLowerCase()}. Check the spelling, or try another field.`)
        return
      }
      const list: Recipient[] = data.recipients.map(mapRecipient)
      setMatchedRecipients(list)
      setDownloaded(false)
      if (list.length === 1) {
        // The button keeps its spinner until the design is ready
        await openPreview(list[0])
      } else {
        setStep("select")
      }
    } catch {
      setSearchError("Search failed. Check your connection and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectRecipient = (recipient: Recipient) => {
    void openPreview(recipient)
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

  const trackDownload = () =>
    fetch("/api/download", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ recipientId: selectedRecipient?.id })
    }).catch(() => {})

  const handleDownload = async () => {
    if (!selectedRecipient) return
    setIsDownloading(true)
    try {
      const isMobile = /android|iphone|ipad|ipod|mobile/i.test(navigator.userAgent)
      const pdfUrl = `/api/download/pdf?recipientId=${selectedRecipient.id}`

      if (isMobile) {
        window.open(pdfUrl, "_blank")
        await trackDownload()
        setTimeout(() => {
          setDownloaded(true)
          setIsDownloading(false)
        }, 1200)
        return
      }

      const response = await fetch(pdfUrl)
      if (!response.ok) throw new Error("Download failed")
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `${certType?.name || "certificate"}-${selectedRecipient.certificateId}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      await trackDownload()
      setDownloaded(true)
    } catch {
      toast.error("Download failed. Please try again.")
    } finally {
      setIsDownloading(false)
    }
  }

  const pageUrl = typeof window !== "undefined" ? window.location.href : ""
  // Shares this certificate's search page (not the recipient's own PDF), so colleagues
  // from the same event can find theirs
  const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(
    `I got my ${certType?.name ? `${certType.name} ` : ""}certificate for ${event?.name || "the event"}. Download yours here: ${pageUrl}`
  )}`
  const recordWhatsappShare = () => {
    if (!selectedRecipient) return
    trackClick({ kind: "whatsapp", recipientId: selectedRecipient.id })
  }

  // ---------- states ----------
  if (loading) {
    return (
      <Shell>
        <div className="w-full max-w-md mx-auto rounded-lg border border-neutral-200 bg-white p-6 sm:p-8 space-y-4">
          <div className="h-3.5 w-40 rounded bg-neutral-100 animate-pulse" />
          <div className="h-6 w-56 rounded bg-neutral-200 animate-pulse" />
          <div className="h-10 w-full rounded-md bg-neutral-100 animate-pulse mt-6" />
          <div className="h-10 w-full rounded-md bg-neutral-200 animate-pulse" />
        </div>
      </Shell>
    )
  }

  if (error || !certType) {
    return (
      <Shell>
        <div className="w-full max-w-md mx-auto rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-neutral-900">This certificate link is not available</h1>
          <p className="text-sm text-neutral-600 mt-2">{error || "This certificate page could not be loaded."}</p>
          <p className="text-sm text-neutral-500 mt-4">If an organizer sent you this link, ask them to check that the certificate is still active.</p>
        </div>
      </Shell>
    )
  }

  const Field = FIELD_META[searchField]
  const showPreview = step === "preview" && !!selectedRecipient

  return (
    <Shell typeId={typeId}>
      <div className="w-full max-w-md mx-auto rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          {step === "search" && (
            <form onSubmit={handleSearch} noValidate>
              <p className="text-sm text-neutral-500">{event?.name}</p>
              <h1 className="text-xl font-semibold text-neutral-900 mt-1">{certType.name} certificate</h1>
              <p className="text-sm text-neutral-600 mt-3">Enter the details you registered with to download your certificate.</p>

              <div className="mt-6 space-y-4">
                {enabledFields.length > 1 && (
                  <div>
                    <label className="block text-[13px] font-medium text-neutral-700 mb-1.5">Search by</label>
                    <div className="inline-flex rounded-md border border-neutral-200 p-0.5 bg-neutral-50" role="radiogroup" aria-label="Search by">
                      {enabledFields.map((key) => {
                        const active = key === searchField
                        return (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setSearchField(key); setSearchValue(""); setSearchError(null) }}
                            className={cn(
                              "h-8 px-3 rounded text-[13px] font-medium transition-colors",
                              active ? "bg-white text-neutral-900 shadow-sm border border-neutral-200" : "text-neutral-500 hover:text-neutral-900"
                            )}
                          >
                            {key === "name" ? "Name" : key === "email" ? "Email" : key === "mobile" ? "Mobile" : "Reg. no."}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label htmlFor="search-value" className="block text-[13px] font-medium text-neutral-700 mb-1.5">{Field.label}</label>
                  <Input
                    id="search-value"
                    type={searchField === "email" ? "email" : "text"}
                    inputMode={Field.inputMode}
                    autoComplete={searchField === "email" ? "email" : searchField === "mobile" ? "tel" : searchField === "name" ? "name" : "off"}
                    placeholder={Field.placeholder}
                    value={searchValue}
                    onChange={(e) => { setSearchValue(e.target.value); if (searchError) setSearchError(null) }}
                    aria-invalid={!!searchError}
                    aria-describedby={searchError ? "search-error" : undefined}
                    autoFocus
                    className={cn(
                      "h-10 px-3 text-[15px] rounded-md bg-white border-neutral-300 focus-visible:ring-2 focus-visible:ring-neutral-900/10 focus-visible:border-neutral-900 placeholder:text-neutral-400",
                      searchError && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10"
                    )}
                  />
                  {searchError && <p id="search-error" className="text-[13px] text-red-600 mt-1.5">{searchError}</p>}
                </div>

                <Button type="submit" className="w-full h-10 rounded-md text-sm bg-neutral-900 hover:bg-black disabled:opacity-100" disabled={isSearching}>
                  {isSearching ? <Loader2 className="h-4 w-4 animate-spin" /> : "Find certificate"}
                </Button>
              </div>
            </form>
          )}

          {step === "select" && (
            <div>
              <button type="button" onClick={handleBack} className="inline-flex items-center gap-0.5 text-[13px] text-neutral-500 hover:text-neutral-900 -ml-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <h1 className="text-xl font-semibold text-neutral-900 mt-3">Select your name</h1>
              <p className="text-sm text-neutral-600 mt-1">{matchedRecipients.length} records match. Contact details are partly hidden.</p>

              <ul className="mt-5 rounded-md border border-neutral-200 divide-y divide-neutral-200">
                {matchedRecipients.map((r) => (
                  <li key={r.id}>
                    <button
                      type="button"
                      onClick={() => handleSelectRecipient(r)}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-neutral-50 transition-colors"
                    >
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-medium text-neutral-900 truncate">{r.name}</span>
                        <span className="block text-[13px] text-neutral-500 truncate">{r.email || r.mobile || "Registered participant"}</span>
                      </span>
                      {r.regNo && <span className="hidden sm:block text-xs font-mono text-neutral-500">{r.regNo}</span>}
                      <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* The preview is mounted (hidden) from the start, so its design image has already
              loaded and decoded by the time it opens; nothing pops in after the switch */}
          {/* Hidden with zero height rather than display:none: it keeps the card's width, so the
              name is already measured at the right size when the preview opens */}
          <div className={showPreview ? undefined : "h-0 overflow-hidden"} aria-hidden={!showPreview} inert={!showPreview}>
            {selectedRecipient && (<>
              <button type="button" onClick={handleBack} className="inline-flex items-center gap-0.5 text-[13px] text-neutral-500 hover:text-neutral-900 -ml-1">
                <ChevronLeft className="h-4 w-4" /> Back
              </button>
              <h1 className="text-xl font-semibold text-neutral-900 mt-3 truncate">{selectedRecipient.name}</h1>
              <p className="text-sm text-neutral-600 mt-1">{certType.name} certificate · {event?.name}</p>
              {selectedRecipient.regNo && <p className="text-xs font-mono text-neutral-500 mt-0.5">{selectedRecipient.regNo}</p>}
            </>)}

              <div className="mt-5">
                {!certType.templateImage ? (
                  <div className="rounded-md border border-neutral-200 bg-neutral-50 p-6">
                    <p className="text-sm text-neutral-600">The certificate design is not available yet. Please check back later.</p>
                  </div>
                ) : (
                  <div className="relative w-full flex justify-center overflow-hidden">
                    {/* Placeholder in the design's proportions until it is on screen, so the card does not jump */}
                    {!templateShown && (
                      <div
                        className="w-full rounded-sm border border-neutral-200 bg-neutral-100 animate-pulse"
                        style={{ aspectRatio: templateSize ? `${templateSize.w} / ${templateSize.h}` : "1.414 / 1", maxHeight: "60vh" }}
                      />
                    )}
                    <div className={cn("relative inline-block max-w-full border border-neutral-200 bg-white select-none", !templateShown && "absolute top-0 opacity-0")}>
                      <img
                        ref={previewImgRef}
                        src={certType.templateImage}
                        alt={`${certType.name} certificate`}
                        className="block w-auto max-w-full h-auto pointer-events-none"
                        draggable={false}
                        style={{ maxHeight: "60vh" }}
                        onLoad={() => setTemplateShown(true)}
                        onError={() => toast.error("Could not load the certificate design")}
                      />
                      <div className={cn("absolute inset-0", !templateShown && "invisible")}>
                      <div className="absolute pointer-events-none" style={{ left: `${certType.textPosition.x}%`, top: `${certType.textPosition.y}%`, transform: "translate(-50%, -50%)" }}>
                        <span
                          className="whitespace-nowrap leading-none select-none"
                          style={{
                            fontSize: `${(certType.fontSize || 24) * textScale}px`,
                            fontFamily: `"${certType.fontFamily || "Arial"}", sans-serif`,
                            fontWeight: certType.fontBold ? "bold" : "normal",
                            fontStyle: certType.fontItalic ? "italic" : "normal",
                            color: certType.fontColor || "#000"
                          }}
                        >
                          {transformText(selectedRecipient?.name || "", certType.textCase)}
                        </span>
                      </div>
                      {certType.customFields?.map((field, i) => {
                        const value = field.variable === "EMAIL" ? selectedRecipient?.email : field.variable === "MOBILE" ? selectedRecipient?.mobile : field.variable === "REG_NO" ? selectedRecipient?.certificateId : ""
                        if (!value) return null
                        return (
                          <div key={i} className="absolute pointer-events-none" style={{ left: `${field.position.x}%`, top: `${field.position.y}%`, transform: "translate(-50%, -50%)" }}>
                            <span
                              className="whitespace-nowrap leading-none select-none"
                              style={{
                                fontSize: `${(field.fontSize || 24) * textScale}px`,
                                fontFamily: `"${field.fontFamily || "Arial"}", sans-serif`,
                                fontWeight: field.fontBold ? "bold" : "normal",
                                fontStyle: field.fontItalic ? "italic" : "normal",
                                color: field.fontColor || "#000"
                              }}
                            >
                              {value}
                            </span>
                          </div>
                        )
                      })}
                      {certType.signatures?.map((sig, i) => {
                        const pos = sig.position || { x: sig.x ?? 50, y: sig.y ?? 50 }
                        return (
                          <div key={i} className="absolute pointer-events-none" style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: "translate(-50%, -50%)", width: `${sig.width || 20}%` }}>
                            <img src={sig.image} alt="" className="w-full h-auto object-contain select-none" draggable={false} />
                          </div>
                        )
                      })}
                      {!downloaded && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <span className="text-4xl md:text-6xl font-bold text-neutral-900/[0.05] rotate-[-30deg] select-none tracking-widest">PREVIEW</span>
                        </div>
                      )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-5">
                <Button type="button" onClick={handleDownload} disabled={isDownloading} className="w-full h-10 rounded-md text-sm bg-neutral-900 hover:bg-black disabled:opacity-100">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : downloaded ? "Download again" : "Download PDF"}
                </Button>
                {/* Shown next to Download, not only after it: on phones the PDF opens in a new tab
                    and many recipients never come back to this one */}
                {selectedRecipient && <LinkedInAddButton
                  className="mt-2.5"
                  variant={downloaded ? "solid" : "outline"}
                  recipientId={selectedRecipient.id}
                  name={`${certType.name} certificate - ${event?.name || ""}`.replace(/ - $/, "")}
                  organizationName={event?.organization || event?.name || ""}
                  issuedAt={selectedRecipient.issuedAt}
                  certUrl={selectedRecipient.regNo ? individualCertificateUrl(window.location.origin, eventId, selectedRecipient.regNo) : pageUrl}
                  certId={selectedRecipient.regNo}
                />}
                <a
                  href={whatsappUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={recordWhatsappShare}
                  className="mt-2.5 inline-flex w-full items-center justify-center gap-2 h-10 rounded-md text-sm font-medium text-[#128C4A] bg-white border border-[#25D366]/50 hover:bg-[#25D366]/5 hover:border-[#25D366] transition-colors"
                >
                  <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-current">
                    <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.64-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.07-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.5h-.57c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48s1.07 2.88 1.21 3.08c.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.7.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35zM12.04 21.5h-.01a9.45 9.45 0 0 1-4.82-1.32l-.35-.2-3.58.93.96-3.49-.23-.36a9.43 9.43 0 0 1-1.45-5.03c0-5.22 4.25-9.47 9.48-9.47 2.53 0 4.91.99 6.7 2.78a9.4 9.4 0 0 1 2.77 6.7c0 5.23-4.25 9.47-9.47 9.47zm8.06-17.53A11.33 11.33 0 0 0 12.04.63C5.76.63.65 5.74.65 12.02c0 2.01.52 3.97 1.52 5.7L.55 23.63l6.05-1.59a11.36 11.36 0 0 0 5.44 1.39h.01c6.28 0 11.39-5.11 11.39-11.39 0-3.04-1.18-5.9-3.34-8.06z" />
                  </svg>
                  Share on WhatsApp
                </a>
                {downloaded ? (
                  <p className="text-[13px] text-neutral-600 mt-3">
                    Downloaded. Add it to your LinkedIn profile too; it takes 30 seconds. On a phone the PDF may open in a new tab; use the save or share option there.
                  </p>
                ) : (
                  <p className="text-[13px] text-neutral-500 mt-3">The downloaded PDF is print quality and has no watermark.</p>
                )}
              </div>
          </div>
      </div>
    </Shell>
  )
}

// Growth-loop counters on the public page; fire-and-forget so a link never waits on them
function trackClick(body: Record<string, string>) {
  fetch("/api/download/track", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    keepalive: true
  }).catch(() => {})
}

function Shell({ children, typeId }: { children: React.ReactNode; typeId?: string }) {
  // Clicks on any CertiStage link here are how recipients become organisers; count them per certificate
  const recordCta = () => { if (typeId) trackClick({ kind: "cta", typeId }) }
  return (
    <div className="min-h-screen flex flex-col bg-[#F6F6F4] text-neutral-900">
      <header>
        <div className="max-w-5xl mx-auto px-5 h-20 flex items-center justify-center">
          <a href="https://www.certistage.com?utm_source=download_page&utm_medium=header" target="_blank" rel="noopener" onClick={recordCta} className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-[20px] tracking-tight">CertiStage</span>
          </a>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-6 md:py-12">
        {children}
      </main>
      <footer>
        <div className="max-w-5xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-1.5 text-[13px] text-neutral-500">
          <p>
            Powered by{" "}
            <a href="https://www.certistage.com?utm_source=download_page&utm_medium=footer" target="_blank" rel="noopener" onClick={recordCta} className="text-neutral-900 hover:underline underline-offset-4">CertiStage</a>
          </p>
          <a href="https://www.certistage.com?utm_source=download_page&utm_medium=footer_cta" target="_blank" rel="noopener" onClick={recordCta} className="hover:text-neutral-900">
            Issue certificates for your own event or institute
          </a>
        </div>
      </footer>
    </div>
  )
}
