"use client"

import { Lock, Crown, Sparkles, AlertCircle } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { cn } from "@/lib/utils"

interface UpgradeOverlayProps {
  feature: string
  description?: string
  type?: "locked" | "trial-expired"
  className?: string
}

export function UpgradeOverlay({
  feature,
  description,
  type = "locked",
  className
}: UpgradeOverlayProps) {
  return (
    <div className={cn(
      "absolute inset-0 z-50 flex items-center justify-center p-6",
      "bg-white/80 dark:bg-neutral-950/80 backdrop-blur-md",
      className
    )}>
      <div className="text-center p-10 max-w-md bg-white dark:bg-neutral-900 rounded-[32px] border border-neutral-200 dark:border-neutral-800 shadow-2xl animate-in zoom-in-95 duration-500">
        <div className={cn(
          "h-20 w-20 rounded-[24px] flex items-center justify-center mx-auto mb-6 shadow-sm border border-neutral-100 dark:border-neutral-800",
          type === "trial-expired"
            ? "bg-neutral-50 dark:bg-neutral-950 text-amber-500"
            : "bg-neutral-50 dark:bg-neutral-950 text-neutral-900 dark:text-white"
        )}>
          {type === "trial-expired" ? (
            <AlertCircle className="h-10 w-10" />
          ) : (
            <Lock className="h-10 w-10" />
          )}
        </div>

        <h3 className="text-2xl font-bold mb-3 tracking-tight text-neutral-900 dark:text-white">
          {type === "trial-expired"
            ? "Access Suspended"
            : `${feature}`
          }
        </h3>

        <p className="text-[15px] text-neutral-500 mb-8 leading-relaxed font-normal px-4">
          {type === "trial-expired"
            ? "Your 7-day trial period has concluded. Upgrade now to restore your workspace and certificate data."
            : description || `Unlock this feature to scale your certificate generation with advanced capabilities.`
          }
        </p>

        <div className="space-y-4 px-6">
          <Button asChild className="w-full h-12 rounded-full font-bold uppercase tracking-widest text-[11px] bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 shadow-lg">
            <Link href="/client/upgrade">
              <Crown className="h-4 w-4 mr-2" />
              View Plans
            </Link>
          </Button>

          {type !== "trial-expired" && (
            <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-[0.1em]">
              Professional access from ₹2,999/yr
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

// Wrapper component for blurred content
interface LockedFeatureProps {
  children: React.ReactNode
  isLocked: boolean
  feature: string
  description?: string
  type?: "locked" | "trial-expired"
}

export function LockedFeature({
  children,
  isLocked,
  feature,
  description,
  type = "locked"
}: LockedFeatureProps) {
  if (!isLocked) {
    return <>{children}</>
  }

  return (
    <div className="relative min-h-[400px] w-full h-full flex flex-col">
      <div className="pointer-events-none select-none filter blur-[8px] opacity-30 flex-1">
        {children}
      </div>
      <UpgradeOverlay feature={feature} description={description} type={type} />
    </div>
  )
}

