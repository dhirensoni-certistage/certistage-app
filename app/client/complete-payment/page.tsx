"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Crown, Building2, Sparkles, Check, Loader2, CreditCard, Shield, Clock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { getClientSession, PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { useRazorpay } from "@/hooks/use-razorpay"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

const planIcons: Record<string, any> = {
  professional: Crown,
  enterprise: Building2,
  premium: Sparkles
}

const planColors: Record<string, string> = {
  professional: "from-blue-500 to-indigo-600",
  enterprise: "from-amber-500 to-orange-600",
  premium: "from-purple-500 to-violet-600"
}

const planFeatures: Record<string, string[]> = {
  professional: [
    "Up to 2,000 certificates/year",
    "Up to 3 events",
    "Excel import & export",
    "Digital signature",
    "Online support"
  ],
  enterprise: [
    "Up to 25,000 certificates/year",
    "Up to 10 events",
    "Priority support",
    "Advanced analytics",
    "All Professional features"
  ],
  premium: [
    "Up to 50,000 certificates/year",
    "Up to 25 events",
    "White-label branding",
    "API access",
    "All Enterprise features"
  ]
}

export default function CompletePaymentPage() {
  const router = useRouter()
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null)
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const { initiatePayment, isLoading: isPaymentLoading, isProcessing } = useRazorpay({
    onSuccess: (data) => {
      // Update session
      const session = getClientSession()
      if (session) {
        session.userPlan = data.plan
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      
      const planName = PLAN_FEATURES[data.plan as PlanType]?.displayName || data.plan
      toast.success("Payment successful! Welcome to " + planName)
      
      // Redirect to events page
      setTimeout(() => {
        router.push("/client/events")
      }, 1500)
    },
    onError: (error) => {
      console.error("Payment error:", error)
    }
  })

  useEffect(() => {
    const session = getClientSession()
    
    if (!session || session.loginType !== "user") {
      router.push("/client/login")
      return
    }

    // If no pending plan, redirect to events
    if (!session.pendingPlan) {
      router.push("/client/events")
      return
    }

    setPendingPlan(session.pendingPlan as PlanType)
    setUserId(session.userId || "")
    setUserName(session.userName || "")
    setUserEmail(session.userEmail || "")
    setUserPhone(session.userPhone || "")
    setIsLoading(false)
  }, [router])

  const handlePayment = () => {
    if (!pendingPlan || !userId) return
    
    initiatePayment(pendingPlan, {
      id: userId,
      name: userName,
      email: userEmail,
      phone: userPhone
    })
  }

  const handleSkip = () => {
    // Clear pending plan from session and continue with free
    const session = getClientSession()
    if (session) {
      session.pendingPlan = null
      localStorage.setItem("clientSession", JSON.stringify(session))
    }
    router.push("/client/events")
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
      </div>
    )
  }

  if (!pendingPlan) return null

  const Icon = planIcons[pendingPlan] || Crown
  const planDetails = PLAN_FEATURES[pendingPlan]
  const features = planFeatures[pendingPlan] || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
      {/* Header */}
      <header className="p-6">
        <div className="flex items-center justify-center gap-2">
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} />
          <span className="text-xl font-semibold text-white">CertiStage</span>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-lg">
          {/* Welcome Message */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Welcome, {userName}! 🎉
            </h1>
            <p className="text-slate-400">
              Complete your payment to activate your plan
            </p>
          </div>

          {/* Plan Card */}
          <Card className="border-0 shadow-2xl overflow-hidden">
            {/* Plan Header */}
            <div className={cn("bg-gradient-to-r p-6 text-white", planColors[pendingPlan])}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                    <Icon className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{planDetails?.displayName} Plan</h2>
                    <p className="text-white/80 text-sm">Annual Subscription</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-bold">{planDetails?.priceYearly}</p>
                  <p className="text-white/80 text-sm">/year</p>
                </div>
              </div>
            </div>

            <CardContent className="p-6">
              {/* Features */}
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                  What's included
                </h3>
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Trust Badges */}
              <div className="flex items-center justify-center gap-6 py-4 border-y border-border mb-6">
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Shield className="h-4 w-4 text-emerald-500" />
                  <span>Secure Payment</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CreditCard className="h-4 w-4 text-blue-500" />
                  <span>Razorpay</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="h-4 w-4 text-amber-500" />
                  <span>Instant Access</span>
                </div>
              </div>

              {/* Payment Button */}
              <Button
                onClick={handlePayment}
                disabled={isPaymentLoading || isProcessing}
                className={cn(
                  "w-full h-12 text-base font-semibold bg-gradient-to-r text-white shadow-lg",
                  planColors[pendingPlan]
                )}
              >
                {isPaymentLoading || isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <CreditCard className="h-5 w-5 mr-2" />
                    Pay {planDetails?.priceYearly} & Activate
                  </>
                )}
              </Button>

              {/* Skip Option */}
              <div className="mt-4 text-center">
                <button
                  onClick={handleSkip}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  Continue with Free plan instead
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Footer Note */}
          <p className="text-center text-xs text-slate-500 mt-6">
            By completing this payment, you agree to our{" "}
            <a href="/terms" className="text-slate-400 hover:text-white">Terms of Service</a>
            {" "}and{" "}
            <a href="/refund" className="text-slate-400 hover:text-white">Refund Policy</a>
          </p>
        </div>
      </main>
    </div>
  )
}
