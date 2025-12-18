"use client"

import { Lock, Crown, Sparkles } from "lucide-react"
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
      "absolute inset-0 z-50 flex items-center justify-center",
      "bg-background/60 backdrop-blur-sm",
      className
    )}>
      <div className="text-center p-8 max-w-md">
        <div className={cn(
          "h-16 w-16 rounded-full flex items-center justify-center mx-auto mb-4",
          type === "trial-expired" 
            ? "bg-amber-500/10 text-amber-600" 
            : "bg-primary/10 text-primary"
        )}>
          {type === "trial-expired" ? (
            <Sparkles className="h-8 w-8" />
          ) : (
            <Lock className="h-8 w-8" />
          )}
        </div>
        
        <h3 className="text-xl font-semibold mb-2">
          {type === "trial-expired" 
            ? "Trial Expired" 
            : `Upgrade to Unlock ${feature}`
          }
        </h3>
        
        <p className="text-muted-foreground mb-6">
          {type === "trial-expired"
            ? "Your 7-day free trial has ended. Upgrade now to continue using CertiStage and unlock all features."
            : description || `This feature is not available in your current plan. Upgrade to access ${feature.toLowerCase()} and more.`
          }
        </p>
        
        <div className="space-y-3">
          <Button asChild className="w-full">
            <Link href="/client/upgrade">
              <Crown className="h-4 w-4 mr-2" />
              Upgrade Now
            </Link>
          </Button>
          
          {type !== "trial-expired" && (
            <p className="text-xs text-muted-foreground">
              Starting from ₹2,999/year
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
    <div className="relative min-h-[400px]">
      <div className="pointer-events-none select-none filter blur-[3px] opacity-50">
        {children}
      </div>
      <UpgradeOverlay feature={feature} description={description} type={type} />
    </div>
  )
}
