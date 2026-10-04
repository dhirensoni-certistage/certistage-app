"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Mail, BellRing, AlertTriangle, Loader2 } from "lucide-react"
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
  reminder: number
  emailed: number
  failed: number
}

interface Quota {
  used: number
  limit: number
  remaining: number
  todayUsed: number
  todayCap: number
}

interface Details {
  configured: boolean
  stats: Stats
  quota: Quota
  rules: { maxPerRecipient: number; minGapHours: number }
}

type Mode = "new" | "reminder"

const n = (v: number) => v.toLocaleString("en-IN")

/**
 * Sends certificate emails in batches (the API sends up to 25 per call) and shows progress.
 * The server enforces every limit; this dialog only explains them and loops.
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
  const [details, setDetails] = useState<Details | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [sending, setSending] = useState<{ mode: Mode; done: number; total: number } | null>(null)
  const cancelRef = useRef(false)

  const load = useCallback(async () => {
    setLoadError(null)
    try {
      const params = new URLSearchParams({ eventId, ...(typeId ? { typeId } : {}) })
      const res = await fetch(`/api/client/email-delivery?${params}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to load")
      setDetails(data)
    } catch (error: any) {
      setLoadError(error?.message || "Failed to load email details")
    }
  }, [eventId, typeId])

  useEffect(() => {
    if (!open) return
    setDetails(null)
    load()
  }, [open, load])

  const send = async (mode: Mode) => {
    if (!details) return
    const total = mode === "new" ? details.stats.notEmailed : details.stats.reminder
    cancelRef.current = false
    setSending({ mode, done: 0, total })
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
          body: JSON.stringify({ eventId, typeId, mode }),
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || "Failed to send")
        sent += data.sent || 0
        failed += data.failed || 0
        setSending({ mode, done: sent + failed, total: Math.max(total, sent + failed) })
        if (data.stats && data.quota) setDetails((d) => (d ? { ...d, stats: data.stats, quota: data.quota } : d))
        stopped = data.stopped || null
        if (stopped || !data.remaining || (data.sent || 0) + (data.failed || 0) === 0) break
      }
      const parts = [`${n(sent)} email${sent === 1 ? "" : "s"} sent`]
      if (failed) parts.push(`${n(failed)} could not be delivered`)
      if (stopped === "quota") toast.warning(parts.join(", "), { description: "Your plan's email limit is used up. Upgrade to send more." })
      else if (stopped === "daily") toast.warning(parts.join(", "), { description: "Today's sending limit is reached. The rest can be sent tomorrow." })
      else if (failed) toast.warning(parts.join(", "), { description: "Check those email addresses in the recipient list and send again." })
      else toast.success(parts.join(", "))
      onSent?.()
    } catch (error: any) {
      toast.error(error?.message || "Failed to send emails", sent ? { description: `${n(sent)} were sent before the error.` } : undefined)
    } finally {
      setSending(null)
      load()
    }
  }

  const s = details?.stats
  const q = details?.quota
  const planLeft = q ? (q.remaining === -1 ? Infinity : q.remaining) : 0
  const todayLeft = q ? Math.max(0, q.todayCap - q.todayUsed) : 0
  const canSend = !!details?.configured && planLeft > 0 && todayLeft > 0 && !sending

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
        ) : !details || !s || !q ? (
          <div className="flex items-center gap-2 text-sm text-neutral-500 py-6 justify-center">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading…
          </div>
        ) : (
          <div className="space-y-4">
            {!details.configured && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-neutral-700">
                Email sending is not set up yet. Please contact support.
              </p>
            )}

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(s.withEmail)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">have an email address</p>
              </div>
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(s.emailed)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">already emailed</p>
              </div>
              <div className="rounded-md border border-neutral-200 px-2 py-2.5">
                <p className="text-lg font-semibold text-neutral-900">{n(s.notEmailed)}</p>
                <p className="text-[11px] text-neutral-500 leading-tight">not emailed yet</p>
              </div>
            </div>

            {(s.noEmail > 0 || s.failed > 0) && (
              <div className="space-y-1.5">
                {s.noEmail > 0 && (
                  <p className="flex items-start gap-1.5 text-[13px] text-neutral-600">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-amber-600" />
                    {n(s.noEmail)} {s.noEmail === 1 ? "person has" : "people have"} no email address and will not get an email. Share the download link with them instead.
                  </p>
                )}
                {s.failed > 0 && (
                  <p className="flex items-start gap-1.5 text-[13px] text-neutral-600">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0 text-red-600" />
                    {n(s.failed)} email{s.failed === 1 ? "" : "s"} could not be delivered. Correct the address in the recipient list; they will then be included again.
                  </p>
                )}
              </div>
            )}

            {sending ? (
              <div className="space-y-2 py-2">
                <div className="flex items-center justify-between text-[13px]">
                  <span className="text-neutral-700">
                    {sending.mode === "new" ? "Sending certificates…" : "Sending reminders…"}
                  </span>
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
            ) : (
              <div className="space-y-2.5">
                <Button className="w-full justify-start h-auto py-2.5 whitespace-normal text-left" disabled={!canSend || s.notEmailed === 0} onClick={() => send("new")}>
                  <Mail className="h-4 w-4 mr-2 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm">
                      {s.notEmailed === 0 ? "Everyone with an email has been emailed" : `Send to ${n(s.notEmailed)} ${s.notEmailed === 1 ? "person" : "people"} not emailed yet`}
                    </span>
                  </span>
                </Button>
                <Button variant="outline" className="w-full justify-start h-auto py-2.5 whitespace-normal text-left" disabled={!canSend || s.reminder === 0} onClick={() => send("reminder")}>
                  <BellRing className="h-4 w-4 mr-2 shrink-0" />
                  <span className="min-w-0 text-left">
                    <span className="block text-sm">
                      {s.reminder === 0 ? "No reminders due" : `Remind ${n(s.reminder)} who ${s.reminder === 1 ? "hasn't" : "haven't"} downloaded`}
                    </span>
                    <span className="block text-[11px] text-neutral-500 font-normal">
                      Only people who have not downloaded · at most {details.rules.maxPerRecipient - 1} reminders each, {details.rules.minGapHours} hours apart
                    </span>
                  </span>
                </Button>
              </div>
            )}

            <div className="rounded-md bg-neutral-50 px-3 py-2.5 text-[12px] text-neutral-600 space-y-0.5">
              <p>
                Emails left on your plan:{" "}
                <span className="font-medium text-neutral-900">{q.remaining === -1 ? "no limit" : `${n(q.remaining)} of ${n(q.limit)}`}</span>
              </p>
              <p>
                Sent today: <span className="font-medium text-neutral-900">{n(q.todayUsed)} of {n(q.todayCap)}</span>
              </p>
              {planLeft <= 0 && <p className="text-red-600">Your plan's email limit is used up. Upgrade to send more.</p>}
              {planLeft > 0 && todayLeft <= 0 && <p className="text-amber-700">Today's limit is reached. You can send the rest tomorrow.</p>}
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" disabled={!!sending} onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
