import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import User from "@/models/User"
import cloudinary from "@/lib/cloudinary"
import { requireClientUser } from "@/lib/client-auth.server"

const MAX_BYTES = 2 * 1024 * 1024

// POST { imageData: data URL } - upload or replace the organisation logo (Settings > Download page branding)
export async function POST(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    const { imageData } = await request.json().catch(() => ({}))
    if (typeof imageData !== "string" || !/^data:image\/(png|jpe?g|webp|svg\+xml);base64,/.test(imageData)) {
      return NextResponse.json({ error: "Upload a PNG, JPG, WebP or SVG image" }, { status: 400 })
    }
    if (imageData.length * 0.75 > MAX_BYTES) {
      return NextResponse.json({ error: "Logo must be under 2 MB" }, { status: 400 })
    }

    await connectDB()
    const user = await User.findById(auth.userId).select("logoPublicId")
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })

    const uploaded = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader.upload(imageData, {
        folder: `certistage/logos/${auth.userId}`,
        resource_type: "image",
        // Header logos never need more than this; keeps the download page light
        transformation: [{ width: 800, height: 320, crop: "limit" }, { quality: "auto:good" }]
      }, (error, result) => (error || !result ? reject(error || new Error("Upload failed")) : resolve(result)))
    })

    if (user.logoPublicId && user.logoPublicId !== uploaded.public_id) {
      cloudinary.uploader.destroy(user.logoPublicId).catch((e) => console.error("Old logo delete failed:", e))
    }
    await User.updateOne({ _id: auth.userId }, { $set: { logo: uploaded.secure_url, logoPublicId: uploaded.public_id } })
    return NextResponse.json({ success: true, logo: uploaded.secure_url })
  } catch (error) {
    console.error("Logo upload error:", error)
    return NextResponse.json({ error: "Failed to upload the logo" }, { status: 500 })
  }
}

// DELETE - remove the organisation logo
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireClientUser(request)
    if (auth.response) return auth.response
    await connectDB()
    const user = await User.findById(auth.userId).select("logoPublicId")
    if (!user) return NextResponse.json({ error: "Account not found" }, { status: 404 })
    if (user.logoPublicId) cloudinary.uploader.destroy(user.logoPublicId).catch((e) => console.error("Logo delete failed:", e))
    await User.updateOne({ _id: auth.userId }, { $unset: { logo: 1, logoPublicId: 1 } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Logo delete error:", error)
    return NextResponse.json({ error: "Failed to remove the logo" }, { status: 500 })
  }
}
