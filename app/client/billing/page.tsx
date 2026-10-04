"use client"

import { BillingPanel } from "@/components/client/billing-panel"

export default function BillingPage() {
  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight">Billing</h1>
        <p className="text-[14px] text-neutral-500 mt-1">Your plan, payments and receipts.</p>
      </div>
      <BillingPanel />
    </div>
  )
}
