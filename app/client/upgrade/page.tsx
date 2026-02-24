"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  Check,
  Crown,
  Building2,
  ArrowLeft,
  Sparkles,
  Zap,
  AlertCircle,
  Loader2,
  TrendingDown,
  Calendar,
  ShieldCheck,
  ChevronRight,
  ArrowRight
} from "lucide-react"
import { getClientSession, PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRazorpay } from "@/hooks/use-razorpay"

interface ProRataInfo {
  originalPrice: number
  unusedCredit: number
  finalAmount: number
  daysRemaining: number
  savings: number
  savingsPercent: number
}

const plans: { id: PlanType; icon: any; popular?: boolean; badge?: string; price: string; description: string; color: string }[] = [
  {
    id: "professional",
    icon: Zap,
    popular: true,
    badge: "Most Popular",
    price: "2,999",
    description: "Perfect for single large events.",
    color: "text-blue-500"
  },
  {
    id: "enterprise",
    icon: Building2,
    badge: "Best Value",
    price: "6,999",
    description: "Ideal for recurring monthly events.",
    color: "text-neutral-900 dark:text-white"
  },
  {
    id: "premium",
    icon: Crown,
    price: "11,999",
    description: "Unlimited power for large organizations.",
    color: "text-amber-500"
  },
]

const features: Record<string, string[]> = {
  professional: [
    "Up to 2,000 certificates/year",
    "Up to 5 certificate types",
    "Basic analytics & export",
    "Priority email support",
    "Excel data import"
  ],
  enterprise: [
    "Up to 25,000 certificates/year",
    "Up to 100 certificate types",
    "Bulk import & processing",
    "Advanced report filtering",
    "Dedicated account manager",
    "Everything in Professional"
  ],
  premium: [
    "Up to 50,000 certificates/year",
    "Unlimited certificate types",
    "Full Whitelabel branding",
    "Custom design assistance",
    "API & Webhook access",
    "Everything in Enterprise"
  ]
}

function UpgradePageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const pendingPlanParam = searchParams.get("pending") as PlanType | null

  const [currentPlan, setCurrentPlan] = useState<PlanType>("free")
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null)
  const [userId, setUserId] = useState<string>("")
  const [userName, setUserName] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [userPhone, setUserPhone] = useState<string>("")
  const [planExpiresAt, setPlanExpiresAt] = useState<Date | null>(null)
  const [proRataInfo, setProRataInfo] = useState<Record<string, ProRataInfo>>({})
  const [loadingProRata, setLoadingProRata] = useState(false)

  const { initiatePayment, isLoading, isProcessing } = useRazorpay({
    onSuccess: async (data: any) => {
      const session = getClientSession()
      if (session) {
        session.userPlan = data.plan
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      toast.success("Upgrade Successful!", { description: `You are now on the ${PLAN_FEATURES[data.plan as keyof typeof PLAN_FEATURES]?.displayName} plan.` })
      setTimeout(() => router.push("/client/dashboard"), 1500)
    },
    onError: (error: any) => console.error(error)
  })

  useEffect(() => {
    const session = getClientSession()
    if (session?.loginType === "user") {
      setCurrentPlan(session.userPlan || "free")
      setPendingPlan(session.pendingPlan || pendingPlanParam || null)
      setUserId(session.userId || "")
      setUserName(session.userName || "")
      setUserEmail(session.userEmail || "")
      setUserPhone(session.userPhone || "")
      setPlanExpiresAt(session.planExpiresAt ? new Date(session.planExpiresAt) : null)
    }
  }, [pendingPlanParam])

  const handleUpgrade = async (planId: PlanType) => {
    if (!userId) {
      toast.error("Session expired")
      return
    }
    initiatePayment(planId as any, { id: userId, name: userName, email: userEmail, phone: userPhone })
  }

  return (
    <div className="p-8 md:p-12 max-w-7xl mx-auto animate-in fade-in duration-700">
      {/* Back Link */}
      <Link href="/client/dashboard" className="inline-flex items-center gap-2 text-sm font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors mb-8 group">
        <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
        Back to workspace
      </Link>

      {/* Header */}
      <div className="max-w-2xl mb-16">
        <h1 className="text-[40px] font-bold text-neutral-900 dark:text-white tracking-tight leading-tight mb-4">
          Scale your certificates <br /> with the right plan.
        </h1>
        <p className="text-[17px] text-neutral-500 leading-relaxed font-normal">
          From independent workshops to worldwide conferences, CertiStage provides the infrastructure you need to issue credentials at scale.
        </p>
      </div>

      {/* Pro-rata Alert if upgrading from paid */}
      {currentPlan !== "free" && planExpiresAt && (
        <div className="mb-12 p-6 rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/30 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center shadow-sm">
              <TrendingDown className="h-5 w-5 text-neutral-600" />
            </div>
            <div>
              <p className="text-[15px] font-bold text-neutral-900 dark:text-white tracking-tight">Pro-rata Upgrade Active</p>
              <p className="text-sm text-neutral-500">Your current plan credit will be applied. You'll only pay the difference.</p>
            </div>
          </div>
          <div className="text-right hidden md:block">
            <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Expires</p>
            <p className="text-sm font-bold text-neutral-900 dark:text-white">{planExpiresAt.toLocaleDateString()}</p>
          </div>
        </div>
      )}

      {/* Pricing Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-20">
        {plans.map((plan) => {
          const isCurrent = currentPlan === plan.id
          const isPending = pendingPlan === plan.id
          const featureList = features[plan.id as keyof typeof features] || []

          return (
            <div key={plan.id} className="relative group">
              {isPending && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-black text-[10px] font-bold uppercase tracking-wider z-10 shadow-lg">
                  Selected Choice
                </div>
              )}
              {plan.badge && !isPending && (
                <div className="absolute -top-3 left-6 px-3 py-1 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400 text-[10px] font-bold uppercase tracking-wider z-10">
                  {plan.badge}
                </div>
              )}

              <Card className={cn(
                "h-full border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-none transition-all duration-300 flex flex-col p-2",
                plan.popular && "border-neutral-400 dark:border-neutral-600",
                isPending && "border-neutral-900 dark:border-white ring-1 ring-neutral-900 dark:ring-white"
              )}>
                <CardHeader className="p-6">
                  <div className="flex items-center gap-3 mb-6">
                    <div className={cn("h-10 w-10 rounded-xl bg-neutral-50 dark:bg-neutral-900 border border-neutral-100 dark:border-neutral-800 flex items-center justify-center", plan.color)}>
                      <plan.icon className="h-5 w-5" />
                    </div>
                    <span className="text-lg font-bold tracking-tight text-neutral-900 dark:text-white uppercase">{plan.id}</span>
                  </div>

                  <div className="mb-1">
                    <span className="text-[48px] font-bold tracking-tighter text-neutral-900 dark:text-white">₹{plan.price}</span>
                    <span className="text-[15px] font-normal text-neutral-400 ml-2">/ year</span>
                  </div>
                  <CardDescription className="text-[14px] text-neutral-500 mt-2 mb-6 font-normal min-h-[40px]">{plan.description}</CardDescription>
                </CardHeader>

                <CardContent className="p-6 pt-0 flex-1 flex flex-col">
                  <div className="space-y-4 mb-10 flex-1">
                    {featureList.map((f, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="h-5 w-5 rounded-full bg-neutral-50 dark:bg-neutral-900 flex items-center justify-center shrink-0 mt-0.5">
                          <Check className="h-3 w-3 text-neutral-900 dark:text-white" />
                        </div>
                        <span className="text-[14px] text-neutral-600 dark:text-neutral-400 leading-tight">{f}</span>
                      </div>
                    ))}
                  </div>

                  <Button
                    variant={plan.popular || isPending ? "default" : "outline"}
                    className={cn(
                      "w-full h-12 text-[15px] font-bold transition-all shadow-sm",
                      (plan.popular || isPending) && "bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90",
                      !(plan.popular || isPending) && "border-neutral-200 dark:border-neutral-800 hover:bg-neutral-50 dark:hover:bg-neutral-900"
                    )}
                    disabled={isCurrent || isLoading || isProcessing}
                    onClick={() => handleUpgrade(plan.id)}
                  >
                    {isCurrent ? "Current Plan" : isProcessing ? "Processing..." : isPending ? "Complete Payment" : "Upgrade Plan"}
                    {!isCurrent && <ArrowRight className="h-4 w-4 ml-2" />}
                  </Button>
                </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      {/* Trust Badge */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center p-12 rounded-[32px] bg-neutral-50 dark:bg-neutral-900/50 border border-neutral-100 dark:border-neutral-800/50">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white dark:bg-neutral-950 border border-neutral-200 dark:border-neutral-800 text-[10px] font-bold uppercase tracking-wider mb-6">
            <ShieldCheck className="h-3 w-3 text-neutral-600" /> Enterprise Secure
          </div>
          <h2 className="text-[28px] font-bold text-neutral-900 dark:text-white tracking-tight mb-4">Enterprise-grade security and reliability.</h2>
          <p className="text-[16px] text-neutral-500 font-normal leading-relaxed mb-6">
            Every plan includes 256-bit encryption, 99.9% uptime SLA, and automated backups. Your data and certificates are protected with industry-leading infrastructure.
          </p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: "Secured by Razorpay", sub: "PCI-DSS Compliant" },
            { label: "SSL Encrypted", sub: "256-bit AES" },
            { label: "99.9% Uptime", sub: "SLA Guaranteed" },
            { label: "Priority Support", sub: "24/7 Availability" }
          ].map((t, i) => (
            <div key={i} className="p-6 rounded-2xl bg-white dark:bg-neutral-950 border border-neutral-100 dark:border-neutral-800 shadow-sm">
              <p className="font-bold text-neutral-900 dark:text-white text-[14px]">{t.label}</p>
              <p className="text-[11px] text-neutral-400 font-medium uppercase tracking-tight mt-1">{t.sub}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={<div className="p-24 flex justify-center"><Loader2 className="h-8 w-8 animate-spin text-neutral-200" /></div>}>
      <UpgradePageContent />
    </Suspense>
  )
}


