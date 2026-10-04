"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { Download, Receipt, Loader2, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatInr } from "@/lib/plan-config"
import { cn } from "@/lib/utils"

interface BillingData {
  plan: { id: string; name: string; startedAt: string | null; expiresAt: string | null }
  payments: Array<{
    id: string
    description: string
    amount: number
    status: "success" | "refunded"
    refundAmount: number
    paidAt: string
    invoiceNumber: string | null
    paymentId: string | null
  }>
}

const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })

/** Current plan + payment history with a PDF receipt for every payment. Used on Billing and in Settings. */
export function BillingPanel() {
  const [data, setData] = useState<BillingData | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch("/api/client/billing")
      .then(async (res) => {
        const body = await res.json()
        if (!res.ok) throw new Error(body.error || "Failed to load billing")
        setData(body)
      })
      .catch((e) => setError(e.message || "Failed to load billing"))
  }, [])

  if (error) return <p className="text-[13.5px] text-red-600">{error}</p>
  if (!data) {
    return (
      <div className="flex items-center justify-center py-16 text-neutral-400">
        <Loader2 className="h-5 w-5 animate-spin" />
      </div>
    )
  }

  const isPaid = data.plan.id !== "free"
  const daysLeft = data.plan.expiresAt ? Math.ceil((new Date(data.plan.expiresAt).getTime() - Date.now()) / 86400000) : null
  const totalPaid = data.payments.filter((p) => p.status === "success").reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-5">
      <div className="grid gap-4 sm:grid-cols-[1.4fr_1fr]">
        <div className="rounded-2xl bg-neutral-950 text-white p-5 md:p-6">
          <p className="text-[12px] text-white/55">Current plan</p>
          <p className="mt-1 text-[22px] font-semibold tracking-tight flex items-center gap-2">
            <span className={cn("h-2 w-2 rounded-full", isPaid ? "bg-gold-light" : "bg-white/40")} />
            {data.plan.name}
          </p>
          <p className="mt-1 text-[13px] text-white/60">
            {isPaid && data.plan.expiresAt
              ? daysLeft !== null && daysLeft > 0
                ? `Active until ${fmtDate(data.plan.expiresAt)} · ${daysLeft} day${daysLeft === 1 ? "" : "s"} left`
                : `Expired on ${fmtDate(data.plan.expiresAt)}`
              : "Upgrade for more events, certificates and Excel import."}
          </p>
          <Button asChild size="sm" className="mt-4 h-8 bg-white text-neutral-900 hover:bg-white/90 text-[12.5px]">
            <Link href="/client/upgrade">{isPaid ? "Change or renew plan" : "See plans"} <ArrowRight className="h-3.5 w-3.5 ml-1" /></Link>
          </Button>
        </div>
        <div className="rounded-2xl border border-neutral-200 bg-white p-5 md:p-6">
          <p className="text-[12px] text-neutral-500">Total paid</p>
          <p className="mt-1 text-[22px] font-semibold text-neutral-900 tracking-tight tabular-nums">{formatInr(totalPaid)}</p>
          <p className="mt-1 text-[13px] text-neutral-500">{data.payments.length} payment{data.payments.length === 1 ? "" : "s"} · receipts below</p>
        </div>
      </div>

      <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Payments and receipts</h2>
            <p className="text-[12.5px] text-neutral-500 mt-0.5">Download a PDF receipt for any payment, whenever you need it.</p>
          </div>
        </div>

        {data.payments.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Receipt className="h-5 w-5 mx-auto text-neutral-300" />
            <p className="mt-2 text-[13.5px] text-neutral-500">No payments yet. Your receipts will appear here after you buy a plan.</p>
          </div>
        ) : (
          <>
            <div className="hidden md:grid grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto] gap-4 px-5 py-2.5 bg-neutral-50 text-[11px] font-semibold uppercase tracking-wider text-neutral-500">
              <span>Description</span><span>Receipt</span><span>Date</span><span className="text-right">Amount</span><span className="w-[92px]" />
            </div>
            <ul className="divide-y divide-neutral-100">
              {data.payments.map((p) => (
                <li key={p.id} className="px-5 py-4 md:py-3.5 grid gap-1.5 md:gap-4 md:grid-cols-[1.6fr_1fr_0.8fr_0.8fr_auto] md:items-center text-[13.5px]">
                  <div className="min-w-0">
                    <p className="font-medium text-neutral-900 truncate">{p.description}</p>
                    <p className="text-[12px] text-neutral-500 md:hidden">{fmtDate(p.paidAt)}{p.invoiceNumber ? ` · ${p.invoiceNumber}` : ""}</p>
                  </div>
                  <p className="hidden md:block font-mono text-[12.5px] text-neutral-600 truncate" title={p.invoiceNumber || undefined}>{p.invoiceNumber || "-"}</p>
                  <p className="hidden md:block text-neutral-600">{fmtDate(p.paidAt)}</p>
                  <p className="md:text-right font-semibold text-neutral-900 tabular-nums">
                    {formatInr(p.amount)}
                    {p.status === "refunded" && <span className="ml-2 rounded bg-neutral-100 px-1.5 py-px text-[10.5px] font-medium text-neutral-600 uppercase tracking-wide">Refunded</span>}
                  </p>
                  <div className="md:w-[92px] md:text-right">
                    {p.invoiceNumber ? (
                      <a
                        href={`/api/invoices/${encodeURIComponent(p.invoiceNumber)}/pdf`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-md border border-neutral-200 px-2.5 h-8 text-[12.5px] font-medium text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50"
                      >
                        <Download className="h-3.5 w-3.5" /> Receipt
                      </a>
                    ) : (
                      <span className="text-[12px] text-neutral-400">Not available</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>

      <p className="text-[12.5px] text-neutral-500">
        Need a receipt with your organization&apos;s details or have a billing question? Write to{" "}
        <a href="mailto:support@certistage.com" className="text-neutral-800 underline underline-offset-2">support@certistage.com</a>.
      </p>
    </div>
  )
}
