"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { Mail, BellRing, Users, AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface Stats {
  total: number
  withEmail: number
  noEmail: number
  notEmailed: number
  pending: number
  all: number
  emailed: number
  failed: number
}

interface Quota {
  planUsed: number
  planLimit: number
  planRemaining: number
  credits: number
  remaining: number
  todayUsed: number
  todayCap: number | null
}

type Mode = "new" | "pending" | "all"

const n = (v: number) => v.toLocaleString("en-IN")

/**
 * Sends certificate emails in batches (the API sends up to 25 per call) and shows progress.
 * The only limit is the account's emails left (plan + add-on); the server enforces it.
 */
export function EmailCertificatesDialog({
  open,
  onOpenChange,
  eventId,
  typeId,
  scopeLabel,
  onSent,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  eventId: string
  typeId: string | null
  scopeLabel: string
  onSent?: () => void
}) {
  const [configured, setConfigured] = useState(true)
  const [stats, setStats] = useState<Stats | null>(null)
  const [quota, setQuota] = useState<Quota | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [confirmAll, setConfirmAll] = useState(false)
  const [sending, setSending] = useState<{ mode: Mode; done: number; total: number } | null>(null)
  const cancelRef = useRef(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const params = new URLSearchParams({ eventId, ...(typeId ? { typeId } : {}) })
      const res = await fetch(`/api/client/email-delivery?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setConfigured(data.configured)
      setStats(data.stats)
      setQuota(data.quota)
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load email details")
    }
  }, [eventId, typeId])

  useEffect(() => {
    if (!open) return
    setStats(null)
    setConfirmAll(false)
    load()
  }, [open, load])

  const send = async (mode: Mode) => {
    if (!stats) return
    const total = mode === "new" ? stats.notEmailed : mode === "pending" ? stats.pending : stats.all
    cancelRef.current = false
    setConfirmAll(false)
    setSending({ mode, done: 0, total })
    let runId: string | undefined
    let sent = 0
    let failed = 0
    let stopped: string | null = null
    try {
      // Keep calling while there is work and each call makes progress
      for (;;) {
        if (cancelRef.current) break
        const res = await fetch("/api/client/email-delivery", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ eventId, typeId, mode, runId }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to send")
        runId = data.runId
        sent += data.sent || 0
        failed += data.failed || 0
        setSending({ mode, done: sent + failed, total: Math.max(total, sent + failed) })
        if (data.quota) setQuota(data.quota)
        stopped = data.stopped || null
        if (stopped || !data.remaining || (data.sent || 0) + (data.failed || 0) === 0) break
      }
      const parts = [`${n(sent)} email${sent === 1 ? "" : "s"} sent`]
      if (failed) parts.push(`${n(failed)} could not be sent`)
      if (stopped === "quota") toast.warning(parts.join(", "), { description: "No emails left on your account. Get more emails to send the rest." })
      else if (stopped === "daily") toast.warning(parts.join(", "), { description: "Today's sending limit is reached. The rest can be sent tomorrow." })
      else if (failed) toast.warning(parts.join(", "), { description: "See the Email log for the reason, correct those addresses and send again." })
      else toast.success(parts.join(", "))
      onSent?.()
    } catch (error: any) {
      toast.error(error?.message || "Failed to send emails", sent ? { description: `${n(sent)} were sent before the error.` } : undefined)
    } finally {
      setSending(null)
      load()
    }
  }

  const left = quota ? (quota.remaining === -1 ? Infinity : quota.remaining) : 0
  const todayLeft = quota ? (quota.todayCap === null ? Infinity : Math.max(0, quota.todayCap - quota.todayUsed)) : 0
  const canSend = configured && left > 0 && todayLeft > 0 && !sending

  const option = (mode: Mode, icon: React.ReactNode, title: string, hint: string, count: number, primary = false) => (
    <Button
      variant={primary ? "default" : "outline"}
      className="w-full justify-start h-auto py-2.5 whitespace-normal text-left"
      disabled={!canSend || count === 0}
      onClick={() => (mode === "all" ? setConfirmAll(true) : send(mode))}
    >
      <span className="mr-2 shrink-0">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm">{title}</span>
        <span className={primary ? "block text-[11px] font-normal text-white/70" : "block text-[11px] font-normal text-neutral-500"}>{hint}</span>
      </span>
      <span className="ml-2 shrink-0 text-sm font-semibold">{n(count)}</span>
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!sending) onOpenChange(v) }}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email certificates
          </DialogTitle>
          <DialogDescription>
            Each person gets an email with a button to view and download their own certificate. Certificates: {scopeLabel}.
          </DialogDescription>
        </DialogHeader>

        {loadError ? (
          <p className="text-sm text-red-600">{loadError}</p>
        ) : !stats || !quota ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {!configured && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-neutral-700">
                Email sending is not set up yet. Please contact support.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(stats.withEmail)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">have an email address</p>
              </div>
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(stats.emailed)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">emailed so far</p>
              </div>
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(stats.pending)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">haven&apos;t downloaded</p>
              </div>
            </div>

            {(stats.noEmail > 0 || stats.failed > 0) && (
              <div className="space-y-1.5">
                {stats.noEmail > 0 && (
                  <p className="flex items-start gap-1.5 text-[13px] text-neutral-600">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    {n(stats.noEmail)} {stats.noEmail === 1 ? "person has" : "people have"} no email address. Share the download link with them instead.
                  </p>
                )}
                {stats.failed > 0 && (
                  <p className="flex items-start gap-1.5 text-[13px] text-neutral-600">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" />
                    {n(stats.failed)} address{stats.failed === 1 ? "" : "es"} failed or bounced and {stats.failed === 1 ? "is" : "are"} skipped until corrected in the recipient list.
                  </p>
                )}
              </div>
            )}

            {sending ? (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-700">Sending…</span>
                  <span className="font-medium text-neutral-900">{n(sending.done)} of {n(sending.total)}</span>
                </div>
                <div className="h-2 rounded-full bg-neutral-100 overflow-hidden">
                  <div
                    className="h-full bg-neutral-900 transition-all"
                    style={{ width: `${sending.total ? Math.min(100, (sending.done / sending.total) * 100) : 0}%` }}
                  />
                </div>
                <button type="button" onClick={() => { cancelRef.current = true }} className="text-[12px] text-neutral-500 hover:text-neutral-900 underline">
                  Stop after this batch
                </button>
              </div>
            ) : confirmAll ? (
              <div className="rounded-md border border-neutral-200 p-3 space-y-3">
                <p className="text-[13px] text-neutral-700">
                  Email all <span className="font-semibold">{n(stats.all)}</span> people again, including those who already downloaded? This uses {n(stats.all)} of your emails.
                </p>
                <div className="flex gap-2">
                  <Button size="sm" onClick={() => send("all")}>Send to everyone</Button>
                  <Button size="sm" variant="outline" onClick={() => setConfirmAll(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                {option("new", <Mail className="h-4 w-4" />, "Not emailed yet", "People who have not received the certificate email", stats.notEmailed, true)}
                {option("pending", <BellRing className="h-4 w-4" />, "Haven't downloaded", "Anyone who has not downloaded yet; people emailed before get a reminder", stats.pending)}
                {option("all", <Users className="h-4 w-4" />, "Everyone", "Every person with an email address", stats.all)}
              </div>
            )}

            <div className="rounded-md bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-600 space-y-0.5">
              <p>
                Emails left:{" "}
                <span className="font-medium text-neutral-900">{quota.remaining === -1 ? "no limit" : n(quota.remaining)}</span>
                {quota.planLimit !== -1 && (
                  <span className="text-neutral-500">
                    {" "}({n(quota.planRemaining)} of {n(quota.planLimit)} on your plan{quota.credits > 0 ? ` + ${n(quota.credits)} add-on` : ""})
                  </span>
                )}
              </p>
              {quota.todayCap !== null && (
                <p>Sent today: <span className="font-medium text-neutral-900">{n(quota.todayUsed)} of {n(quota.todayCap)}</span></p>
              )}
              {left <= 0 && (
                <p className="text-red-600">
                  No emails left. <Link href="/client/support" className="underline font-medium">Get more emails</Link>
                </p>
              )}
              {left > 0 && todayLeft <= 0 && <p className="text-amber-700">Today&apos;s limit is reached. You can send the rest tomorrow.</p>}
            </div>
          </div>
        )}

        <DialogFooter className="sm:justify-between gap-2">
          <Link href="/client/email-log" className="text-[13px] text-neutral-600 hover:text-neutral-900 underline self-center">
            View email log
          </Link>
          <Button variant="outline" disabled={!!sending} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
