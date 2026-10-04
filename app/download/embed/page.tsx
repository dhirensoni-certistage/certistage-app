"use client"

import { useEffect, useRef, useState } from "react"
import { applyTextCase, fieldValue } from "@/lib/certificate-fields"
import { textScaleFor } from "@/lib/certificate-text"
import { useSearchParams } from "next/navigation"

interface Recipient {
  id: string
  name: string
  email?: string
  mobile?: string
  certificateId: string
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
  fontItalic: boolean
  fontColor?: string
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
  // Image renders at its natural size here, so text scales by natural width vs the PDF page width
  const textScale = imageSize ? textScaleFor(imageSize.width, imageSize.width, imageSize.height) : 1
  const containerRef = useRef<HTMLDivElement>(null)

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
                      fontSize: `${(certType.fontSize || 24) * textScale}px`,
                      fontFamily: `"${certType.fontFamily || "Arial"}", sans-serif`,
                      fontWeight: certType.fontBold ? "bold" : "normal",
                      fontStyle: certType.fontItalic ? "italic" : "normal",
                      color: certType.fontColor || "#000",
                    }}
                  >
                    {applyTextCase(recipient?.name || "", certType.textCase)}
                  </span>
                </div>
              )}

              {certType.customFields?.map((field: any, i: number) => {
                const value = applyTextCase(fieldValue(field.variable, recipient), field.textCase)
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
                        fontSize: `${(field.fontSize || 24) * textScale}px`,
                        fontFamily: `"${field.fontFamily || "Arial"}", sans-serif`,
                        fontWeight: field.fontBold ? "bold" : "normal",
                        fontStyle: field.fontItalic ? "italic" : "normal",
                        color: field.fontColor || "#000",
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
