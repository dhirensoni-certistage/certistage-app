"use client"

import { useCallback, useState } from "react"
import { toast } from "sonner"
import { loadRazorpayScript, type RazorpayPaymentResponse } from "@/lib/razorpay"
import { getClientSession } from "@/lib/auth"

/** Buys a pack of certificate emails (lib/addons) through Razorpay Checkout */
export function useBuyEmails(onBought?: (emails: number) => void) {
  const [busyPack, setBusyPack] = useState<string | null>(null)

  /** packId of a listed pack, or "custom" with a number of emails */
  const buy = useCallback(async (packId: string, customEmails?: number) => {
    setBusyPack(packId)
    try {
      if (!(await loadRazorpayScript())) throw new Error("Failed to load payment gateway")
      const res = await fetch("/api/client/addons/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(packId === "custom" ? { emails: customEmails } : { packId }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to start payment")

      const session = getClientSession()
      const checkout = new (window as any).Razorpay({
        key: data.razorpayKeyId,
        amount: data.order.amount,
        currency: data.order.currency,
        name: "CertiStage",
        description: data.description,
        order_id: data.order.id,
        prefill: { name: data.prefill?.name || session?.userName || "", email: data.prefill?.email || session?.userEmail || "", contact: session?.userPhone || "" },
        theme: { color: "#111111" },
        handler: async (response: RazorpayPaymentResponse) => {
          try {
            const verify = await fetch("/api/client/addons/verify", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(response),
            })
            const result = await verify.json()
            if (!verify.ok) throw new Error(result.error || "Payment verification failed")
            toast.success(`${Number(result.emails).toLocaleString("en-IN")} emails added to your account`, { description: "A receipt has been emailed to you." })
            onBought?.(result.emails)
          } catch (error: any) {
            toast.error(error?.message || "Payment verification failed", { description: "If money was deducted, the emails will be added automatically within a few minutes." })
          } finally {
            setBusyPack(null)
          }
        },
        modal: { ondismiss: () => setBusyPack(null) },
      })
      checkout.open()
    } catch (error: any) {
      toast.error(error?.message || "Failed to start payment")
      setBusyPack(null)
    }
  }, [onBought])

  return { buy, busyPack }
}
