"use client"

import { cn } from "@/lib/utils"
import type { AddonStatus } from "@/lib/addons"

/** "Beta" / "Soon" label for add-ons and new features */
export function StatusTag({ status }: { status: AddonStatus }) {
  if (status === "live") return null
  return (
    <span
      className={cn(
        "inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider",
        status === "beta" ? "bg-indigo-50 text-indigo-700" : "bg-neutral-100 text-neutral-500"
      )}
    >
      {status === "beta" ? "Beta" : "Soon"}
    </span>
  )
}
