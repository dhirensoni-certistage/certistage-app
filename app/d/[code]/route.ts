import { NextRequest, NextResponse } from "next/server"
import connectDB from "@/lib/mongodb"
import CertificateType from "@/models/CertificateType"

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ code: string }> }
) {
    try {
        const { code } = await params

        if (!code) {
            return NextResponse.json({ error: "Code required" }, { status: 400 })
        }

        await connectDB()

        const certType = await CertificateType.findOne({ shortCode: code }).lean()

        if (!certType) {
            return NextResponse.json({ error: "Link not found or expired" }, { status: 404 })
        }

        // Redirect to the full download page
        // Pattern: /download/[eventId]/[typeId]
        const url = new URL(request.url)
        const redirectUrl = `${url.origin}/download/${certType.eventId}/${certType._id}`

        return NextResponse.redirect(redirectUrl)
    } catch (error) {
        console.error("Short link redirect error:", error)
        return NextResponse.json({ error: "Internal server error" }, { status: 500 })
    }
}
