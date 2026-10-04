"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { Check, Loader2, Lock, ShieldCheck, Zap, Receipt, Award, CalendarDays, Layers } from "lucide-react"
import { Button } from "@/components/ui/button"
import { formatInr, mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"

/** The plan as currently on sale (Admin > Plans), or null when it isn't. `loaded` turns true once the live list is in. */
export function useLivePlan(planId: string | null) {
  const [plan, setPlan] = useState<PlanConfig | null>(null)
  // Which plan id the live list was checked for, so "loaded" never refers to an earlier id
  const [checkedFor, setCheckedFor] = useState<string | null>(null)

  useEffect(() => {
    if (!planId) return
    const pick = (raw: unknown) =>
      mergePlanConfigWithDefaults(raw).find((p) => p.id === planId && p.enabled !== false && p.price > 0) || null

    try {
      const cached = localStorage.getItem("plan_config")
      if (cached) setPlan(pick(JSON.parse(cached)))
    } catch {}

    fetch("/api/plan-config")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (Array.isArray(data?.plans)) {
          setPlan(pick(data.plans))
          try { localStorage.setItem("plan_config", JSON.stringify(data.plans)) } catch {}
        }
      })
      .catch(() => {})
      .finally(() => setCheckedFor(planId))
  }, [planId])

  return { plan: planId ? plan : null, loaded: !planId || checkedFor === planId }
}

const n = (v: number) => v.toLocaleString("en-IN")
const planTitle = (name: string) => (/\bplan$/i.test(name.trim()) ? name.trim() : `${name.trim()} plan`)

/** What the plan includes, from its limits, plus any extra lines written in Admin > Plans */
function includedItems(plan: PlanConfig): string[] {
  const l = plan.limits
  const items: string[] = []
  if (l.maxCertificates) items.push(l.maxCertificates === -1 ? "Unlimited certificates" : `${n(l.maxCertificates)} certificates a year`)
  if (l.maxEvents) items.push(l.maxEvents === -1 ? "Unlimited events" : `Up to ${n(l.maxEvents)} event${l.maxEvents === 1 ? "" : "s"}`)
  if (l.maxCertificateTypes) items.push(l.maxCertificateTypes === -1 ? "Unlimited certificate designs" : `Up to ${n(l.maxCertificateTypes)} certificate design${l.maxCertificateTypes === 1 ? "" : "s"}`)
  if (l.canImportData) items.push("Excel import for recipient lists")
  if (l.canExportReport) items.push("Download and recipient reports")
  if (l.downloadLimit === -1) items.push("Unlimited downloads per recipient")
  items.push("Personal download page and LinkedIn sharing for every recipient")

  const seen = new Set(items.map((i) => i.toLowerCase()))
  // Skip admin-written lines that repeat a limit above, e.g. "Up to 2,000 certificates/year"
  const repeatsLimit = (text: string) => {
    const num = Number((text.match(/\d[\d,]*/) || [""])[0].replace(/,/g, ""))
    const t = text.toLowerCase()
    return (num > 0 && t.includes("certificate") && !t.includes("design") && num === l.maxCertificates)
      || (num > 0 && t.includes("event") && num === l.maxEvents)
  }
  for (const f of plan.features || []) {
    const text = String(f || "").trim()
    if (text && !seen.has(text.toLowerCase()) && !repeatsLimit(text)) {
      seen.add(text.toLowerCase())
      items.push(text)
    }
  }
  return items
}

function Stat({ icon: Icon, value, label }: { icon: typeof Award; value: string; label: string }) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white px-4 py-3.5">
      <Icon className="h-4 w-4 text-gold-deep" />
      <p className="mt-2 text-[20px] font-semibold text-neutral-900 tabular-nums leading-none">{value}</p>
      <p className="mt-1 text-[12px] text-neutral-500">{label}</p>
    </div>
  )
}

/**
 * Checkout for one plan: what's included on the left, the order summary and Pay button on the right.
 * Used after sign-up (Google and email). Payment itself is handled by the caller (useRazorpay).
 */
export function PlanCheckout({
  plan,
  email,
  greeting,
  paying,
  canPay,
  onPay,
  onSkip,
}: {
  plan: PlanConfig
  email?: string
  greeting?: string
  paying: boolean
  canPay: boolean
  onPay: () => void
  onSkip?: () => void
}) {
  const l = plan.limits
  const validUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  const stat = (v: number) => (v === -1 ? "Unlimited" : n(v))
  const title = planTitle(plan.name)

  return (
    <div className="min-h-screen bg-neutral-50">
      <header className="bg-white border-b border-neutral-200">
        <div className="max-w-6xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <Image src="/Certistage_icon.svg" alt="" width={30} height={30} />
            <span className="text-[17px] font-semibold text-neutral-900 tracking-tight">CertiStage</span>
          </Link>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-[12px] font-medium text-neutral-600">
            <Lock className="h-3 w-3" /> Secure checkout
          </span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-14">
        <div className="mb-7 md:mb-9 max-w-2xl">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">{greeting || "Checkout"}</p>
          <h1 className="mt-2 text-[30px] md:text-[36px] font-semibold text-neutral-900 tracking-tight leading-[1.1]">
            Activate your {title}
          </h1>
          <p className="mt-3 text-[15px] text-neutral-500 leading-relaxed">
            {plan.description && !/test payments/i.test(plan.description)
              ? plan.description
              : "Everything you need to issue, deliver and track certificates for your events, ready the moment you pay."}
          </p>
        </div>

        <div className="grid gap-8 lg:gap-12 lg:grid-cols-[1fr_400px] lg:items-start">
          {/* Plan */}
          <section>
            {(l.maxCertificates || l.maxEvents || l.maxCertificateTypes) ? (
              <div className="grid grid-cols-3 gap-3 max-w-xl">
                <Stat icon={Award} value={stat(l.maxCertificates)} label="certificates / year" />
                <Stat icon={CalendarDays} value={stat(l.maxEvents)} label={l.maxEvents === 1 ? "event" : "events"} />
                <Stat icon={Layers} value={stat(l.maxCertificateTypes)} label={l.maxCertificateTypes === 1 ? "design" : "designs"} />
              </div>
            ) : null}

            <div className="mt-8 rounded-2xl border border-neutral-200 bg-white p-6 md:p-7 max-w-xl">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500">What&apos;s included</p>
              <ul className="mt-4 space-y-3">
                {includedItems(plan).map((item) => (
                  <li key={item} className="flex items-start gap-2.5 text-[14px] text-neutral-700 leading-snug">
                    <span className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full bg-neutral-900 flex items-center justify-center">
                      <Check className="h-3 w-3 text-white" strokeWidth={3} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 max-w-xl text-[12.5px] text-neutral-600">
              <p className="flex items-center gap-2"><Zap className="h-4 w-4 text-gold-deep shrink-0" /> Active right after payment</p>
              <p className="flex items-center gap-2"><Receipt className="h-4 w-4 text-gold-deep shrink-0" /> Invoice sent by email</p>
              <p className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-gold-deep shrink-0" /> No auto-renewal</p>
            </div>
          </section>

          {/* Order summary */}
          {/* On phones the summary and Pay button come first */}
          <aside className="order-first lg:order-none lg:sticky lg:top-8">
            <div className="rounded-2xl bg-white border border-neutral-200 shadow-[0_8px_30px_rgba(0,0,0,0.06)] overflow-hidden">
              <div className="bg-neutral-950 text-white px-6 py-5">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[13px] text-white/60">Order summary</p>
                  {plan.badge && !/^test$/i.test(plan.badge) && (
                    <span className="rounded px-1.5 py-px text-[10px] font-semibold uppercase tracking-wider bg-gold-light/15 text-gold-light">{plan.badge}</span>
                  )}
                </div>
                <p className="mt-1.5 text-[19px] font-semibold">{title}</p>
                <p className="mt-3 flex items-baseline gap-1.5">
                  <span className="text-[34px] font-semibold tracking-tight tabular-nums leading-none">{formatInr(plan.price)}</span>
                  <span className="text-[13px] text-white/50">/ year</span>
                </p>
              </div>

              <div className="px-6 py-5">
                <dl className="space-y-2.5 text-[13.5px]">
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">{title}, 1 year</dt>
                    <dd className="text-neutral-900 tabular-nums">{formatInr(plan.price)}</dd>
                  </div>
                  <div className="flex justify-between gap-3">
                    <dt className="text-neutral-500">Valid until</dt>
                    <dd className="text-neutral-900">{validUntil}</dd>
                  </div>
                  {email && (
                    <div className="flex justify-between gap-3">
                      <dt className="text-neutral-500">Account</dt>
                      <dd className="text-neutral-900 truncate max-w-[200px]" title={email}>{email}</dd>
                    </div>
                  )}
                </dl>
                <div className="mt-4 pt-4 border-t border-neutral-200 flex items-baseline justify-between">
                  <span className="text-[15px] font-semibold text-neutral-900">Total due today</span>
                  <span className="text-[22px] font-semibold text-neutral-900 tabular-nums">{formatInr(plan.price)}</span>
                </div>

                <Button
                  className="w-full h-12 mt-5 bg-neutral-900 text-white hover:bg-black text-[15px] font-medium"
                  disabled={paying || !canPay}
                  onClick={onPay}
                >
                  {paying ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processing…</> : <>Pay {formatInr(plan.price)} and activate</>}
                </Button>
                <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-neutral-500">
                  <Lock className="h-3 w-3" /> Secured by Razorpay · UPI, cards, net banking
                </p>

                {onSkip && (
                  <button type="button" onClick={onSkip} className="mt-4 w-full text-center text-[13px] text-neutral-500 hover:text-neutral-900 underline-offset-4 hover:underline">
                    Continue on the Free plan for now
                  </button>
                )}
              </div>
            </div>

            <p className="mt-4 text-center text-[12px] text-neutral-500 leading-relaxed">
              By paying you agree to our{" "}
              <a href="/terms" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">Terms of Service</a> and{" "}
              <a href="/refund" className="text-neutral-700 underline underline-offset-2 hover:text-neutral-900">Refund Policy</a>.
            </p>
          </aside>
        </div>
      </main>
    </div>
  )
}

export function CheckoutLoading() {
  return (
    <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
      <Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
    </div>
  )
}
