"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientSession, getPlanFeaturesMap, type PlanType } from "@/lib/auth"
import { useRazorpay } from "@/hooks/use-razorpay"
import { PlanCheckout, CheckoutLoading, useLivePlan } from "@/components/checkout/plan-checkout"
import { toast } from "sonner"

const testPlanEnabled = process.env.NEXT_PUBLIC_ENABLE_TEST_PLAN === "true"

export default function CompletePaymentPage() {
  const router = useRouter()
  const [pendingPlan, setPendingPlan] = useState<PlanType | null>(null)
  const [userId, setUserId] = useState("")
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userPhone, setUserPhone] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const { plan, loaded } = useLivePlan(pendingPlan)

  const { initiatePayment, isLoading: isPaymentLoading, isProcessing } = useRazorpay({
    onSuccess: (data) => {
      // Update session
      const session = getClientSession()
      if (session) {
        session.userPlan = data.plan
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      
      const planName = getPlanFeaturesMap()[data.plan]?.displayName || data.plan
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

    if (session.pendingPlan === "test" && !testPlanEnabled) {
      session.pendingPlan = null
      localStorage.setItem("clientSession", JSON.stringify(session))
      router.push("/client/events")
      return
    }

    try {
      const stored = localStorage.getItem("plan_config")
      if (stored) {
        const plans = JSON.parse(stored)
        const blocked = Array.isArray(plans) &&
          plans.some((p: any) => p.id === session.pendingPlan && p.enabled === false)
        if (blocked) {
          session.pendingPlan = null
          localStorage.setItem("clientSession", JSON.stringify(session))
          router.push("/client/events")
          return
        }
      }
    } catch { }

    setPendingPlan(session.pendingPlan as PlanType)
    setUserId(session.userId || "")
    setUserName(session.userName || "")
    setUserEmail(session.userEmail || "")
    setUserPhone(session.userPhone || "")
    setIsLoading(false)
  }, [router])

  // The plan was switched off in Admin > Plans after sign-up: continue on Free
  useEffect(() => {
    if (pendingPlan && loaded && !plan) {
      const session = getClientSession()
      if (session) {
        session.pendingPlan = null
        localStorage.setItem("clientSession", JSON.stringify(session))
      }
      router.push("/client/upgrade")
    }
  }, [pendingPlan, loaded, plan, router])

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

  if (isLoading || !plan) return <CheckoutLoading />

  return (
    <PlanCheckout
      plan={plan}
      email={userEmail}
      greeting={userName ? `Welcome, ${userName.split(" ")[0]}` : undefined}
      paying={isPaymentLoading || isProcessing}
      canPay={!!userId}
      onPay={handlePayment}
      onSkip={handleSkip}
    />
  )
}
