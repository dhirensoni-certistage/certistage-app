"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Check, ArrowLeft, Loader2 } from "lucide-react"
import { getClientSession, getPlanFeaturesMap, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRazorpay } from "@/hooks/use-razorpay"
import { DEFAULT_PLAN_CONFIG, mergePlanConfigWithDefaults, formatRupees, planPeriodLabel, isOneTimePlan, planValidityDays } from "@/lib/plan-config"

interface ProRataInfo {
  originalPrice: number
  unusedCredit: number
  finalAmount: number
  daysRemaining: number
  savings: number
  savingsPercent: number
}

const planBadges: Record<string, string> = {
  event: "Pay once",
  professional: "Most popular"
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
  const [planConfig, setPlanConfig] = useState(DEFAULT_PLAN_CONFIG)

  const { initiatePayment, isLoading, isProcessing } = useRazorpay({
    onSuccess: async (data: any) => {
      const session = getClientSession()
      if (session) {
        session.userPlan = data.plan
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      toast.success("Upgrade Successful!", { description: `You are now on the ${getPlanFeaturesMap()[data.plan]?.displayName || data.plan} plan.` })
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

  useEffect(() => {
    const loadPlans = async () => {
      try {
        const cached = localStorage.getItem("plan_config")
        if (cached) {
          setPlanConfig(mergePlanConfigWithDefaults(JSON.parse(cached)))
        }
      } catch { }

      try {
        const res = await fetch("/api/plan-config")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data?.plans)) {
          setPlanConfig(mergePlanConfigWithDefaults(data.plans))
          localStorage.setItem("plan_config", JSON.stringify(data.plans))
        }
      } catch { }
    }

    loadPlans()
  }, [])

  const handleUpgrade = async (planId: PlanType) => {
    if (!userId) {
      toast.error("Session expired")
      return
    }
    initiatePayment(planId as any, { id: userId, name: userName, email: userEmail, phone: userPhone })
  }

  const planMap = getPlanFeaturesMap()
  const currentName = planMap[currentPlan]?.displayName || "Free"
  const fmtDate = (d: Date) => d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto animate-in fade-in duration-500">
      <Link href="/client/dashboard" className="inline-flex items-center gap-1.5 text-[13px] text-neutral-500 hover:text-neutral-900 mb-6">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to dashboard
      </Link>

      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-none">Plans</h1>
          <p className="text-[14px] text-neutral-500 mt-2 max-w-xl">Pay once for a single event, or yearly for more. Upgrade any time; when you move up from a paid plan, the unused part of your current plan is credited.</p>
        </div>
        <p className="text-[13px] text-neutral-600 md:text-right">
          You are on the <span className="font-medium text-neutral-900">{currentName}</span> plan
          {currentPlan !== "free" && planExpiresAt && <>, active until <span className="font-medium text-neutral-900">{fmtDate(planExpiresAt)}</span></>}.
        </p>
      </div>

      {currentPlan === "event" && (
        <div className="mb-6 rounded-xl border border-gold/60 bg-gold-soft px-5 py-4 text-[13px] text-neutral-800">
          Running more than one event? <span className="font-medium">Professional</span> covers 3 events and 2,000 certificates for a whole year, about the price of six one-event plans. The unused days of your one-event plan are credited when you switch.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-10">
        {planConfig
          .filter((plan) => plan.enabled !== false && plan.id !== "free")
          .map((plan) => {
            const isCurrent = currentPlan === plan.id
            const isPending = pendingPlan === plan.id
            const featureList = plan.features || []
            const badge = isCurrent ? "Current plan" : isPending ? "Payment pending" : planBadges[plan.id]
            const highlighted = isCurrent || isPending || plan.id === "professional"
            return (
              <div
                key={plan.id}
                className={cn(
                  "relative flex flex-col rounded-xl border bg-white p-6",
                  isCurrent ? "border-gold" : isPending ? "border-neutral-900" : "border-neutral-200"
                )}
              >
                {badge && (
                  <span className={cn(
                    "absolute -top-2.5 left-5 px-2 py-0.5 rounded-full text-[11px] font-medium",
                    isCurrent ? "bg-gold text-neutral-900" : isPending ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                  )}>{badge}</span>
                )}
                <h2 className="text-[16px] font-semibold text-neutral-900">{plan.name || plan.id}</h2>
                <p className="mt-3 flex items-baseline gap-1.5 whitespace-nowrap">
                  <span className="text-[32px] font-semibold tracking-tight text-neutral-900 leading-none">{formatRupees(plan.price)}</span>
                  <span className="text-[13px] text-neutral-500">{planPeriodLabel(plan)}</span>
                </p>
                <p className="text-[13px] text-neutral-500 mt-2 min-h-[40px]">{plan.description}</p>

                <ul className="mt-5 space-y-2.5 flex-1">
                  {featureList.map((f, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-[13.5px] text-neutral-700 leading-snug">
                      <Check className="h-4 w-4 mt-0.5 shrink-0 text-gold-deep" /> {f}
                    </li>
                  ))}
                </ul>

                <Button
                  variant={highlighted ? "default" : "outline"}
                  className={cn(
                    "w-full h-10 mt-6 text-[14px] font-medium",
                    highlighted ? "bg-neutral-900 text-white hover:bg-black" : "border-neutral-200 hover:bg-neutral-50"
                  )}
                  disabled={(isCurrent && !isOneTimePlan(plan)) || isLoading || isProcessing}
                  onClick={() => handleUpgrade(plan.id as PlanType)}
                >
                  {isCurrent && isOneTimePlan(plan) ? "Buy again for a new event" : isCurrent ? "Your current plan" : isProcessing ? "Processing" : isPending ? "Complete payment" : currentPlan === "free" ? `Choose ${plan.name || plan.id}` : `Switch to ${plan.name || plan.id}`}
                </Button>
                {isOneTimePlan(plan) && (
                  <p className="text-[12px] text-neutral-500 mt-2 text-center">Organiser access for {planValidityDays(plan)} days. Recipients can keep downloading after that.</p>
                )}
                {!isCurrent && proRataInfo[plan.id] && proRataInfo[plan.id].unusedCredit > 0 && (
                  <p className="text-[12px] text-neutral-500 mt-2 text-center">
                    You pay {formatRupees(proRataInfo[plan.id].finalAmount)} after {formatRupees(proRataInfo[plan.id].unusedCredit)} credit for the unused part of your current plan.
                  </p>
                )}
              </div>
            )
          })}
      </div>

      <Link
        href="/client/addons"
        className="mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-neutral-200 bg-white px-5 py-4 hover:border-neutral-400 transition-colors"
      >
        <div>
          <p className="text-[14px] font-semibold text-neutral-900">Add-ons</p>
          <p className="text-[13px] text-neutral-500">Certificate email packs from ₹200, WhatsApp delivery and more. No plan change needed.</p>
        </div>
        <span className="text-[13px] font-medium text-neutral-900">See add-ons →</span>
      </Link>

      <div className="rounded-xl border border-neutral-200 bg-white px-5 py-4 text-[13px] text-neutral-600 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p>Payments are processed by Razorpay (UPI, cards, net banking). A receipt is emailed after every payment.</p>
        <p>Questions about plans? <a href="mailto:support@certistage.com" className="text-neutral-900 underline underline-offset-4">support@certistage.com</a></p>
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


