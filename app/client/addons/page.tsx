"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Mail, MessageCircle, Award, EyeOff } from "lucide-react"
import { ADDONS, emailPackName } from "@/lib/addons"
import { formatInr } from "@/lib/plan-config"
import { EmailPacks } from "@/components/client/email-packs"
import { cn } from "@/lib/utils"
import { StatusTag } from "@/components/client/addon-status-tag"

interface Quota {
  planUsed: number
  planLimit: number
  planRemaining: number
  credits: number
  remaining: number
}

interface Purchase {
  _id: string
  addonEmails?: number
  amount: number
  invoiceNumber?: string
  createdAt: string
}

const ICONS: Record<string, typeof Mail> = { emails: Mail, whatsapp: MessageCircle, certificates: Award, branding: EyeOff }

const n = (v: number) => v.toLocaleString("en-IN")

export default function AddonsPage() {
  const [quota, setQuota] = useState<Quota | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/addons")
      if (!res.ok) return
      const data = await res.json()
      setQuota(data.quota)
      setPurchases(data.purchases || [])
    } catch {}
  }, [])

  useEffect(() => { load() }, [load])

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-[28px] font-semibold text-neutral-900 tracking-tight leading-none">Add-ons</h1>
        <p className="text-[14px] text-neutral-500 mt-2 max-w-xl">
          Extras on top of your plan. Pay once by UPI, card or net banking; a receipt is emailed after every payment.
        </p>
      </div>

      <div className="space-y-4">
        {ADDONS.map((addon) => {
          const Icon = ICONS[addon.id] || Mail
          const soon = addon.status === "soon"
          return (
            <section
              key={addon.id}
              id={addon.id}
              className={cn("rounded-xl border bg-white p-5 md:p-6", soon ? "border-neutral-200 bg-neutral-50/40" : "border-neutral-200")}
            >
              <div className="flex flex-col md:flex-row md:items-start justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <span className={cn("h-9 w-9 shrink-0 rounded-lg flex items-center justify-center", soon ? "bg-neutral-100 text-neutral-400" : "bg-neutral-900 text-white")}>
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-[16px] font-semibold text-neutral-900 flex items-center gap-2">
                      {addon.title} <StatusTag status={addon.status} />
                    </h2>
                    <p className={cn("text-[13px] mt-0.5 max-w-xl", soon ? "text-neutral-400" : "text-neutral-500")}>{addon.description}</p>
                  </div>
                </div>
                {addon.id === "emails" && quota && (
                  <div className="md:text-right shrink-0">
                    <p className="text-[12px] text-neutral-500">Emails left</p>
                    <p className="text-[22px] font-semibold text-neutral-900 leading-tight">{quota.remaining === -1 ? "No limit" : n(quota.remaining)}</p>
                    {quota.planLimit !== -1 && (
                      <p className="text-[11px] text-neutral-500">
                        {n(quota.planRemaining)} of {n(quota.planLimit)} on your plan · {n(quota.credits)} add-on
                      </p>
                    )}
                  </div>
                )}
              </div>

              {addon.id === "emails" && (
                <div className="mt-5">
                  <EmailPacks onBought={() => load()} />
                  <p className="text-[12px] text-neutral-500 mt-3">
                    Send them from <Link href="/client/recipients" className="underline">Recipients → Email certificates</Link> and follow every email in the{" "}
                    <Link href="/client/email-log" className="underline">Email log</Link>.
                  </p>
                </div>
              )}
            </section>
          )
        })}
      </div>

      {purchases.length > 0 && (
        <div className="mt-8">
          <h2 className="text-[14px] font-semibold text-neutral-900 mb-2">Your purchases</h2>
          <div className="rounded-xl border border-neutral-200 bg-white divide-y divide-neutral-100">
            {purchases.map((p) => (
              <div key={p._id} className="flex items-center justify-between gap-3 px-4 py-3 text-[13px]">
                <div>
                  <p className="font-medium text-neutral-900">{emailPackName({ emails: p.addonEmails || 0 })}</p>
                  <p className="text-neutral-500">
                    {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                    {p.invoiceNumber && <> · {p.invoiceNumber}</>}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-medium text-neutral-900">{formatInr(p.amount)}</span>
                  {p.invoiceNumber && (
                    <a href={`/api/invoices/${encodeURIComponent(p.invoiceNumber)}/pdf`} className="text-neutral-600 underline" target="_blank" rel="noreferrer">
                      Receipt
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
