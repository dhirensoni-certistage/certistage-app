"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams } from "next/navigation"
import Image from "next/image"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import { Download, Check, AlertCircle, Loader2, Search, ArrowLeft, ArrowRight, User, Mail, Phone, Hash, ChevronRight, Share2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

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
}

type Step = "search" | "select" | "preview"
type SearchKey = "name" | "email" | "mobile" | "regNo"

const FIELD_META: Record<SearchKey, { label: string; placeholder: string; icon: typeof User; inputMode: "text" | "email" | "tel" }> = {
  name: { label: "Name", placeholder: "Your full name, as registered", icon: User, inputMode: "text" },
  email: { label: "Email", placeholder: "you@example.com", icon: Mail, inputMode: "email" },
  mobile: { label: "Mobile", placeholder: "Registered mobile number", icon: Phone, inputMode: "tel" },
  regNo: { label: "Registration no.", placeholder: "e.g. DEL-0042", icon: Hash, inputMode: "text" }
}

const STEPS: { key: Step; label: string }[] = [
  { key: "search", label: "Find" },
  { key: "select", label: "Confirm" },
  { key: "preview", label: "Download" }
]

const transformText = (text: string, textCase?: string): string => {
  switch (textCase) {
    case "uppercase": return text.toUpperCase()
    case "lowercase": return text.toLowerCase()
    case "capitalize": return text.split(" ").map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(" ")
    default: return text
  }
}

const initials = (name: string) =>
  name.replace(/^(dr|mr|mrs|ms|prof)\.?\s+/i, "").split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("")

const stepVariants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 }
}

export default function CertTypeDownloadPage() {
  const params = useParams()
  const eventId = params.eventId as string
  const typeId = params.typeId as string
  const reduceMotion = useReducedMotion()

  const [loading, setLoading] = useState(true)
  const [event, setEvent] = useState<EventData | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [error, setError] = useState<string | null>(null)

  const [step, setStep] = useState<Step>("search")
  const [searchField, setSearchField] = useState<SearchKey>("name")
  const [searchValue, setSearchValue] = useState("")
  const [isSearching, setIsSearching] = useState(false)

  const [matchedRecipients, setMatchedRecipients] = useState<Recipient[]>([])
  const [selectedRecipient, setSelectedRecipient] = useState<Recipient | null>(null)

  const [isDownloading, setIsDownloading] = useState(false)
  const [downloaded, setDownloaded] = useState(false)

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
    downloadCount: r.downloadCount || 0
  })

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault()
    const value = searchValue.trim()
    if (value.length < 3) {
      toast.error(`Please enter at least 3 characters of your ${FIELD_META[searchField].label.toLowerCase()}`)
      return
    }
    setIsSearching(true)
    try {
      const res = await fetch("/api/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, typeId, searchQuery: value, searchType: searchField })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Search failed. Please try again.")
        return
      }
      if (!data.found || !data.recipients?.length) {
        toast.error("No certificate found for those details. Try another spelling, or the details you registered with.")
        return
      }
      const list: Recipient[] = data.recipients.map(mapRecipient)
      setMatchedRecipients(list)
      setDownloaded(false)
      if (list.length === 1) {
        setSelectedRecipient(list[0])
        setStep("preview")
      } else {
        setStep("select")
      }
    } catch {
      toast.error("Search failed. Please check your connection and try again.")
    } finally {
      setIsSearching(false)
    }
  }

  const handleSelectRecipient = (recipient: Recipient) => {
    setSelectedRecipient(recipient)
    setDownloaded(false)
    setStep("preview")
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

  const shareText = `I received my ${certType?.name || ""} certificate for ${event?.name || "the event"}.`
  const pageUrl = typeof window !== "undefined" ? window.location.href : ""
  const handleShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({ title: event?.name, text: shareText, url: pageUrl })
        return
      } catch {
        // user dismissed
        return
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(`${shareText} ${pageUrl}`)}`, "_blank", "noopener")
  }

  const stepIndex = STEPS.findIndex((s) => s.key === step)

  // ---------- states ----------
  if (loading) {
    return (
      <Shell>
        <div className="w-full max-w-lg mx-auto">
          <div className="h-8 w-2/3 mx-auto rounded bg-neutral-200 animate-pulse mb-3" />
          <div className="h-6 w-32 mx-auto rounded-full bg-neutral-200 animate-pulse mb-10" />
          <div className="rounded-2xl border border-neutral-200 bg-white p-8 space-y-4">
            <div className="h-5 w-40 rounded bg-neutral-200 animate-pulse" />
            <div className="h-12 w-full rounded-lg bg-neutral-100 animate-pulse" />
            <div className="h-12 w-full rounded-lg bg-neutral-200 animate-pulse" />
          </div>
        </div>
      </Shell>
    )
  }

  if (error || !certType) {
    return (
      <Shell>
        <div className="w-full max-w-md mx-auto rounded-2xl border border-neutral-200 bg-white p-10 text-center shadow-sm">
          <div className="h-14 w-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-5">
            <AlertCircle className="h-7 w-7 text-neutral-500" />
          </div>
          <h1 className="text-xl font-semibold text-neutral-900 mb-2">Certificate link not available</h1>
          <p className="text-sm text-neutral-600">{error || "This certificate page could not be loaded."}</p>
          <p className="text-xs text-neutral-500 mt-4">If you received this link from an organizer, ask them to check that the certificate is still active.</p>
        </div>
      </Shell>
    )
  }

  const Field = FIELD_META[searchField]

  return (
    <Shell>
      <div className="w-full max-w-lg mx-auto">
        {/* Event heading */}
        <motion.div
          initial={reduceMotion ? false : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          className="text-center mb-8"
        >
          <h1 className="text-[28px] md:text-[34px] font-bold tracking-tight text-neutral-900 leading-tight mb-3">{event?.name}</h1>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-gold-soft px-3 py-1 text-xs font-medium text-gold-deep">
            <span className="h-1.5 w-1.5 rounded-full bg-gold" />
            {certType.name} certificate
          </span>
        </motion.div>

        {/* Step indicator */}
        <ol className="flex items-center justify-center gap-2 mb-5" aria-label="Progress">
          {STEPS.map((s, i) => {
            const done = i < stepIndex
            const active = i === stepIndex
            return (
              <li key={s.key} className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-6 w-6 rounded-full text-[11px] font-semibold flex items-center justify-center border transition-colors",
                    active ? "bg-neutral-900 border-neutral-900 text-white" : done ? "bg-gold border-gold text-neutral-900" : "bg-white border-neutral-300 text-neutral-400"
                  )}
                >
                  {done ? <Check className="h-3 w-3" /> : i + 1}
                </span>
                <span className={cn("text-[12px]", active ? "text-neutral-900 font-medium" : "text-neutral-400")}>{s.label}</span>
                {i < STEPS.length - 1 && <span className="mx-1 h-px w-6 bg-neutral-300" />}
              </li>
            )
          })}
        </ol>

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 bg-white shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
          <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
          <div className="p-6 md:p-8">
            <AnimatePresence mode="wait" initial={false}>
              {step === "search" && (
                <motion.form key="search" onSubmit={handleSearch} variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} className="space-y-5" noValidate>
                  <div>
                    <h2 className="text-lg font-semibold text-neutral-900">Find your certificate</h2>
                    <p className="text-sm text-neutral-500 mt-1">Use the details you registered with.</p>
                  </div>

                  {enabledFields.length > 1 && (
                    <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Search by">
                      {enabledFields.map((key) => {
                        const meta = FIELD_META[key]
                        const active = key === searchField
                        return (
                          <button
                            key={key}
                            type="button"
                            role="radio"
                            aria-checked={active}
                            onClick={() => { setSearchField(key); setSearchValue("") }}
                            className={cn(
                              "inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full border text-[13px] font-medium transition-all",
                              active ? "bg-neutral-900 border-neutral-900 text-white" : "bg-white border-neutral-200 text-neutral-700 hover:border-gold/60"
                            )}
                          >
                            <meta.icon className="h-3.5 w-3.5" /> {meta.label}
                          </button>
                        )
                      })}
                    </div>
                  )}

                  <div className="relative">
                    <Field.icon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-neutral-400 pointer-events-none" />
                    <Input
                      type={searchField === "email" ? "email" : "text"}
                      inputMode={Field.inputMode}
                      autoComplete={searchField === "email" ? "email" : searchField === "mobile" ? "tel" : searchField === "name" ? "name" : "off"}
                      placeholder={Field.placeholder}
                      value={searchValue}
                      onChange={(e) => setSearchValue(e.target.value)}
                      aria-label={Field.label}
                      autoFocus
                      className="h-12 pl-11 pr-4 text-[15px] rounded-xl bg-white border-neutral-200 focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:border-gold placeholder:text-neutral-400"
                    />
                  </div>

                  <Button type="submit" size="lg" className="group w-full h-12 rounded-xl text-[15px] bg-neutral-900 hover:bg-black" disabled={isSearching}>
                    {isSearching ? (
                      <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Searching</>
                    ) : (
                      <><Search className="h-4 w-4 mr-2" /> Find my certificate <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>
                    )}
                  </Button>
                  <p className="text-xs text-neutral-400 text-center">Not found? Check your spelling or ask the organizer which details were used.</p>
                </motion.form>
              )}

              {step === "select" && (
                <motion.div key="select" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={handleBack} className="h-9 w-9 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shrink-0" aria-label="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div>
                      <h2 className="text-lg font-semibold text-neutral-900">Which one is you?</h2>
                      <p className="text-sm text-neutral-500 mt-0.5">{matchedRecipients.length} matches. Contact details are partly hidden for privacy.</p>
                    </div>
                  </div>
                  <ul className="space-y-2.5">
                    {matchedRecipients.map((r, i) => (
                      <motion.li key={r.id} initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i, duration: 0.25 }}>
                        <button
                          type="button"
                          onClick={() => handleSelectRecipient(r)}
                          className="group w-full flex items-center gap-3.5 p-4 rounded-xl border border-neutral-200 bg-white text-left hover:border-gold/60 hover:shadow-md hover:-translate-y-0.5 transition-all"
                        >
                          <span className="h-11 w-11 rounded-full bg-gold-soft border border-gold/30 text-gold-deep font-semibold text-sm flex items-center justify-center shrink-0">
                            {initials(r.name) || <User className="h-4 w-4" />}
                          </span>
                          <span className="flex-1 min-w-0">
                            <span className="block font-medium text-neutral-900 truncate">{r.name}</span>
                            <span className="block text-sm text-neutral-500 truncate">{r.email || r.mobile || "Registered participant"}</span>
                          </span>
                          {r.regNo && <span className="hidden sm:inline-flex rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-[11px] font-mono text-neutral-600">{r.regNo}</span>}
                          <ChevronRight className="h-4 w-4 text-neutral-400 group-hover:text-neutral-900 transition-colors shrink-0" />
                        </button>
                      </motion.li>
                    ))}
                  </ul>
                </motion.div>
              )}

              {step === "preview" && selectedRecipient && (
                <motion.div key="preview" variants={stepVariants} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.2 }} className="space-y-5">
                  <div className="flex items-start gap-3">
                    <button type="button" onClick={handleBack} className="h-9 w-9 rounded-full border border-neutral-200 flex items-center justify-center text-neutral-600 hover:bg-neutral-50 shrink-0" aria-label="Back">
                      <ArrowLeft className="h-4 w-4" />
                    </button>
                    <div className="min-w-0">
                      <h2 className="text-lg font-semibold text-neutral-900">{downloaded ? "Downloaded" : "Your certificate is ready"}</h2>
                      <p className="text-sm text-neutral-500 mt-0.5 truncate">
                        Issued to <span className="font-medium text-neutral-900">{selectedRecipient.name}</span>
                        {selectedRecipient.regNo && <span className="font-mono text-xs text-neutral-400"> · {selectedRecipient.regNo}</span>}
                      </p>
                    </div>
                  </div>

                  {/* Paper frame */}
                  <motion.div
                    initial={reduceMotion ? false : { opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                    className="rounded-xl bg-neutral-100 p-3 md:p-4"
                  >
                    {!certType.templateImage ? (
                      <div className="text-center p-8 rounded-lg bg-white border border-neutral-200">
                        <AlertCircle className="h-10 w-10 text-neutral-400 mx-auto mb-3" />
                        <p className="text-sm text-neutral-600">The certificate design is not available yet. Please check back later.</p>
                      </div>
                    ) : (
                      <div className="w-full flex justify-center">
                        <div className="relative inline-block max-w-full rounded-md overflow-hidden bg-white shadow-[0_20px_40px_-20px_rgba(0,0,0,0.35)] select-none">
                          <img
                            src={certType.templateImage}
                            alt={`${certType.name} certificate`}
                            className="block w-auto max-w-full h-auto pointer-events-none"
                            draggable={false}
                            style={{ maxHeight: "62vh" }}
                            onError={() => toast.error("Could not load the certificate design")}
                          />
                          <div className="absolute pointer-events-none" style={{ left: `${certType.textPosition.x}%`, top: `${certType.textPosition.y}%`, transform: "translate(-50%, -50%)" }}>
                            <span
                              className="whitespace-nowrap leading-none select-none"
                              style={{
                                fontSize: `clamp(8px, ${(certType.fontSize || 24) * 0.04}cqw, ${(certType.fontSize || 24) * 0.7}px)`,
                                fontFamily: `"${certType.fontFamily || "Arial"}", sans-serif`,
                                fontWeight: certType.fontBold ? "bold" : "normal",
                                fontStyle: certType.fontItalic ? "italic" : "normal",
                                color: certType.fontColor || "#000"
                              }}
                            >
                              {transformText(selectedRecipient.name, certType.textCase)}
                            </span>
                          </div>
                          {certType.customFields?.map((field, i) => {
                            const value = field.variable === "EMAIL" ? selectedRecipient.email : field.variable === "MOBILE" ? selectedRecipient.mobile : field.variable === "REG_NO" ? selectedRecipient.certificateId : ""
                            if (!value) return null
                            return (
                              <div key={i} className="absolute pointer-events-none" style={{ left: `${field.position.x}%`, top: `${field.position.y}%`, transform: "translate(-50%, -50%)" }}>
                                <span
                                  className="whitespace-nowrap leading-none select-none"
                                  style={{
                                    fontSize: `clamp(6px, ${(field.fontSize || 24) * 0.04}cqw, ${(field.fontSize || 24) * 0.7}px)`,
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
                              <span className="text-4xl md:text-6xl font-bold text-neutral-900/[0.06] rotate-[-30deg] select-none tracking-widest">PREVIEW</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>

                  {downloaded ? (
                    <motion.div initial={reduceMotion ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                      <div className="flex items-center gap-3 rounded-xl border border-gold/40 bg-gold-soft px-4 py-3">
                        <motion.span initial={reduceMotion ? false : { scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring", stiffness: 300, damping: 18 }} className="h-8 w-8 rounded-full bg-gold flex items-center justify-center shrink-0">
                          <Check className="h-4 w-4 text-neutral-900" />
                        </motion.span>
                        <div className="text-sm">
                          <p className="font-medium text-neutral-900">Your certificate PDF is on its way.</p>
                          <p className="text-neutral-600">On a phone it opens in a new tab; use the share or save option there.</p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Button type="button" variant="outline" onClick={handleDownload} disabled={isDownloading} className="h-11 rounded-xl">
                          {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-2" /> Download again</>}
                        </Button>
                        <Button type="button" onClick={handleShare} className="h-11 rounded-xl bg-neutral-900 hover:bg-black">
                          <Share2 className="h-4 w-4 mr-2" /> Share
                        </Button>
                      </div>
                    </motion.div>
                  ) : (
                    <Button type="button" size="lg" onClick={handleDownload} disabled={isDownloading} className="group w-full h-12 rounded-xl text-[15px] bg-neutral-900 hover:bg-black">
                      {isDownloading ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Preparing your PDF</>
                      ) : (
                        <><Download className="h-4 w-4 mr-2 text-gold-light" /> Download PDF <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>
                      )}
                    </Button>
                  )}
                  <p className="text-xs text-neutral-400 text-center">Print-quality PDF. The preview watermark is not on the download.</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </Shell>
  )
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col bg-[#FAFAF7] text-neutral-900">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 bg-[radial-gradient(60%_70%_at_50%_0%,rgba(200,150,30,0.14),transparent)]" />
      <header className="relative">
        <div className="max-w-5xl mx-auto px-5 h-16 flex items-center justify-between">
          <a href="https://www.certistage.com?utm_source=download_page&utm_medium=header" target="_blank" rel="noopener" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={30} height={30} />
            <span className="font-semibold text-[15px]">CertiStage</span>
          </a>
          <span className="text-[11px] uppercase tracking-[0.18em] text-neutral-400">Certificate portal</span>
        </div>
      </header>
      <main className="relative flex-1 flex items-start md:items-center justify-center px-4 py-8 md:py-10">
        {children}
      </main>
      <footer className="relative border-t border-neutral-200/80 bg-white/60">
        <div className="max-w-5xl mx-auto px-5 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <p className="text-sm text-neutral-500">
            Powered by{" "}
            <a href="https://www.certistage.com?utm_source=download_page&utm_medium=footer" target="_blank" rel="noopener" className="font-semibold text-neutral-900 hover:text-gold-deep transition-colors">CertiStage</a>
          </p>
          <a href="https://www.certistage.com?utm_source=download_page&utm_medium=footer_cta" target="_blank" rel="noopener" className="text-xs text-neutral-500 hover:text-neutral-900 inline-flex items-center gap-1">
            Issue certificates for your own event, college or course <ArrowRight className="h-3 w-3" />
          </a>
        </div>
      </footer>
    </div>
  )
}
