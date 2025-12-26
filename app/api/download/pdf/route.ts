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
    const textX = (certType.textPosition?.x || 50) * pdfWidth / 100
    const textY = (certType.textPosition?.y || 60) * pdfHeight / 100
    const fontSize = certType.fontSize || 24

    pdf.setFontSize(fontSize)
    pdf.setFont('helvetica', certType.fontBold ? 'bold' : 'normal')
    pdf.setTextColor(0, 0, 0)
    
    // Center align text
    pdf.text(recipient.name, textX, textY, { align: 'center' })

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
