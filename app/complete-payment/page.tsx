"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { useRazorpay } from "@/hooks/use-razorpay"
import { PlanCheckout, CheckoutLoading, useLivePlan } from "@/components/checkout/plan-checkout"

// Checkout right after Google sign-up (the plan comes from the signup page)
function PaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const planId = searchParams.get("plan")
  const { plan, loaded } = useLivePlan(planId)
  const [userId, setUserId] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")

  const { initiatePayment, isLoading, isProcessing } = useRazorpay({
    onSuccess: async (data) => {
      toast.success("Payment successful! Redirecting...")
      localStorage.removeItem("selectedPlan")
      const clientSession = {
        userId,
        userName,
        userEmail,
        userPlan: data.plan,
        pendingPlan: null,
        loginType: "user",
        loggedInAt: new Date().toISOString()
      }
      localStorage.setItem("clientSession", JSON.stringify(clientSession))
      setTimeout(() => router.push("/client/events"), 1500)
    },
    onError: (error) => {
      console.error("Payment error:", error)
    }
  })

  useEffect(() => {
    if (status === "authenticated" && session?.user) {
      setUserEmail(session.user.email || "")
      setUserName(session.user.name || "")
      fetch("/api/client/profile").then(res => res.json()).then(data => {
        if (data.user?.id) setUserId(data.user.id)
      }).catch(() => {})
    }
  }, [session, status])

  // Leave if there is no plan, or it isn't on sale (checked against the live plan list)
  useEffect(() => {
    if (!planId || (loaded && !plan)) {
      router.push(planId ? "/client/upgrade" : "/signup")
    }
  }, [planId, loaded, plan, router])

  if (status === "loading" || !plan) return <CheckoutLoading />

  const handlePayment = () => {
    if (!userId) {
      toast.error("Please wait, loading your account...")
      return
    }
    initiatePayment(plan.id as any, { id: userId, name: userName, email: userEmail, phone: "" })
  }

  return (
    <PlanCheckout
      plan={plan}
      email={userEmail}
      greeting={userName ? `Welcome, ${userName.split(" ")[0]}` : undefined}
      paying={isLoading || isProcessing}
      canPay={!!userId}
      onPay={handlePayment}
      onSkip={() => router.push("/client/events")}
    />
  )
}

export default function CompletePaymentPage() {
  return (
    <Suspense fallback={<CheckoutLoading />}>
      <PaymentPageContent />
    </Suspense>
  )
}
