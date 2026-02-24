"use client"

import { useState, useEffect, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import Image from "next/image"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check, Crown, Building2, Sparkles, Loader2, Shield, CreditCard } from "lucide-react"
import { toast } from "sonner"
import { useRazorpay } from "@/hooks/use-razorpay"

const planDetails: Record<string, {
  name: string
  price: string
  priceNum: number
  icon: any
  color: string
  features: string[]
}> = {
  professional: {
    name: "Professional",
    price: "₹2,999",
    priceNum: 299900,
    icon: Crown,
    color: "from-blue-500 to-indigo-600",
    features: [
      "Up to 3 events",
      "Up to 2,000 certificates/year",
      "Up to 5 certificate types",
      "Excel import",
      "Basic analytics"
    ]
  },
  enterprise: {
    name: "Enterprise",
    price: "₹6,999",
    priceNum: 699900,
    icon: Building2,
    color: "from-amber-500 to-orange-600",
    features: [
      "Up to 10 events",
      "Up to 25,000 certificates/year",
      "Up to 100 certificate types",
      "Bulk import",
      "Priority support",
      "Advanced analytics"
    ]
  },
  premium: {
    name: "Premium",
    price: "₹11,999",
    priceNum: 1199900,
    icon: Sparkles,
    color: "from-violet-500 to-purple-600",
    features: [
      "Up to 25 events",
      "Up to 50,000 certificates/year",
      "Up to 200 certificate types",
      "White-label branding",
      "API access",
      "Dedicated support"
    ]
  }
}

function PaymentPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { data: session, status } = useSession()
  const plan = searchParams.get("plan") as string
  const [userId, setUserId] = useState<string>("")
  const [userEmail, setUserEmail] = useState<string>("")
  const [userName, setUserName] = useState<string>("")

  const { initiatePayment, isLoading, isProcessing } = useRazorpay({
    onSuccess: async (data) => {
      toast.success("Payment successful! Redirecting...")
      // Clear pending plan from localStorage
      localStorage.removeItem("selectedPlan")
      // Update session
      const clientSession = {
        userId: userId,
        userName: userName,
        userEmail: userEmail,
        userPlan: data.plan,
        loginType: "user",
        loggedInAt: new Date().toISOString()
      }
      localStorage.setItem("clientSession", JSON.stringify(clientSession))
      // Redirect to events page
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
      // Fetch user ID from profile
      fetch("/api/client/profile").then(res => res.json()).then(data => {
        if (data.user?.id) setUserId(data.user.id)
      })
    }
  }, [session, status])

  // Redirect if no plan or invalid plan
  useEffect(() => {
    if (!plan || !planDetails[plan]) {
      router.push("/signup")
    }
  }, [plan, router])

  if (status === "loading" || !plan || !planDetails[plan]) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  const selectedPlan = planDetails[plan]
  const Icon = selectedPlan.icon

  const handlePayment = () => {
    if (!userId) {
      toast.error("Please wait, loading user data...")
      return
    }
    initiatePayment(plan as any, {
      id: userId,
      name: userName,
      email: userEmail,
      phone: ""
    })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-lg">CertiStage</span>
          </div>
          <Badge variant="outline" className="text-xs">Secure Checkout</Badge>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-12">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Complete Your Purchase</h1>
          <p className="text-gray-600">You're just one step away from unlocking premium features</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          {/* Plan Summary */}
          <Card className="overflow-hidden">
            <div className={`bg-gradient-to-r ${selectedPlan.color} p-6 text-white`}>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-xl bg-white/20 flex items-center justify-center">
                  <Icon className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold">{selectedPlan.name}</h2>
                  <p className="text-white/80 text-sm">Annual Subscription</p>
                </div>
              </div>
              <div className="flex items-baseline gap-1">
                <span className="text-4xl font-bold">{selectedPlan.price}</span>
                <span className="text-white/80">/year</span>
              </div>
            </div>
            <CardContent className="p-6">
              <h3 className="font-semibold mb-4 text-gray-900">What's included:</h3>
              <ul className="space-y-3">
                {selectedPlan.features.map((feature, i) => (
                  <li key={i} className="flex items-center gap-3">
                    <div className="h-5 w-5 rounded-full bg-neutral-100 flex items-center justify-center shrink-0">
                      <Check className="h-3 w-3 text-neutral-600" />
                    </div>
                    <span className="text-gray-700">{feature}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Payment Section */}
          <div className="space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 text-gray-900">Order Summary</h3>
                <div className="space-y-3">
                  <div className="flex justify-between text-gray-600">
                    <span>{selectedPlan.name} Plan (1 Year)</span>
                    <span>{selectedPlan.price}</span>
                  </div>
                  <div className="border-t pt-3 flex justify-between font-semibold text-lg">
                    <span>Total</span>
                    <span className="text-primary">{selectedPlan.price}</span>
                  </div>
                </div>

                <Button 
                  className={`w-full mt-6 h-12 text-base bg-gradient-to-r ${selectedPlan.color} hover:opacity-90`}
                  onClick={handlePayment}
                  disabled={isLoading || isProcessing || !userId}
                >
                  {isLoading || isProcessing ? (
                    <>
                      <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CreditCard className="h-5 w-5 mr-2" />
                      Pay {selectedPlan.price}
                    </>
                  )}
                </Button>

                <div className="mt-4 flex items-center justify-center gap-2 text-sm text-gray-500">
                  <Shield className="h-4 w-4" />
                  <span>Secured by Razorpay</span>
                </div>
              </CardContent>
            </Card>

            <div className="text-center text-sm text-gray-500">
              <p>By completing this purchase, you agree to our</p>
              <p>
                <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
                {" & "}
                <a href="/refund" className="text-primary hover:underline">Refund Policy</a>
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default function CompletePaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <PaymentPageContent />
    </Suspense>
  )
}


