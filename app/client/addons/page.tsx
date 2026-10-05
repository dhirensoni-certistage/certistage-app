"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { Mail, MessageCircle, Award, EyeOff, Check, ArrowRight, Receipt, Infinity as InfinityIcon, Loader2, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { ADDONS, emailPackName } from "@/lib/addons"
import { formatInr } from "@/lib/plan-config"
import { EmailPacks } from "@/components/client/email-packs"
import { StatusTag } from "@/components/client/addon-status-tag"
import { cn } from "@/lib/utils"

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

const EMAIL_FEATURES = [
  "A personal email to every recipient with their own download button",
  "Reminders only to people who haven't downloaded",
  "Delivered, opened, clicked and bounced for every email in the Email log",
  "Sent as your organization, replies come straight to you",
]

const FAQ = [
  { q: "When are add-on emails used?", a: "Your plan's emails are used first. Add-on emails start only after those run out, and they never expire." },
  { q: "What counts as one email?", a: "One email to one person. A reminder to the same person is another email." },
  { q: "Do I get a receipt?", a: "Yes. A receipt is emailed right after payment and is always available below under Purchase history." },
]

const n = (v: number) => v.toLocaleString("en-IN")

export default function AddonsPage() {
  const [quota, setQuota] = useState<Quota | null>(null)
  const [purchases, setPurchases] = useState<Purchase[]>([])
  // Early-access requests already made (from the server) and the one being sent right now
  const [requested, setRequested] = useState<Record<string, string>>({})
  const [requesting, setRequesting] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/client/addons")
      if (!res.ok) return
      const data = await res.json()
      setQuota(data.quota)
      setPurchases(data.purchases || [])
      const map: Record<string, string> = {}
      for (const r of data.requests || []) if (r?.addonId) map[r.addonId] = r.requestedAt
      setRequested(map)
    } catch {}
  }, [])

  const requestAccess = async (addonId: string) => {
    setRequesting(addonId)
    try {
      const res = await fetch("/api/client/addons/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ addonId })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not send the request"); return }
      setRequested((prev) => ({ ...prev, [addonId]: data.requestedAt || new Date().toISOString() }))
      toast.success(data.alreadyRequested ? "You already asked for this one. We'll be in touch." : "Request submitted. We'll email you when it's ready.")
    } catch {
      toast.error("Could not send the request")
    } finally {
      setRequesting(null)
    }
  }

  useEffect(() => { load() }, [load])

  const emails = ADDONS.find((a) => a.id === "emails")!
  const upcoming = ADDONS.filter((a) => a.id !== "emails")
  const unlimited = quota?.remaining === -1
  const planShare = quota && quota.planLimit > 0 ? Math.min(100, (quota.planRemaining / quota.planLimit) * 100) : 0

  return (
    <div className="p-4 md:p-10 max-w-6xl mx-auto">
      {/* Header + balance */}
      <div className="grid gap-5 lg:grid-cols-[1fr_340px] lg:items-end mb-8">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-gold-deep">Billing</p>
          <h1 className="mt-2 text-[30px] md:text-[34px] font-semibold text-neutral-900 tracking-tight leading-[1.1]">Add-ons</h1>
          <p className="text-[15px] text-neutral-500 mt-2.5 max-w-xl leading-relaxed">
            Grow what your plan can do, without changing plan. Pay once by UPI, card or net banking.
          </p>
        </div>

        <div className="rounded-2xl bg-neutral-950 text-white p-5 shadow-[0_8px_30px_rgba(0,0,0,0.12)]">
          <div className="flex items-center justify-between">
            <p className="text-[12px] text-white/60">Certificate emails left</p>
            <Mail className="h-4 w-4 text-gold-light" />
          </div>
          <p className="mt-1 text-[32px] font-semibold tracking-tight tabular-nums leading-tight">
            {quota ? (unlimited ? "No limit" : n(quota.remaining)) : <span className="inline-block h-8 w-28 rounded bg-white/10 animate-pulse" />}
          </p>
          {quota && !unlimited && (
            <>
              <div className="mt-3 h-1.5 rounded-full bg-white/10 overflow-hidden">
                <div className="h-full rounded-full bg-gold-light" style={{ width: `${planShare}%` }} />
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-[12px]">
                <div>
                  <p className="text-white/50">From your plan</p>
                  <p className="font-medium tabular-nums">{n(quota.planRemaining)} <span className="text-white/40">of {n(quota.planLimit)}</span></p>
                </div>
                <div>
                  <p className="text-white/50">Add-on</p>
                  <p className="font-medium tabular-nums flex items-center gap-1">{n(quota.credits)} <InfinityIcon className="h-3 w-3 text-white/40" aria-label="never expire" /></p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Featured: certificate emails */}
      <section id="emails" className="rounded-2xl border border-neutral-200 bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.04)]">
        <div className="grid lg:grid-cols-[1.15fr_1fr]">
          <div className="p-6 md:p-8">
            <div className="flex items-center gap-3">
              <span className="h-10 w-10 rounded-xl bg-gold-soft text-gold-deep flex items-center justify-center">
                <Mail className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[18px] font-semibold text-neutral-900 flex items-center gap-2">{emails.title} <StatusTag status={emails.status} /></h2>
                <p className="text-[13px] text-neutral-500">One-time packs · never expire</p>
              </div>
            </div>
            <p className="mt-5 text-[14.5px] text-neutral-600 leading-relaxed max-w-md">
              Deliver every certificate straight to the inbox, then follow each one until it&apos;s downloaded.
            </p>
            <ul className="mt-5 space-y-3">
              {EMAIL_FEATURES.map((f) => (
                <li key={f} className="flex items-start gap-2.5 text-[14px] text-neutral-700 leading-snug">
                  <span className="mt-0.5 h-[18px] w-[18px] shrink-0 rounded-full bg-neutral-900 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  {f}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-x-5 gap-y-2 text-[13px]">
              <Link href="/client/recipients" className="inline-flex items-center gap-1 font-medium text-neutral-900 hover:underline underline-offset-4">
                Send certificates <ArrowRight className="h-3.5 w-3.5" />
              </Link>
              <Link href="/client/email-log" className="inline-flex items-center gap-1 text-neutral-600 hover:text-neutral-900 hover:underline underline-offset-4">
                Open Email log <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
          <div className="border-t lg:border-t-0 lg:border-l border-neutral-200 bg-neutral-50/70 p-6 md:p-8">
            <p className="text-[12px] font-semibold uppercase tracking-wider text-neutral-500 mb-3">Choose a pack</p>
            <EmailPacks onBought={() => load()} />
          </div>
        </div>
      </section>

      {/* Coming soon */}
      <div className="mt-12">
        <div className="flex items-end justify-between gap-3 mb-4">
          <div>
            <h2 className="text-[18px] font-semibold text-neutral-900">More add-ons</h2>
            <p className="text-[13.5px] text-neutral-500 mt-0.5">Tell us which upcoming one you need first and we&apos;ll set it up for your next event.</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {upcoming.map((addon) => {
            const Icon = ICONS[addon.id] || Mail
            return (
              <div key={addon.id} id={addon.id} className="flex flex-col rounded-2xl border border-neutral-200 bg-white p-5">
                <div className="flex items-center justify-between">
                  <span className="h-9 w-9 rounded-xl bg-neutral-100 text-neutral-500 flex items-center justify-center">
                    <Icon className="h-4 w-4" />
                  </span>
                  <StatusTag status={addon.status} />
                </div>
                <h3 className="mt-4 text-[15px] font-semibold text-neutral-900">{addon.title}</h3>
                <p className="mt-1 text-[13px] text-neutral-500 leading-relaxed flex-1">{addon.description}</p>
                {addon.href ? (
                  <Link href={addon.href} className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-neutral-900 hover:underline underline-offset-4">
                    {addon.cta || "Open"} <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                ) : requested[addon.id] ? (
                  <p className="mt-4 inline-flex items-start gap-1.5 text-[13px] text-emerald-700">
                    <CheckCircle2 className="h-4 w-4 shrink-0 mt-px" />
                    <span>Request submitted{requested[addon.id] ? ` on ${new Date(requested[addon.id]).toLocaleDateString("en-IN", { day: "numeric", month: "short" })}` : ""}. We&apos;ll email you when it&apos;s ready.</span>
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={() => requestAccess(addon.id)}
                    disabled={requesting === addon.id}
                    className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-neutral-900 hover:underline underline-offset-4 disabled:opacity-60"
                  >
                    {requesting === addon.id ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Sending…</> : <>Request early access <ArrowRight className="h-3.5 w-3.5" /></>}
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Purchase history + FAQ */}
      <div className="mt-12 grid gap-8 lg:grid-cols-[1.15fr_1fr]">
        <div>
          <h2 className="text-[18px] font-semibold text-neutral-900 mb-4">Purchase history</h2>
          <div className="rounded-2xl border border-neutral-200 bg-white overflow-hidden">
            {purchases.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Receipt className="h-5 w-5 mx-auto text-neutral-300" />
                <p className="mt-2 text-[13.5px] text-neutral-500">Your add-on purchases and receipts will appear here.</p>
              </div>
            ) : (
              <div className="divide-y divide-neutral-100">
                {purchases.map((p) => (
                  <div key={p._id} className="flex items-center justify-between gap-3 px-5 py-3.5 text-[13.5px]">
                    <div className="min-w-0">
                      <p className="font-medium text-neutral-900">{emailPackName({ emails: p.addonEmails || 0 })}</p>
                      <p className="text-[12px] text-neutral-500">
                        {new Date(p.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        {p.invoiceNumber && <> · {p.invoiceNumber}</>}
                      </p>
                    </div>
                    <div className="flex items-center gap-4 shrink-0">
                      <span className="font-semibold text-neutral-900 tabular-nums">{formatInr(p.amount)}</span>
                      {p.invoiceNumber && (
                        <a
                          href={`/api/invoices/${encodeURIComponent(p.invoiceNumber)}/pdf`}
                          target="_blank"
                          rel="noreferrer"
                          className={cn("inline-flex items-center gap-1 text-[12.5px] text-neutral-600 hover:text-neutral-900")}
                        >
                          <Receipt className="h-3.5 w-3.5" /> Receipt
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div>
          <h2 className="text-[18px] font-semibold text-neutral-900 mb-4">Questions</h2>
          <dl className="space-y-4">
            {FAQ.map((f) => (
              <div key={f.q}>
                <dt className="text-[14px] font-medium text-neutral-900">{f.q}</dt>
                <dd className="mt-1 text-[13.5px] text-neutral-500 leading-relaxed">{f.a}</dd>
              </div>
            ))}
            <div>
              <dt className="text-[14px] font-medium text-neutral-900">Need a larger volume?</dt>
              <dd className="mt-1 text-[13.5px] text-neutral-500 leading-relaxed">
                Write to <a href="mailto:support@certistage.com" className="text-neutral-900 underline underline-offset-4">support@certistage.com</a> for custom pricing.
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  )
}
