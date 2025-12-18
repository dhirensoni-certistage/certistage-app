"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check, Crown, Building2, ArrowLeft, Sparkles, Zap } from "lucide-react"
import { getClientSession, clearClientSession, updateUserPlan, PLAN_FEATURES, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import Link from "next/link"

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
    "Event creation",
    "Up to 2,000 certificates/year",
    "Up to 5 certificate types",
    "Excel import",
    "Multiple downloads",
    "Digital signature",
    "Basic analytics & export",
    "Online support"
  ],
  enterprise: [
    "Up to 25,000 certificates/year",
    "Up to 100 certificate types",
    "Custom branding",
    "Bulk import",
    "Priority support",
    "Advanced analytics",
    "Event-wise export"
  ],
  premium: [
    "Up to 50,000 certificates/year",
    "Up to 200 certificate types",
    "Custom branding",
    "Dedicated support",
    "White-label (logo + footer)",
    "Advanced & summary reports"
  ]
}

export default function UpgradePage() {
  const router = useRouter()
  const [currentPlan, setCurrentPlan] = useState<PlanType>("free")
  const [userId, setUserId] = useState<string>("")
  const [isUpgrading, setIsUpgrading] = useState(false)

  useEffect(() => {
    const session = getClientSession()
    if (session?.loginType === "user") {
      setCurrentPlan(session.userPlan || "free")
      setUserId(session.userId || "")
    }
  }, [])

  const handleUpgrade = async (planId: PlanType) => {
    if (!userId) {
      toast.error("Session expired. Please login again.")
      return
    }

    if (planId === "premium") {
      toast.info("Please contact our sales team for Premium Plus plan.", {
        description: "Email: sales@certistage.com"
      })
      return
    }

    setIsUpgrading(true)
    
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    const success = updateUserPlan(userId, planId)
    
    if (success) {
      toast.success("Plan upgraded successfully! Please login again.", {
        description: `You are now on ${PLAN_FEATURES[planId].displayName} plan.`
      })
      
      clearClientSession()
      
      setTimeout(() => {
        router.push("/client/login?upgraded=true")
      }, 1500)
    } else {
      toast.error("Failed to upgrade. Please try again.")
    }
    
    setIsUpgrading(false)
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <Button variant="ghost" size="sm" asChild className="mb-6">
        <Link href="/client/dashboard">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>
      </Button>

      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold mb-2">Upgrade Your Plan</h1>
        <p className="text-muted-foreground">
          Choose the plan that best fits your needs
        </p>
        <div className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-full bg-muted">
          <span className="text-sm text-muted-foreground">Current Plan:</span>
          <span className="text-sm font-semibold text-primary">{PLAN_FEATURES[currentPlan]?.displayName || "Free"}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
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
                <span>Certificate design & creation</span>
              </li>
              <li className="flex items-center gap-2">
                <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                <span>1 certificate template</span>
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
            </ul>
            <Button variant="outline" className="w-full mt-4" disabled>
              Current Plan
            </Button>
          </CardContent>
        </Card>
        {plans.map((plan) => {
          const isCurrentPlan = currentPlan === plan.id
          const Icon = plan.icon

          return (
            <Card 
              key={plan.id} 
              className={cn(
                "relative overflow-hidden transition-all flex flex-col h-full",
                plan.popular && "border-primary shadow-lg border-2",
                plan.id === "enterprise" && "border-amber-500/50",
                plan.id === "premium" && "border-violet-500/50 bg-gradient-to-b from-background to-muted/30",
                isCurrentPlan && "opacity-60"
              )}
            >
              {plan.badge && (
                <div className={cn(
                  "absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-medium text-white rounded-md",
                  plan.popular && "bg-primary",
                  plan.id === "enterprise" && "bg-amber-500"
                )}>
                  {plan.badge}
                </div>
              )}
              
              <CardHeader className="pb-4 pt-8">
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
                <div className="mt-4">
                  <span className="text-4xl font-bold">{plan.price}</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
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
                    plan.popular && "bg-primary hover:bg-primary/90"
                  )}
                  variant={plan.popular ? "default" : "outline"}
                  disabled={isCurrentPlan || isUpgrading}
                  onClick={() => handleUpgrade(plan.id)}
                >
                  {isCurrentPlan 
                    ? "Current Plan" 
                    : plan.id === "premium" 
                      ? "Get Started"
                      : isUpgrading 
                        ? "Processing..." 
                        : "Get Started"
                  }
                </Button>
              </CardContent>
            </Card>
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
