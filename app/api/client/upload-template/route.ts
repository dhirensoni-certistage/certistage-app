import { NextRequest, NextResponse } from "next/server"
import { v2 as cloudinary } from 'cloudinary'
import connectDB from "@/lib/mongodb"
import CertificateType from "@/models/CertificateType"
import Event from "@/models/Event"

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

// POST - Upload template image to Cloudinary
export async function POST(request: NextRequest) {
  try {
    await connectDB()
    
    const { userId, typeId, imageData } = await request.json()
    
    if (!userId || !typeId || !imageData) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    // Verify ownership
    const certType = await CertificateType.findById(typeId)
    if (!certType) {
      return NextResponse.json({ error: "Certificate type not found" }, { status: 404 })
    }

    const event = await Event.findById(certType.eventId)
    if (!event || event.ownerId.toString() !== userId) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 })
    }

    // Upload to Cloudinary
    const uploadResult = await new Promise<any>((resolve, reject) => {
      cloudinary.uploader.upload(imageData, {
        folder: `certistage/templates/${userId}`,
        resource_type: 'image',
        transformation: [
          { width: 1200, height: 900, crop: 'limit' },
          { quality: 'auto:good' }
        ]
      }, (error, result) => {
        if (error) reject(error)
        else resolve(result)
      })
    })

    // Update certificate type with Cloudinary URL
    await CertificateType.findByIdAndUpdate(typeId, {
      templateImage: uploadResult.secure_url
    })

    return NextResponse.json({
      success: true,
      url: uploadResult.secure_url,
      publicId: uploadResult.public_id
    })
  } catch (error) {
    console.error("Template upload error:", error)
    return NextResponse.json({ error: "Failed to upload template" }, { status: 500 })
  }
}
