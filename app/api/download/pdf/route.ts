import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import Event from "@/models/Event"
import CertificateType from "@/models/CertificateType"
import Recipient from "@/models/Recipient"

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
    const templateBase64 = Buffer.from(templateBuffer).toString('base64')
    const templateMimeType = templateResponse.headers.get('content-type') || 'image/jpeg'

    // Generate PDF using jsPDF (server-side compatible)
    const { jsPDF } = await import('jspdf')

    // Create canvas-like rendering using sharp or just use the image directly
    // For server-side, we'll create PDF with the template and overlay text

    // Get image dimensions (approximate for PDF sizing)
    const pdfWidth = 297 // A4 landscape width in mm
    const pdfHeight = 210 // A4 landscape height in mm

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: [pdfWidth, pdfHeight],
    })

    // Add template image
    const imgFormat = templateMimeType.includes('png') ? 'PNG' : 'JPEG'
    pdf.addImage(
      `data:${templateMimeType};base64,${templateBase64}`,
      imgFormat,
      0,
      0,
      pdfWidth,
      pdfHeight
    )

    // Add recipient name
    // Helper to render text with font mapping
    const renderText = (text: string, xPercent: number, yPercent: number, fontSizePx: number, fontFam: string, isBold: boolean, isItalic: boolean) => {
      const x = (xPercent / 100) * pdfWidth
      const y = (yPercent / 100) * pdfHeight

      // Use the exact font size from editor canvas (no conversion)
      // This ensures PDF matches exactly what user sees in editor
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

      pdf.setTextColor(0, 0, 0)
      // Use baseline: 'middle' to match HTML/CSS center alignment
      pdf.text(text, x, y, { align: 'center', baseline: 'middle' })
    }

    // Render Name
    if (certType.showNameField !== false) {
      const textX = certType.textPosition?.x || 50
      const textY = certType.textPosition?.y || 60
      const fs = certType.fontSize || 24

      let displayName = recipient.name
      const textCase = certType.textCase || 'none'
      switch (textCase) {
        case 'uppercase': displayName = displayName.toUpperCase(); break
        case 'lowercase': displayName = displayName.toLowerCase(); break
        case 'capitalize':
          displayName = displayName.split(' ').map((word: string) =>
            word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
          ).join(' ')
          break
      }

      renderText(displayName, textX, textY, fs, certType.fontFamily, certType.fontBold, certType.fontItalic)
    }

    // Render Custom Fields
    if (certType.customFields) {
      for (const field of certType.customFields) {
        let value = ""
        switch (field.variable) {
          case "EMAIL": value = recipient.email || ""; break
          case "MOBILE": value = recipient.mobile || ""; break
          case "REG_NO": value = recipient.regNo || recipient._id || ""; break // Match recipient model
          default: value = `{{${field.variable}}}` // Fallback
        }

        if (value) {
          renderText(
            value,
            field.position.x,
            field.position.y,
            field.fontSize || 24,
            field.fontFamily,
            field.fontBold,
            field.fontItalic
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
            const sharp = (await import('sharp')).default
            const imageBuffer = Buffer.from(sigBuffer)
            const metadata = await sharp(imageBuffer).metadata()
            const aspectRatio = metadata.width && metadata.height ? metadata.height / metadata.width : 0.3
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
