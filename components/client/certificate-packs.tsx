"use client"

import { useState } from "react"
import { Check, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { CERT_PACKS } from "@/lib/addons"
import { useAddonConfig } from "@/hooks/use-addon-config"
import { formatInr } from "@/lib/plan-config"
import { useBuyEmails } from "@/hooks/use-buy-emails"
import { cn } from "@/lib/utils"

const LABELS: Record<string, string> = { certs_1000: "Most popular", certs_5000: "Best value" }
const perCert = (price: number, certificates: number) => `₹${(price / 100 / certificates).toFixed(2).replace(/\.?0+$/, "")} per certificate`

/** Pack picker with one checkout button for extra certificates (Add-ons page and the quota dialog) */
export function CertificatePacks({ onBought, compact = false }: { onBought?: (certificates: number) => void; compact?: boolean }) {
  const { buy, busyPack } = useBuyEmails(onBought)
  const { certPacks: packs } = useAddonConfig()
  const [selected, setSelected] = useState(CERT_PACKS[1].id)
  const pack = packs.find((p) => p.id === selected) || packs[0]
  const base = packs[0].price / packs[0].certificates

  return (
    <div>
      <div role="radiogroup" aria-label="Certificate packs" className="space-y-2.5">
        {packs.map((p) => {
          const active = p.id === selected
          const saving = Math.round((1 - p.price / p.certificates / base) * 100)
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelected(p.id)}
              className={cn(
                "relative w-full flex items-center gap-3.5 rounded-xl border bg-white text-left transition-all",
                compact ? "px-3.5 py-3" : "px-4 py-3.5",
                active ? "border-neutral-900 ring-1 ring-neutral-900 shadow-sm" : "border-neutral-200 hover:border-neutral-400"
              )}
            >
              <span className={cn("h-[18px] w-[18px] shrink-0 rounded-full border flex items-center justify-center", active ? "border-neutral-900 bg-neutral-900" : "border-neutral-300")}>
                {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-neutral-900 tabular-nums">{p.certificates.toLocaleString("en-IN")} certificates</span>
                  {LABELS[p.id] && (
                    <span className={cn("px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wider", p.id === "certs_1000" ? "bg-gold-soft text-gold-deep" : "bg-emerald-50 text-emerald-700")}>
                      {LABELS[p.id]}
                    </span>
                  )}
                </span>
                <span className="block text-[12px] text-neutral-500 mt-0.5">
                  {perCert(p.price, p.certificates)}{saving > 0 && <span className="text-emerald-700 font-medium"> · save {saving}%</span>}
                </span>
              </span>
              <span className="text-[17px] font-semibold text-neutral-900 tabular-nums">{formatInr(p.price)}</span>
            </button>
          )
        })}
      </div>

      <Button
        className="w-full h-11 mt-4 bg-neutral-900 text-white hover:bg-black text-[14px] font-medium"
        disabled={!!busyPack}
        onClick={() => buy(pack.id)}
      >
        {busyPack ? <Loader2 className="h-4 w-4 animate-spin" /> : `Buy ${pack.certificates.toLocaleString("en-IN")} certificates · ${formatInr(pack.price)}`}
      </Button>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-500">
        <Lock className="h-3 w-3" /> Secure payment by Razorpay · UPI, cards, net banking · receipt by email
      </p>
    </div>
  )
}

/** "Buy certificates" popup, opened from the quota warning when the plan's certificates run low */
export function BuyCertificatesDialog({ open, onOpenChange, onBought }: { open: boolean; onOpenChange: (open: boolean) => void; onBought?: (certificates: number) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy extra certificates</DialogTitle>
          <DialogDescription>
            One-time packs that add to your plan&apos;s quota and never expire. For recurring volume, the next plan up is usually cheaper.
          </DialogDescription>
        </DialogHeader>
        <CertificatePacks compact onBought={(c) => { onBought?.(c); onOpenChange(false) }} />
      </DialogContent>
    </Dialog>
  )
}
