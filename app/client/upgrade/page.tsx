"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Crown, Building2, ArrowLeft, Sparkles, Zap, AlertCircle, Loader2, TrendingDown, Calendar } from "lucide-react"
import { getClientSession, PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"
import { useRazorpay } from "@/hooks/use-razorpay"
import { PLAN_PRICES, type PlanId } from "@/lib/razorpay"

interface ProRataInfo {
  originalPrice: number
  unusedCredit: number
  finalAmount: number
  daysRemaining: number
  savings: number
  savingsPercent: number
}

const plans: { id: PlanType; icon: any; popular?: boolean; badge?: string; price: string; description: string }[] = [
  { 
    id: "professional", 
    icon: Crown, 
    popular: true, 
    badge: "Most Popular",
    price: "₹2,999",
    description: "Up to 3 events"
  },
  { 
    id: "enterprise", 
    icon: Building2, 
    badge: "Best Value",
    price: "₹6,999", 
    description: "Up to 10 events"
  },
  { 
    id: "premium", 
    icon: Sparkles,
    price: "₹11,999",
    description: "Up to 25 events"
  },
]

const features: Record<string, string[]> = {
  professional: [
    "Up to 2,000 certificates/year",
    "Up to 5 certificate types",
    "Event creation",
    "Excel import",
    "Multiple downloads",
    "Digital signature",
    "Basic analytics & export",
    "Online support"
  ],
  enterprise: [
    "Up to 25,000 certificates/year",
    "Up to 100 certificate types",
    "Bulk import",
    "Priority support",
    "Advanced analytics",
    "Event-wise export",
    "Email notifications",
    "All Professional features"
  ],
  premium: [
    "Up to 50,000 certificates/year",
    "Up to 200 certificate types",
    "Dedicated support",
    "White-label (logo + footer)",
    "Advanced & summary reports",
    "API access",
    "Custom domain",
    "All Enterprise features"
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
  const [planStartDate, setPlanStartDate] = useState<Date | null>(null)
  const [planExpiresAt, setPlanExpiresAt] = useState<Date | null>(null)
  const [proRataInfo, setProRataInfo] = useState<Record<string, ProRataInfo>>({})
  const [loadingProRata, setLoadingProRata] = useState(false)

  const { initiatePayment, isLoading, isProcessing } = useRazorpay({
    onSuccess: async (data) => {
      // Update local session with new plan and clear pendingPlan
      const session = getClientSession()
      if (session) {
        session.userPlan = data.plan
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      setCurrentPlan(data.plan)
      setPendingPlan(null)
      
      // Redirect to dashboard after success
      setTimeout(() => {
        router.push("/client/dashboard")
      }, 1500)
    },
    onError: (error) => {
      console.error("Payment error:", error)
    }
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
      setPlanStartDate(session.planStartDate ? new Date(session.planStartDate) : null)
      setPlanExpiresAt(session.planExpiresAt ? new Date(session.planExpiresAt) : null)
    }
  }, [pendingPlanParam])

  // Fetch pro-rata pricing for paid plan users
  useEffect(() => {
    const fetchProRataPricing = async () => {
      if (currentPlan === "free" || !userId) return
      
      setLoadingProRata(true)
      const proRataData: Record<string, ProRataInfo> = {}
      
      for (const plan of plans) {
        if (plan.id === currentPlan) continue
        
        try {
          const response = await fetch("/api/razorpay/calculate-pro-rata", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ plan: plan.id, userId })
          })
          
          if (response.ok) {
            const data = await response.json()
            if (data.proRata) {
              proRataData[plan.id] = data.proRata
            }
          }
        } catch (error) {
          console.error(`Failed to fetch pro-rata for ${plan.id}:`, error)
        }
      }
      
      setProRataInfo(proRataData)
      setLoadingProRata(false)
    }
    
    fetchProRataPricing()
  }, [currentPlan, userId])

  const handleUpgrade = async (planId: PlanType) => {
    if (!userId) {
      toast.error("Session expired. Please login again.")
      return
    }

    // Initiate Razorpay payment
    initiatePayment(planId, {
      id: userId,
      name: userName,
      email: userEmail,
      phone: userPhone
    })
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/client/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      {/* Pending Plan Alert */}
      {pendingPlan && (
        <div className="mb-6 rounded-xl border-2 border-amber-500/50 bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900 dark:text-amber-100">
                Complete Your {PLAN_FEATURES[pendingPlan]?.displayName} Upgrade
              </p>
              <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                You selected the {PLAN_FEATURES[pendingPlan]?.displayName} plan ({PLAN_FEATURES[pendingPlan]?.priceYearly}/year) during signup. 
                Click the button below to complete your payment and unlock all features.
              </p>
              <Button 
                className="mt-3 bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
                onClick={() => handleUpgrade(pendingPlan)}
                disabled={isLoading || isProcessing}
              >
                {isLoading || isProcessing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Crown className="h-4 w-4 mr-2" />
                    Pay {PLAN_FEATURES[pendingPlan]?.priceYearly} Now
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">
          {pendingPlan ? "Complete Your Upgrade" : "Upgrade Your Plan"}
        </h1>
        <p className="text-muted-foreground">
          {pendingPlan 
            ? "Complete payment to unlock your selected plan features"
            : "Choose the plan that best fits your needs"
          }
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
          <span className="text-sm text-muted-foreground">Current Plan:</span>
          <span className="text-sm font-semibold text-primary">{PLAN_FEATURES[currentPlan]?.displayName || "Free"}</span>
        </div>
      </div>

      {/* Pro-rata upgrade info for paid plan users */}
      {currentPlan !== "free" && planExpiresAt && (
        <div className="mb-6 rounded-xl border border-emerald-500/30 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/20 dark:to-teal-950/20 p-4">
          <div className="flex items-start gap-3">
            <TrendingDown className="h-5 w-5 text-emerald-600 mt-0.5" />
            <div>
              <p className="font-semibold text-emerald-900 dark:text-emerald-100">
                Pro-rata Upgrade Available
              </p>
              <p className="text-sm text-emerald-700 dark:text-emerald-300 mt-1">
                Your current plan expires on {new Date(planExpiresAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}. 
                Upgrade now and get credit for your unused days - pay only the difference!
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Free Plan */}
        <Card className="border-border/50 relative flex flex-col opacity-60">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-muted-foreground" />
              <CardTitle className="text-lg">Free</CardTitle>
            </div>
            <CardDescription>Trial / Demo</CardDescription>
            <div className="mt-4">
              <span className="text-4xl font-bold">₹0</span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col flex-1">
            <ul className="space-y-2 text-sm flex-1">
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Up to 50 certificates</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>1 certificate template</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Certificate design & creation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Manual participant entry</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Download page link</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>1 time download only</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>Email support (limited)</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>7 days trial</span>
              </li>
            </ul>
            <Button variant="outline" className="w-full mt-4" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const isPendingPlan = pendingPlan === plan.id
          const Icon = plan.icon

          return (
            <div key={plan.id} className="relative pt-3">
              {isPendingPlan ? (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium text-white rounded-md z-10 bg-gradient-to-r from-amber-500 to-orange-500 animate-pulse">
                  Your Selected Plan
                </div>
              ) : plan.badge && (
                <div className={cn(
                  "absolute top-0 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium text-white rounded-md z-10",
                  plan.popular && "bg-primary",
                  plan.id === "enterprise" && "bg-amber-500"
                )}>
                  {plan.badge}
                </div>
              )}
              <Card 
                className={cn(
                  "relative transition-all flex flex-col h-full",
                  isPendingPlan && "border-amber-500 shadow-lg border-2 ring-2 ring-amber-500/20",
                  !isPendingPlan && plan.popular && "border-primary shadow-lg border-2",
                  !isPendingPlan && plan.id === "enterprise" && "border-amber-500/50",
                  !isPendingPlan && plan.id === "premium" && "border-violet-500/50 bg-gradient-to-b from-background to-muted/30",
                  isCurrentPlan && "opacity-60"
                )}
              >
              <CardHeader className="pb-4 pt-6">
                <div className="flex items-center gap-2">
                  <Icon className={cn(
                    "h-5 w-5",
                    plan.id === "professional" && "text-primary",
                    plan.id === "enterprise" && "text-amber-500",
                    plan.id === "premium" && "text-violet-500"
                  )} />
                  <CardTitle className="text-lg">
                    {plan.id === "professional" && "Professional"}
                    {plan.id === "enterprise" && "Enterprise Gold"}
                    {plan.id === "premium" && "Premium Plus"}
                  </CardTitle>
                </div>
                <CardDescription>{plan.description}</CardDescription>
                
                {/* Pro-rata pricing display */}
                {proRataInfo[plan.id] && proRataInfo[plan.id].unusedCredit > 0 ? (
                  <div className="mt-4 space-y-2">
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-emerald-600">
                        ₹{(proRataInfo[plan.id].finalAmount / 100).toLocaleString("en-IN")}
                      </span>
                      <span className="text-sm text-muted-foreground line-through">
                        {plan.price}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-emerald-600 bg-emerald-50 dark:bg-emerald-950/30 px-2 py-1 rounded-md">
                      <TrendingDown className="h-3 w-3" />
                      <span>Save ₹{(proRataInfo[plan.id].savings / 100).toLocaleString("en-IN")} ({proRataInfo[plan.id].savingsPercent}%)</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3 w-3" />
                      <span>{proRataInfo[plan.id].daysRemaining} days credit applied</span>
                    </div>
                  </div>
                ) : (
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">/year</span>
                  </div>
                )}
              </CardHeader>
              
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 text-sm flex-1">
                  {features[plan.id]?.map((feature: string, index: number) => (
                    <li key={index} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                
                <Button 
                  className={cn(
                    "w-full mt-4",
                    isPendingPlan && "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600",
                    !isPendingPlan && plan.popular && "bg-primary hover:bg-primary/90"
                  )}
                  variant={isPendingPlan || plan.popular ? "default" : "outline"}
                  disabled={isCurrentPlan || isLoading || isProcessing}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan 
                    ? "Current Plan" 
                    : isLoading || isProcessing
                      ? "Processing..." 
                      : isPendingPlan
                        ? "Complete Payment"
                        : "Get Started"
                  }
                </Button>
              </CardContent>
              </Card>
            </div>
          )
        })}
      </div>

      <div className="mt-10 text-center">
        <p className="text-sm text-muted-foreground">
          Need help choosing? <a href="mailto:support@certistage.com" className="text-primary hover:underline">Contact our team</a>
        </p>
        <p className="text-xs text-muted-foreground mt-2">
          All paid plans include secure certificate delivery and download page links.
        </p>
      </div>
    </div>
  )
}

export default function UpgradePage() {
  return (
    <Suspense fallback={
      <div className="p-8 flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <UpgradePageContent />
    </Suspense>
  )
}
