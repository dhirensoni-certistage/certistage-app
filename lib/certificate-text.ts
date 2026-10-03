"use client"

import { useCallback, useEffect, useState } from "react"

/**
 * One rule for text size on a certificate.
 *
 * A field's fontSize is stored in "PDF points": the PDF route draws it 1:1 on
 * an A4 page (841.89pt wide landscape, 595.28pt portrait). Every on-screen
 * preview scales the same number by (rendered image width / that page width),
 * so the editor, the public download page and the recipients preview all
 * match the PDF the recipient actually gets.
 */
export const PDF_PAGE_WIDTH_PT = { landscape: 841.89, portrait: 595.28 } as const

export function textScaleFor(renderedWidthPx: number, naturalWidth?: number, naturalHeight?: number): number {
  if (!renderedWidthPx || renderedWidthPx <= 0) return 1
  const landscape = !naturalWidth || !naturalHeight ? true : naturalWidth >= naturalHeight
  return renderedWidthPx / PDF_PAGE_WIDTH_PT[landscape ? "landscape" : "portrait"]
}

/**
 * Tracks a template <img>'s rendered width and returns the text scale for it.
 * Attach `ref` to the image. A callback ref is used so the scale is measured
 * whenever the image mounts (including after an enter animation) or changes.
 */
export function useTemplateTextScale(): { ref: (el: HTMLImageElement | null) => void; scale: number } {
  const [img, setImg] = useState<HTMLImageElement | null>(null)
  const [scale, setScale] = useState(1)
  const ref = useCallback((el: HTMLImageElement | null) => setImg(el), [])

  useEffect(() => {
    if (!img) {
      setScale(1)
      return
    }
    const measure = () => setScale(textScaleFor(img.clientWidth, img.naturalWidth, img.naturalHeight))
    measure()
    img.addEventListener("load", measure)
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(img)
    window.addEventListener("resize", measure)
    return () => {
      img.removeEventListener("load", measure)
      observer?.disconnect()
      window.removeEventListener("resize", measure)
    }
  }, [img])

  return { ref, scale }
}
