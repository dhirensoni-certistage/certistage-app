"use client"

import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "next/navigation"

interface Recipient {
  id: string
  name: string
  email?: string
  mobile?: string
  certificateId: string
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

export default function EmbeddedPreviewPage() {
  const searchParams = useSearchParams()
  const eventId = searchParams.get("event")
  const certId = searchParams.get("cert")

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [recipient, setRecipient] = useState<Recipient | null>(null)
  const [certType, setCertType] = useState<CertificateType | null>(null)
  const [imageSize, setImageSize] = useState<{ width: number; height: number } | null>(null)
  const [scale, setScale] = useState(1)
  const containerRef = useRef<HTMLDivElement>(null)

  // Transform text based on textCase setting
  const transformText = (text: string, textCase?: string): string => {
    if (!textCase || textCase === "none") return text
    switch (textCase) {
      case "uppercase":
        return text.toUpperCase()
      case "lowercase":
        return text.toLowerCase()
      case "capitalize":
        return text
          .split(" ")
          .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ")
      default:
        return text
    }
  }

  useEffect(() => {
    if (!eventId || !certId) {
      setError("Invalid certificate link.")
      setLoading(false)
      return
    }

    const fetchData = async () => {
      try {
        const res = await fetch(`/api/download?event=${eventId}&cert=${certId}`)
        const data = await res.json()
        if (!res.ok) {
          setError(data.error || "Certificate not found.")
          setLoading(false)
          return
        }
        setRecipient(data.recipient)
        setCertType(data.certificateType)
        setLoading(false)
      } catch {
        setError("Failed to load certificate.")
        setLoading(false)
      }
    }

    fetchData()
  }, [eventId, certId])

  useEffect(() => {
    const html = document.documentElement
    const body = document.body
    const prevHtmlOverflow = html.style.overflow
    const prevBodyOverflow = body.style.overflow
    const prevHtmlHeight = html.style.height
    const prevBodyHeight = body.style.height
    html.style.overflow = "hidden"
    body.style.overflow = "hidden"
    html.style.height = "100%"
    body.style.height = "100%"
    return () => {
      html.style.overflow = prevHtmlOverflow
      body.style.overflow = prevBodyOverflow
      html.style.height = prevHtmlHeight
      body.style.height = prevBodyHeight
    }
  }, [])

  useEffect(() => {
    if (!certType?.templateImage) return
    const img = new Image()
    img.onload = () => {
      if (img.naturalWidth && img.naturalHeight) {
        setImageSize({ width: img.naturalWidth, height: img.naturalHeight })
      }
    }
    img.src = certType.templateImage
  }, [certType?.templateImage])

  useEffect(() => {
    if (!containerRef.current || !imageSize) return
    const updateScale = () => {
      if (!containerRef.current) return
      const { clientWidth, clientHeight } = containerRef.current
      if (!clientWidth || !clientHeight) return
      const fitScale = Math.min(clientWidth / imageSize.width, clientHeight / imageSize.height)
      setScale(Number((fitScale * 0.9).toFixed(4)))
    }

    updateScale()
    const ro = new ResizeObserver(updateScale)
    ro.observe(containerRef.current)
    return () => ro.disconnect()
  }, [imageSize])

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-xs text-neutral-500">Loading preview...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-white">
        <div className="text-xs text-neutral-500">{error}</div>
      </div>
    )
  }

  return (
    <div className="h-full w-full bg-[#F7F7F8] p-2 overflow-hidden">
      <div className="h-full w-full rounded-xl border border-neutral-200 bg-white p-2 flex flex-col overflow-hidden">
        <div
          ref={containerRef}
          className="flex-1 min-h-0 overflow-hidden rounded-lg bg-neutral-50 border border-neutral-200 p-2"
        >
          {certType?.templateImage ? (
            <div className="w-full h-full flex items-center justify-center">
              <div
                className="relative"
                style={{
                  width: imageSize?.width ? `${imageSize.width}px` : "auto",
                  height: imageSize?.height ? `${imageSize.height}px` : "auto",
                  transform: `scale(${scale})`,
                  transformOrigin: "center",
                }}
              >
                <img
                  src={certType.templateImage}
                  alt="Certificate"
                  className="block rounded-lg shadow-sm"
                  draggable={false}
                  style={{
                    width: "100%",
                    height: "100%",
                  }}
                />

              {certType.showNameField !== false && (
                <div
                  className="absolute pointer-events-none"
                  style={{
                    left: `${certType.textPosition.x}%`,
                    top: `${certType.textPosition.y}%`,
                    transform: "translate(-50%, -50%)",
                    transformOrigin: "center",
                  }}
                >
                  <span
                    className="whitespace-nowrap leading-none select-none"
                    style={{
                      fontSize: `${Math.max(8, certType.fontSize || 24)}px`,
                      fontFamily: `"${certType.fontFamily || "Arial"}", sans-serif`,
                      fontWeight: certType.fontBold ? "bold" : "normal",
                      fontStyle: certType.fontItalic ? "italic" : "normal",
                      color: "#000",
                    }}
                  >
                    {transformText(recipient?.name || "", certType.textCase)}
                  </span>
                </div>
              )}

              {certType.customFields?.map((field: any, i: number) => {
                let value = ""
                switch (field.variable) {
                  case "EMAIL":
                    value = recipient?.email || ""
                    break
                  case "MOBILE":
                    value = recipient?.mobile || ""
                    break
                  case "REG_NO":
                    value = recipient?.certificateId || ""
                    break
                  default:
                    value = `{{${field.variable}}}`
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
                      transformOrigin: "center",
                    }}
                  >
                    <span
                      className="whitespace-nowrap leading-none select-none"
                      style={{
                        fontSize: `${Math.max(8, field.fontSize || 24)}px`,
                        fontFamily: `"${field.fontFamily || "Arial"}", sans-serif`,
                        fontWeight: field.fontBold ? "bold" : "normal",
                        fontStyle: field.fontItalic ? "italic" : "normal",
                        color: "#000",
                      }}
                    >
                      {value}
                    </span>
                  </div>
                )
              })}
              </div>
            </div>
          ) : (
            <div className="text-xs text-neutral-500">Certificate template not available</div>
          )}
        </div>
      </div>
    </div>
  )
}
