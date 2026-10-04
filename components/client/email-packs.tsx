"use client"

import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { EMAIL_PACKS } from "@/lib/addons"
import { formatInr } from "@/lib/plan-config"
import { useBuyEmails } from "@/hooks/use-buy-emails"
import { cn } from "@/lib/utils"

/** The three email packs with Buy buttons; used on Plans > Add-ons and in the "Buy emails" dialog */
export function EmailPacks({ onBought, compact = false }: { onBought?: (emails: number) => void; compact?: boolean }) {
  const { buy, busyPack } = useBuyEmails(onBought)
  return (
    <div className={cn("grid gap-2.5", compact ? "grid-cols-1" : "grid-cols-1 sm:grid-cols-3")}>
      {EMAIL_PACKS.map((pack, i) => (
        <div
          key={pack.id}
          className={cn(
            "rounded-lg border bg-white p-3.5 flex",
            compact ? "flex-row items-center justify-between gap-3" : "flex-col",
            i === 1 ? "border-neutral-900" : "border-neutral-200"
          )}
        >
          <div className="min-w-0">
            <p className="text-[15px] font-semibold text-neutral-900">{pack.emails.toLocaleString("en-IN")} emails</p>
            <p className="text-[12px] text-neutral-500">
              {formatInr(pack.price)} · {(pack.price / pack.emails).toFixed(2).replace(/\.?0+$/, "")} paise per email
            </p>
          </div>
          <Button
            size="sm"
            variant={i === 1 ? "default" : "outline"}
            className={cn("h-9 text-[13px]", compact ? "shrink-0" : "mt-3 w-full", i === 1 && "bg-neutral-900 text-white hover:bg-black")}
            disabled={!!busyPack}
            onClick={() => buy(pack.id)}
          >
            {busyPack === pack.id ? <Loader2 className="h-4 w-4 animate-spin" /> : `Buy for ${formatInr(pack.price)}`}
          </Button>
        </div>
      ))}
    </div>
  )
}
