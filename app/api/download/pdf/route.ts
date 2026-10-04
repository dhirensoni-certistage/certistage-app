import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"
import { applyTextCase, fieldValue } from "@/lib/certificate-fields"

// Convert a #RRGGBB / #RGB hex color to an RGB triple; anything else falls back to black
function hexToRgb(hex?: string): [number, number, number] {
  if (typeof hex !== "string") return [0, 0, 0]
  let value = hex.trim().replace(/^#/, "")
  if (/^[0-9a-fA-F]{3}$/.test(value)) value = value.split("").map((c) => c + c).join("")
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return [0, 0, 0]
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)]
}

// GET - Generate and serve PDF directly
export async function GET(request: NextRequest) {
  try {
    await connectDB()

    const { searchParams } = new URL(request.url)
    const recipientId = searchParams.get("recipientId")

    if (!recipientId) {
      return NextResponse.json({ error: "Recipient ID required" }, { status: 400 })
    }

    // Get recipient
    const recipient = await Recipient.findById(recipientId).lean()
    if (!recipient) {
      return NextResponse.json({ error: "Recipient not found" }, { status: 404 })
    }

    // Get certificate type and event
    const [certType, event] = await Promise.all([
      CertificateType.findById(recipient.certificateTypeId).lean(),
      Event.findById(recipient.eventId).lean()
    ])

    if (!event || !event.isActive) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 })
    }

    if (!certType || !certType.isActive) {
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    if (!certType.templateImage) {
      return NextResponse.json({ error: "Certificate template not found" }, { status: 404 })
    }

    // Fetch template image
    const templateResponse = await fetch(certType.templateImage)
    if (!templateResponse.ok) {
      return NextResponse.json({ error: "Failed to fetch template" }, { status: 500 })
    }

    const templateBuffer = await templateResponse.arrayBuffer()
    const templateBufferNode = Buffer.from(templateBuffer)
    const templateBase64 = templateBufferNode.toString('base64')
    const templateMimeType = templateResponse.headers.get('content-type') || 'image/jpeg'

    // Generate PDF using jsPDF (server-side compatible)
    const { jsPDF } = await import('jspdf')
    const templateDataUrl = `data:${templateMimeType};base64,${templateBase64}`

    // Resolve template dimensions without external native dependencies.
    let templateWidth = 1200
    let templateHeight = 900
    try {
      const probePdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: [297, 210] })
      const imageProps = probePdf.getImageProperties(templateDataUrl)
      if (imageProps?.width && imageProps?.height) {
        templateWidth = imageProps.width
        templateHeight = imageProps.height
      }
    } catch (dimensionError) {
      console.warn('Template dimension detection failed, using fallback ratio:', dimensionError)
    }

    // Preserve existing landscape behavior; auto-fit portrait templates.
    const isLandscapeTemplate = templateWidth >= templateHeight
    const pdfWidth = isLandscapeTemplate ? 297 : 210
    const pdfHeight = isLandscapeTemplate ? 210 : (templateHeight / templateWidth) * pdfWidth
    const orientation = pdfWidth >= pdfHeight ? 'landscape' : 'portrait'

    const pdf = new jsPDF({
      orientation,
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    })

    // Add template image
    const imgFormat = templateMimeType.includes('png') ? 'PNG' : 'JPEG'
    pdf.addImage(
      templateDataUrl,
      imgFormat,
      0,
      0,
      pdfWidth,
      pdfHeight
    )

    // Add recipient name
    // Helper to render text with font mapping
    const renderText = (text: string, xPercent: number, yPercent: number, fontSizePx: number, fontFam: string, isBold: boolean, isItalic: boolean, color?: string) => {
      const x = (xPercent / 100) * pdfWidth
      const y = (yPercent / 100) * pdfHeight

      // fontSize is stored in PDF points and drawn 1:1 on the A4 page. Every
      // on-screen preview scales the same number by (image width / page width),
      // see lib/certificate-text.ts, so the editor and the PDF agree.
      const fontSizePt = fontSizePx

      pdf.setFontSize(fontSizePt)

      // Map font families to jsPDF supported fonts
      // jsPDF only supports: helvetica, times, courier
      let pdfFont = 'helvetica' // default
      const fontLower = (fontFam || 'Helvetica').toLowerCase()
      
      if (fontLower.includes('times') || fontLower === 'times') {
        pdfFont = 'times'
      } else if (fontLower.includes('courier') || fontLower === 'courier') {
        pdfFont = 'courier'
      } else {
        pdfFont = 'helvetica' // Default for Helvetica or any other
      }

      // Font Style
      if (isBold && isItalic) pdf.setFont(pdfFont, 'bolditalic')
      else if (isBold) pdf.setFont(pdfFont, 'bold')
      else if (isItalic) pdf.setFont(pdfFont, 'italic')
      else pdf.setFont(pdfFont, 'normal')

      const [r, g, b] = hexToRgb(color)
      pdf.setTextColor(r, g, b)
      // Use baseline: 'middle' to match HTML/CSS center alignment
      pdf.text(text, x, y, { align: 'center', baseline: 'middle' })
    }

    // Render Name
    if (certType.showNameField !== false) {
      const textX = certType.textPosition?.x || 50
      const textY = certType.textPosition?.y || 60
      const fs = certType.fontSize || 24

      const displayName = applyTextCase(recipient.name, certType.textCase)

      renderText(displayName, textX, textY, fs, certType.fontFamily, certType.fontBold, certType.fontItalic, certType.fontColor)
    }

    // Render Custom Fields
    if (certType.customFields) {
      for (const field of certType.customFields) {
        // Built-in fields and Excel columns (see lib/certificate-fields); REG_NO falls back to the id
        const value = applyTextCase(fieldValue(field.variable, {
          email: recipient.email,
          mobile: recipient.mobile,
          regNo: recipient.regNo || String(recipient._id),
          customFields: recipient.customFields
        }), field.textCase)

        if (value) {
          renderText(
            value,
            field.position.x,
            field.position.y,
            field.fontSize || 24,
            field.fontFamily,
            field.fontBold,
            field.fontItalic,
            field.fontColor
          )
        }
      }
    }

    // Add signatures if present
    if (certType.signatures && certType.signatures.length > 0) {
      for (const signature of certType.signatures) {
        try {
          // Fetch signature image
          const sigResponse = await fetch(signature.image)
          if (sigResponse.ok) {
            const sigBuffer = await sigResponse.arrayBuffer()
            const sigBase64 = Buffer.from(sigBuffer).toString('base64')
            const sigMimeType = sigResponse.headers.get('content-type') || 'image/png'
            const sigFormat = sigMimeType.includes('png') ? 'PNG' : 'JPEG'

            // Calculate signature position and size
            const sigX = (signature.position.x / 100) * pdfWidth
            const sigY = (signature.position.y / 100) * pdfHeight
            const sigWidthMm = (signature.width / 100) * pdfWidth

            // Get actual image dimensions to maintain correct aspect ratio
            let aspectRatio = 0.3
            try {
              const sigDataUrl = `data:${sigMimeType};base64,${sigBase64}`
              const sigProps = pdf.getImageProperties(sigDataUrl)
              if (sigProps?.width && sigProps?.height) {
                aspectRatio = sigProps.height / sigProps.width
              }
            } catch (signatureDimensionError) {
              console.warn('Signature dimension detection failed, using fallback ratio:', signatureDimensionError)
            }
            const sigHeight = sigWidthMm * aspectRatio

            // Center the signature at the given position
            const centeredSigX = sigX - (sigWidthMm / 2)
            const centeredSigY = sigY - (sigHeight / 2)

            // Add signature image to PDF
            pdf.addImage(
              `data:${sigMimeType};base64,${sigBase64}`,
              sigFormat,
              centeredSigX,
              centeredSigY,
              sigWidthMm,
              sigHeight,
              undefined,
              'FAST'
            )
          }
        } catch (sigError) {
          console.error('Error adding signature:', sigError)
          // Continue with other signatures even if one fails
        }
      }
    }

    // Generate PDF buffer
    const pdfBuffer = Buffer.from(pdf.output('arraybuffer'))

    // Update download count
    await Recipient.findByIdAndUpdate(recipientId, {
      $inc: { downloadCount: 1 },
      $set: { lastDownloadAt: new Date() }
    })

    // Create filename - sanitize for headers
    const fileName = `${certType.name}-${recipient.regNo || recipient._id}.pdf`.replace(/[^a-zA-Z0-9.-]/g, '_')

    // Detect if iOS from request headers (User-Agent)
    const userAgent = request.headers.get('user-agent') || ''
    const isIOS = /iphone|ipad|ipod/i.test(userAgent)

    // Return PDF with proper headers for download
    // iOS: Use inline to show PDF viewer (user can share/save from there)
    // Others: Use attachment for direct download
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': isIOS
          ? `inline; filename="${fileName}"`
          : `attachment; filename="${fileName}"`,
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        // Additional headers for better compatibility
        'X-Content-Type-Options': 'nosniff',
        'Accept-Ranges': 'bytes',
      },
    })
  } catch (error) {
    console.error("PDF generation error:", error)
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 })
  }
}
