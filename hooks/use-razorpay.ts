"use client"

import { useState, useCallback } from "react"
import { 
  loadRazorpayScript, 
  PLAN_DETAILS, 
  type PlanId,
  type RazorpayPaymentResponse
} from "@/lib/razorpay"
import { toast } from "sonner"

interface UseRazorpayOptions {
  onSuccess?: (data: any) => void
  onError?: (error: string) => void
}

interface UserDetails {
  id: string
  name: string
  email: string
  phone?: string
}

export function useRazorpay(options: UseRazorpayOptions = {}) {
  const [isLoading, setIsLoading] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)

  const initiatePayment = useCallback(async (plan: PlanId, user: UserDetails) => {
    if (plan === "free") {
      toast.error("Free plan does not require payment")
      return
    }

    setIsLoading(true)

    try {
      // Load Razorpay script
      const scriptLoaded = await loadRazorpayScript()
      if (!scriptLoaded) {
        throw new Error("Failed to load payment gateway")
      }

      // Create order via API (API will get credentials from database or env)
      const orderResponse = await fetch("/api/razorpay/create-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plan,
          userId: user.id,
          userEmail: user.email,
          userName: user.name
        })
      })

      const orderData = await orderResponse.json()

      if (!orderResponse.ok || !orderData.success) {
        throw new Error(orderData.error || "Failed to create order")
      }

      const { order, razorpayKeyId, proRata } = orderData
      const planDetails = PLAN_DETAILS[plan]
      
      // Build description with pro-rata info if applicable
      let description = `${planDetails.name} Plan - Annual Subscription`
      if (proRata && proRata.unusedCredit > 0) {
        description = `${planDetails.name} Plan Upgrade (₹${(proRata.savings / 100).toLocaleString("en-IN")} credit applied)`
      }

      // Open Razorpay checkout
      const razorpayOptions = {
        key: razorpayKeyId,
        amount: order.amount,
        currency: order.currency,
        name: "CertiStage",
        description: description,
        order_id: order.id,
        prefill: {
          name: user.name,
          email: user.email,
          contact: user.phone || ""
        },
        theme: {
          color: "#6366f1"
        },
        handler: async function(response: RazorpayPaymentResponse) {
          setIsProcessing(true)
          try {
            // Verify payment (API will get credentials from database or env)
            const verifyResponse = await fetch("/api/razorpay/verify-payment", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                razorpay_order_id: response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature: response.razorpay_signature,
                plan,
                userId: user.id
              })
            })

            const verifyData = await verifyResponse.json()

            if (!verifyResponse.ok || !verifyData.success) {
              throw new Error(verifyData.error || "Payment verification failed")
            }

            toast.success("Payment successful! Your plan has been upgraded.")
            options.onSuccess?.(verifyData.data)
          } catch (error: any) {
            toast.error(error.message || "Payment verification failed")
            options.onError?.(error.message)
          } finally {
            setIsProcessing(false)
          }
        },
        modal: {
          ondismiss: function() {
            setIsLoading(false)
            toast.info("Payment cancelled")
          }
        }
      }

      const razorpay = new (window as any).Razorpay(razorpayOptions)
      razorpay.open()
      setIsLoading(false)
    } catch (error: any) {
      console.error("Payment error:", error)
      toast.error(error.message || "Failed to initiate payment")
      options.onError?.(error.message)
      setIsLoading(false)
    }
  }, [options])

  return {
    initiatePayment,
    isLoading,
    isProcessing
  }
}

