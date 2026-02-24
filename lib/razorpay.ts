// Razorpay Configuration and Utilities

// Get config from localStorage (client-side) or env (server-side)
export function getRazorpayConfig() {
  if (typeof window !== "undefined") {
    const saved = localStorage.getItem("payment_config")
    if (saved) {
      try {
        const config = JSON.parse(saved)
        // Return razorpay config from payment_config structure
        if (config.razorpay) {
          return {
            keyId: config.razorpay.keyId || "",
            keySecret: config.razorpay.keySecret || "",
            isLive: config.razorpay.isLive || false
          }
        }
        return {
          keyId: config.keyId || "",
          keySecret: config.keySecret || "",
          isLive: config.isLive || false
        }
      } catch (e) {
        console.error("Error parsing Razorpay config")
      }
    }
  }
  
  // Fallback to env variables
  return {
    keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "",
    keySecret: process.env.RAZORPAY_KEY_SECRET || "",
    isLive: process.env.RAZORPAY_LIVE_MODE === "true"
  }
}

// Plan pricing in paise (Razorpay uses smallest currency unit)
export const PLAN_PRICES = {
  free: 0,
  professional: 299900, // ₹2,999
  enterprise: 699900,   // ₹6,999
  premium: 1199900      // ₹11,999
} as const

export const PLAN_DETAILS = {
  free: {
    name: "Free",
    price: 0,
    displayPrice: "₹0",
    description: "Trial - 50 certificates"
  },
  professional: {
    name: "Professional",
    price: 299900,
    displayPrice: "₹2,999/year",
    description: "Up to 3 events, 2,000 certificates"
  },
  enterprise: {
    name: "Enterprise",
    price: 699900,
    displayPrice: "₹6,999/year",
    description: "Up to 10 events, 25,000 certificates"
  },
  premium: {
    name: "Premium",
    price: 1199900,
    displayPrice: "₹11,999/year",
    description: "Up to 25 events, 50,000 certificates"
  }
} as const

export type PlanId = keyof typeof PLAN_PRICES

export interface RazorpayOrder {
  id: string
  amount: number
  currency: string
  receipt: string
  status: string
}

export interface RazorpayPaymentResponse {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

// Generate unique order receipt
export function generateReceipt(): string {
  return `rcpt_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`
}

// Format amount for display
export function formatAmount(amountInPaise: number): string {
  return `₹${(amountInPaise / 100).toLocaleString("en-IN")}`
}

// Load Razorpay script dynamically
export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && (window as any).Razorpay) {
      resolve(true)
      return
    }
    
    const script = document.createElement("script")
    script.src = "https://checkout.razorpay.com/v1/checkout.js"
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

// Create Razorpay order (client-side call to API)
export async function createRazorpayOrder(plan: PlanId, userId: string, userEmail: string, userName: string) {
  const response = await fetch("/api/razorpay/create-order", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plan, userId, userEmail, userName })
  })
  
  const data = await response.json()
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Failed to create order")
  }
  
  return data.order
}

// Verify payment (client-side call to API)
export async function verifyRazorpayPayment(
  orderId: string,
  paymentId: string,
  signature: string,
  plan: PlanId,
  userId: string
) {
  const response = await fetch("/api/razorpay/verify-payment", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      razorpay_order_id: orderId,
      razorpay_payment_id: paymentId,
      razorpay_signature: signature,
      plan,
      userId
    })
  })
  
  const data = await response.json()
  
  if (!response.ok || !data.success) {
    throw new Error(data.error || "Payment verification failed")
  }
  
  return data.data
}

// Open Razorpay checkout
export async function openRazorpayCheckout(
  order: RazorpayOrder,
  plan: PlanId,
  user: { id: string; name: string; email: string; phone?: string },
  onSuccess: (response: RazorpayPaymentResponse) => void,
  onError: (error: string) => void
) {
  const config = getRazorpayConfig()
  
  if (!config.keyId) {
    onError("Payment gateway not configured. Please contact support.")
    return
  }
  
  const planDetails = PLAN_DETAILS[plan]
  
  const options = {
    key: config.keyId,
    amount: order.amount,
    currency: order.currency,
    name: "CertiStage",
    description: `${planDetails.name} Plan - Annual Subscription`,
    order_id: order.id,
    prefill: {
      name: user.name,
      email: user.email,
      contact: user.phone || ""
    },
    theme: {
      color: "#6366f1"
    },
    handler: function(response: RazorpayPaymentResponse) {
      onSuccess(response)
    },
    modal: {
      ondismiss: function() {
        onError("Payment cancelled")
      }
    }
  }
  
  const razorpay = new (window as any).Razorpay(options)
  razorpay.open()
}

