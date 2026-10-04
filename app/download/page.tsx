import Link from "next/link"
import Image from "next/image"
import { redirect } from "next/navigation"
import mongoose from "mongoose"
import connectDB from "@/lib/mongodb"
import Recipient from "@/models/Recipient"

// Personal certificate links (/download?event=<eventId>&cert=<registration no>) open the same
// download page as everyone else, with that recipient's certificate already showing. One page,
// one design: same PDF, LinkedIn and WhatsApp buttons, and counts.
export const dynamic = "force-dynamic"

export default async function PersonalCertificateLink({
  searchParams,
}: {
  searchParams: Promise<{ event?: string; cert?: string }>
}) {
  const { event, cert } = await searchParams

  if (event && cert && mongoose.isValidObjectId(event)) {
    let typeId: string | null = null
    try {
      await connectDB()
      const recipient = await Recipient.findOne({ eventId: event, regNo: cert })
        .select("certificateTypeId")
        .lean<{ certificateTypeId?: mongoose.Types.ObjectId }>()
      typeId = recipient?.certificateTypeId ? String(recipient.certificateTypeId) : null
    } catch (error) {
      console.error("Personal link lookup failed:", error)
    }
    // redirect() throws, so it stays outside the try/catch
    if (typeId) redirect(`/download/${event}/${typeId}?cert=${encodeURIComponent(cert)}`)
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#F6F6F4] text-neutral-900">
      <header>
        <div className="max-w-5xl mx-auto px-5 h-20 flex items-center justify-center">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} priority />
            <span className="font-semibold text-[20px] tracking-tight">CertiStage</span>
          </Link>
        </div>
      </header>
      <main className="flex-1 flex items-start justify-center px-4 py-6 md:py-12">
        <div className="w-full max-w-md mx-auto rounded-lg border border-neutral-200 bg-white p-6 sm:p-8">
          <h1 className="text-lg font-semibold text-neutral-900">This certificate link is not available</h1>
          <p className="text-sm text-neutral-600 mt-2">We could not find a certificate for this link. It may have been removed or typed incorrectly.</p>
          <p className="text-sm text-neutral-500 mt-4">If an organizer sent you this link, ask them for a new one.</p>
        </div>
      </main>
    </div>
  )
}
