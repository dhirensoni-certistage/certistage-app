"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { AlertTriangle, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BuyCertificatesDialog } from "@/components/client/certificate-packs"
import { getPlanFeaturesMap } from "@/lib/auth"
import { cn } from "@/lib/utils"

interface Usage {
  plan: string
  limits: { maxCertificates: number }
  certificateCredits: number
  effectiveCertificates: number
  usage: { certificates: number }
}

const n = (v: number) => v.toLocaleString("en-IN")

/**
 * Upgrade prompt driven by certificate usage: appears at 80% of the quota and turns red at
 * 100%. "bar" always shows the usage line (dashboard); "banner" only appears from 80% and can
 * be dismissed for the session until it hits 100% (recipients).
 */
export function QuotaNudge({ variant = "banner", className }: { variant?: "bar" | "banner"; className?: string }) {
  const [usage, setUsage] = useState<Usage | null>(null)
  const [buyOpen, setBuyOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/usage")
      if (res.ok) setUsage(await res.json())
    } catch {}
  }, [])
  useEffect(() => { load() }, [load])
  useEffect(() => {
    try { setDismissed(sessionStorage.getItem("quotaNudgeDismissed") === "1") } catch {}
  }, [])

  if (!usage || usage.effectiveCertificates === -1 || usage.effectiveCertificates <= 0) return null
  const used = usage.usage.certificates
  const limit = usage.effectiveCertificates
  const pct = Math.min(100, Math.round((used / limit) * 100))
  const full = used >= limit
  const warn = pct >= 80
  const planName = getPlanFeaturesMap()[usage.plan]?.displayName || usage.plan
  const isFree = usage.plan === "free"

  if (variant === "banner" && (!warn || (dismissed && !full))) return null

  const dismiss = () => {
    setDismissed(true)
    try { sessionStorage.setItem("quotaNudgeDismissed", "1") } catch {}
  }

  return (
    <>
      <div className={cn(
        "rounded-xl border px-5 py-4",
        full ? "border-red-200 bg-red-50" : warn ? "border-amber-200 bg-amber-50" : "border-neutral-200 bg-white",
        className
      )}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 text-[13px]">
            <p className={cn("font-medium flex items-center gap-2", full ? "text-red-800" : warn ? "text-amber-900" : "text-neutral-900")}>
              {warn && <AlertTriangle className="h-4 w-4 shrink-0" />}
              {full
                ? `All ${n(limit)} certificates on your ${planName} plan are used`
                : warn
                  ? `${pct}% of your certificates are used: ${n(used)} of ${n(limit)}`
                  : <><span className="font-medium">{n(used)}</span> of {n(limit)} certificates issued on the {planName} plan</>}
            </p>
            <p className={cn("mt-0.5", full ? "text-red-700" : warn ? "text-amber-800" : "text-neutral-500")}>
              {full
                ? "New recipients cannot be added until you upgrade or add a pack of extra certificates."
                : warn
                  ? "Issued certificates count even after deletion. Upgrade before the next import, or add a pack of extra certificates."
                  : usage.certificateCredits > 0
                    ? `Includes ${n(usage.certificateCredits)} extra certificates from add-ons.`
                    : "Issued certificates count even after they are deleted."}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {(warn || isFree) && (
              <Button asChild size="sm" className={cn("h-8 px-3 text-[12.5px]", full ? "bg-red-700 hover:bg-red-800 text-white" : "bg-neutral-900 hover:bg-black text-white")}>
                <Link href="/client/upgrade">See plans</Link>
              </Button>
            )}
            {warn && !isFree && (
              <Button size="sm" variant="outline" onClick={() => setBuyOpen(true)} className="h-8 px-3 text-[12.5px] border-neutral-300 bg-white hover:bg-neutral-50">Buy certificates</Button>
            )}
            {variant === "banner" && !full && (
              <button type="button" onClick={dismiss} aria-label="Dismiss" className="h-8 w-8 inline-flex items-center justify-center rounded-md text-neutral-500 hover:bg-black/5">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>
        <div className={cn("h-1.5 w-full rounded-full overflow-hidden mt-3", full ? "bg-red-100" : warn ? "bg-amber-100" : "bg-neutral-100")}>
          <div className={cn("h-full rounded-full", full ? "bg-red-600" : warn ? "bg-amber-500" : "bg-neutral-900")} style={{ width: `${pct}%` }} />
        </div>
      </div>
      <BuyCertificatesDialog open={buyOpen} onOpenChange={setBuyOpen} onBought={() => load()} />
    </>
  )
}
