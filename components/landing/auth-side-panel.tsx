import Link from "next/link"
import Image from "next/image"
import { Award, FileSpreadsheet, Search, BarChart3 } from "lucide-react"

const BENEFITS = [
  { icon: FileSpreadsheet, title: "Import names from Excel", desc: "Thousands of recipients in one upload." },
  { icon: Search, title: "Recipients download their own certificate", desc: "One link. No emailing PDFs one by one." },
  { icon: BarChart3, title: "See who has downloaded", desc: "Live count of downloaded and pending, per certificate type." }
]

/** Left-hand brand panel shared by the signup and login pages (desktop only). */
export function AuthSidePanel({ headline, footnote }: { headline: string; footnote: string }) {
  return (
    <div className="hidden lg:flex w-[52%] relative flex-col justify-between overflow-hidden bg-[#F7F6F2] border-r border-[#E5E5E5] p-14">
      <div
        className="absolute inset-0 z-0 opacity-[0.35]"
        style={{ backgroundImage: "radial-gradient(#D4D4D4 1px, transparent 1px)", backgroundSize: "24px 24px" }}
      />

      <Link href="/" className="relative z-10 inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity w-fit">
        <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} className="w-9 h-9" />
        <span className="font-semibold tracking-tight text-xl text-black">CertiStage</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <h1 className="text-[30px] font-semibold tracking-tight leading-tight text-black mb-8">{headline}</h1>

        {/* Compact certificate preview */}
        <div className="relative rounded-lg border border-[#E5E5E5] bg-[#fffdf8] shadow-[0_16px_40px_-16px_rgba(0,0,0,0.18)] p-6 mb-8">
          <div className="absolute inset-2.5 border-2 border-gold/60 rounded-sm pointer-events-none" />
          <div className="relative text-center">
            <div className="text-[9px] tracking-[0.3em] uppercase text-neutral-500 mb-1">Your organization</div>
            <div className="font-serif text-xl text-neutral-900 mb-2">Certificate of Participation</div>
            <div className="inline-flex rounded border-2 border-dashed border-gold bg-gold-soft px-3 py-0.5 font-serif text-base text-neutral-900 mb-3">
              {"{{NAME}}"}
            </div>
            <div className="flex items-end justify-between px-2 mt-1">
              <div className="w-14 border-t border-neutral-400" />
              <div className="h-8 w-8 rounded-full bg-gold ring-4 ring-gold/30 flex items-center justify-center">
                <Award className="h-4 w-4 text-neutral-900" />
              </div>
              <div className="w-14 border-t border-neutral-400" />
            </div>
          </div>
        </div>

        <ul className="space-y-4">
          {BENEFITS.map((b) => (
            <li key={b.title} className="flex items-start gap-3">
              <div className="h-8 w-8 rounded-md bg-white border border-[#E5E5E5] flex items-center justify-center text-gold-deep shrink-0">
                <b.icon className="h-4 w-4" />
              </div>
              <div>
                <div className="text-sm font-semibold text-black">{b.title}</div>
                <div className="text-xs text-[#666] mt-0.5">{b.desc}</div>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <p className="relative z-10 text-[11px] font-medium text-[#888] uppercase tracking-widest text-center">{footnote}</p>
    </div>
  )
}

/** Small logo bar shown above auth forms on phones, where the side panel is hidden. */
export function AuthMobileBar({ linkLabel, linkHref }: { linkLabel: string; linkHref: string }) {
  return (
    <div className="lg:hidden w-full flex items-center justify-between mb-8">
      <Link href="/" className="inline-flex items-center gap-2 hover:opacity-80 transition-opacity">
        <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} className="w-7 h-7" />
        <span className="font-semibold tracking-tight text-black">CertiStage</span>
      </Link>
      <Link href={linkHref} className="text-[13px] font-medium text-black hover:underline underline-offset-4">
        {linkLabel}
      </Link>
    </div>
  )
}
