"use client"

import { useState } from "react"
import { Check, Loader2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMAIL_PACKS, CUSTOM_EMAILS, customEmailPrice, emailRate, parseCustomEmails, betterTierOffer } from "@/lib/addons"
import { useAddonConfig } from "@/hooks/use-addon-config"
import { formatInr } from "@/lib/plan-config"
import { useBuyEmails } from "@/hooks/use-buy-emails"
import { cn } from "@/lib/utils"

const LABELS: Record<string, string> = { emails_10000: "Most popular", emails_50000: "Best value" }
const paise = (price: number, emails: number) => `${(price / emails).toFixed(2).replace(/\.?0+$/, "")} paise / email`

/**
 * Pack picker with one checkout button; used on Add-ons and in the "Buy emails" dialog.
 * The middle pack is preselected.
 */
export function EmailPacks({ onBought, compact = false }: { onBought?: (emails: number) => void; compact?: boolean }) {
  const { buy, busyPack } = useBuyEmails(onBought)
  const { emailPacks: packs } = useAddonConfig()
  const BASE_RATE = packs[0].price / packs[0].emails
  const [selected, setSelected] = useState(EMAIL_PACKS[1].id)
  const [customInput, setCustomInput] = useState("2500")
  const isCustom = selected === "custom"
  const customEmails = parseCustomEmails(customInput)
  const offer = isCustom && customEmails ? betterTierOffer(customEmails) : null
  const pack = isCustom
    ? customEmails ? { id: "custom", emails: customEmails, price: customEmailPrice(customEmails) } : null
    : packs.find((p) => p.id === selected) || packs[0]

  return (
    <div>
      <div role="radiogroup" aria-label="Email packs" className="space-y-2.5">
        {packs.map((p) => {
          const active = p.id === selected
          const saving = Math.round((1 - p.price / p.emails / BASE_RATE) * 100)
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
              <span
                className={cn(
                  "h-[18px] w-[18px] shrink-0 rounded-full border flex items-center justify-center",
                  active ? "border-neutral-900 bg-neutral-900" : "border-neutral-300"
                )}
              >
                {active && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
              </span>
              <span className="flex-1 min-w-0">
                <span className="flex items-center gap-2">
                  <span className="text-[15px] font-semibold text-neutral-900 tabular-nums">{p.emails.toLocaleString("en-IN")} emails</span>
                  {LABELS[p.id] && (
                    <span className={cn(
                      "px-1.5 py-px rounded text-[10px] font-semibold uppercase tracking-wider",
                      p.id === "emails_10000" ? "bg-gold-soft text-gold-deep" : "bg-emerald-50 text-emerald-700"
                    )}>
                      {LABELS[p.id]}
                    </span>
                  )}
                </span>
                <span className="block text-[12px] text-neutral-500 mt-0.5">
                  {paise(p.price, p.emails)}{saving > 0 && <span className="text-emerald-700 font-medium"> · save {saving}%</span>}
                </span>
              </span>
              <span className="text-[17px] font-semibold text-neutral-900 tabular-nums">{formatInr(p.price)}</span>
            </button>
          )
        })}

        {/* Any quantity, priced by volume */}
        <div
          className={cn(
            "rounded-xl border bg-white transition-all",
            compact ? "px-3.5 py-3" : "px-4 py-3.5",
            isCustom ? "border-neutral-900 ring-1 ring-neutral-900 shadow-sm" : "border-neutral-200 hover:border-neutral-400"
          )}
        >
          <button type="button" role="radio" aria-checked={isCustom} onClick={() => setSelected("custom")} className="w-full flex items-center gap-3.5 text-left">
            <span className={cn("h-[18px] w-[18px] shrink-0 rounded-full border flex items-center justify-center", isCustom ? "border-neutral-900 bg-neutral-900" : "border-neutral-300")}>
              {isCustom && <Check className="h-3 w-3 text-white" strokeWidth={3} />}
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-semibold text-neutral-900">Custom amount</span>
              <span className="block text-[12px] text-neutral-500 mt-0.5">Buy exactly what you need · 10, 8 or 6 paise per email by volume</span>
            </span>
            {isCustom && pack && <span className="text-[17px] font-semibold text-neutral-900 tabular-nums">{formatInr(pack.price)}</span>}
          </button>
          {isCustom && (
            <div className="mt-3 pl-8">
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  inputMode="numeric"
                  min={CUSTOM_EMAILS.min}
                  max={CUSTOM_EMAILS.max}
                  step={CUSTOM_EMAILS.step}
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  aria-label="Number of emails"
                  autoFocus
                  className="w-36 h-9 rounded-md border border-neutral-300 px-3 text-[14px] font-medium tabular-nums outline-none focus:ring-2 focus:ring-neutral-900/10 focus:border-neutral-900"
                />
                <span className="text-[13px] text-neutral-600">emails</span>
              </div>
              {customEmails ? (
                <p className="mt-1.5 text-[12px] text-neutral-500">
                  {customEmails.toLocaleString("en-IN")} × {emailRate(customEmails)} paise = <span className="font-medium text-neutral-900">{formatInr(customEmailPrice(customEmails))}</span>
                </p>
              ) : (
                <p className="mt-1.5 text-[12px] text-red-600">
                  Enter {CUSTOM_EMAILS.min.toLocaleString("en-IN")} to {CUSTOM_EMAILS.max.toLocaleString("en-IN")} emails, in steps of {CUSTOM_EMAILS.step}.
                </p>
              )}
              {offer && (
                <button
                  type="button"
                  onClick={() => setCustomInput(String(offer.emails))}
                  className="mt-2 text-left text-[12px] rounded-md bg-emerald-50 text-emerald-800 px-2.5 py-1.5 hover:bg-emerald-100"
                >
                  Better deal: {offer.emails.toLocaleString("en-IN")} emails for {formatInr(offer.price)}. Switch
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Button
        className="w-full h-11 mt-4 bg-neutral-900 text-white hover:bg-black text-[14px] font-medium"
        disabled={!!busyPack || !pack}
        onClick={() => pack && buy(pack.id, pack.emails)}
      >
        {busyPack ? <Loader2 className="h-4 w-4 animate-spin" /> : pack ? `Buy ${pack.emails.toLocaleString("en-IN")} emails · ${formatInr(pack.price)}` : "Enter a number of emails"}
      </Button>
      <p className="mt-2.5 flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-500">
        <Lock className="h-3 w-3" /> Secure payment by Razorpay · UPI, cards, net banking · receipt by email
      </p>
    </div>
  )
}
