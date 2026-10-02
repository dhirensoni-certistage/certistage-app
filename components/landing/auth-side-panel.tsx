"use client"

import Link from "next/link"
import Image from "next/image"
import { motion, useReducedMotion } from "framer-motion"
import { Award, Check } from "lucide-react"
import { usePublicStats } from "@/hooks/use-public-stats"
import { formatApproxCount } from "@/lib/public-stats"

const BENEFITS = [
  "Import thousands of names from one Excel sheet",
  "Recipients find and download their own certificate",
  "Live view of who has downloaded and who is pending",
  "Works for conferences, convocations, courses and workshops"
]

/** Dark brand panel shared by the signup and login pages (desktop only). */
export function AuthSidePanel({ headline, footnote }: { headline: string; footnote: string }) {
  const stats = usePublicStats()
  const reduceMotion = useReducedMotion()
  const fade = (delay: number) =>
    reduceMotion
      ? {}
      : { initial: { opacity: 0, y: 16 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.6, delay, ease: [0.22, 1, 0.36, 1] as const } }

  return (
    <div className="hidden lg:flex w-[52%] relative flex-col justify-between overflow-hidden bg-neutral-950 text-white p-14">
      {/* Warm glow and fine grid */}
      <div className="absolute -top-40 -left-40 h-[520px] w-[520px] rounded-full bg-gold/20 blur-[120px] pointer-events-none" />
      <div className="absolute -bottom-48 right-0 h-[420px] w-[420px] rounded-full bg-gold/10 blur-[120px] pointer-events-none" />
      <div
        className="absolute inset-0 opacity-[0.12] pointer-events-none"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.4) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.4) 1px, transparent 1px)", backgroundSize: "48px 48px" }}
      />

      <Link href="/" className="relative z-10 inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity w-fit">
        <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} className="w-9 h-9" />
        <span className="font-semibold tracking-tight text-xl text-white">CertiStage</span>
      </Link>

      <div className="relative z-10 w-full max-w-md mx-auto">
        <motion.h1 {...fade(0.05)} className="text-[32px] font-semibold tracking-tight leading-[1.15] text-white mb-9">
          {headline}
        </motion.h1>

        {/* Certificate preview, slightly tilted like a card on a desk */}
        <motion.div {...fade(0.15)} className="relative mb-9">
          <div className="absolute inset-0 translate-x-3 translate-y-3 rounded-lg bg-white/5 border border-white/10" />
          <div className="relative -rotate-1 rounded-lg border border-gold/40 bg-[#fffdf8] shadow-[0_30px_60px_-20px_rgba(0,0,0,0.6)] p-6">
            <div className="absolute inset-2.5 border border-gold/50 rounded-sm pointer-events-none" />
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
        </motion.div>

        <motion.ul {...fade(0.25)} className="space-y-3">
          {BENEFITS.map((b) => (
            <li key={b} className="flex items-start gap-3 text-[14px] text-neutral-300">
              <span className="mt-0.5 h-5 w-5 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0">
                <Check className="h-3 w-3 text-gold-light" />
              </span>
              <span>{b}</span>
            </li>
          ))}
        </motion.ul>
      </div>

      <div className="relative z-10 flex items-center justify-between text-[12px] text-neutral-400">
        <span>{footnote}</span>
        {stats && (
          <span className="inline-flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-gold-light" />
            {formatApproxCount(stats.certificates)} certificates issued so far
          </span>
        )}
      </div>
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

/** Shared styles for auth form fields. */
export const authInputClass =
  "h-11 px-3.5 text-[14px] rounded-lg bg-white border-neutral-200 focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:border-gold transition-all placeholder:text-neutral-400"

export const authPrimaryButtonClass =
  "group w-full h-11 rounded-lg bg-neutral-900 text-white hover:bg-black font-medium text-[14px] shadow-sm shadow-neutral-900/10"

export const authGoogleButtonClass =
  "w-full h-11 rounded-lg bg-white border-neutral-200 text-neutral-800 hover:bg-neutral-50 hover:text-black font-medium text-[14px] shadow-sm"

/** Tiny reassurance row under auth forms. */
export function AuthTrustRow({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[12px] text-neutral-500">
      {items.map((item) => (
        <li key={item} className="inline-flex items-center gap-1.5">
          <Check className="h-3 w-3 text-gold-deep" /> {item}
        </li>
      ))}
    </ul>
  )
}
