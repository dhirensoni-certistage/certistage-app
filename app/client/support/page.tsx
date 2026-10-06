"use client"

import { useEffect, useState, useMemo } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Mail,
  MessageSquare,
  HelpCircle,
  Send,
  CheckCircle2,
  Clock,
  ExternalLink
} from "lucide-react"
import { getClientSession, getCurrentPlanFeatures } from "@/lib/auth"
import Link from "next/link"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface TicketReply { author: "admin" | "customer"; name: string; message: string; at: string }
interface Ticket {
  _id: string
  number: string
  subject: string
  message: string
  status: "open" | "in_progress" | "closed"
  createdAt: string
  replies?: TicketReply[]
  lastReplyBy?: "admin" | "customer"
}
const STATUS: Record<Ticket["status"], { label: string; className: string }> = {
  open: { label: "Open", className: "border-amber-200 bg-amber-50 text-amber-800" },
  in_progress: { label: "In progress", className: "border-blue-200 bg-blue-50 text-blue-800" },
  closed: { label: "Resolved", className: "border-neutral-200 bg-neutral-50 text-neutral-600" }
}
const when = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })

export default function SupportPage() {
  const [session, setSession] = useState<any>(null)
  const [planFeatures, setPlanFeatures] = useState<any>(null)
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [subject, setSubject] = useState("")
  const [message, setMessage] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [resourceModal, setResourceModal] = useState<null | "docs" | "faqs" | "videos">(null)
  const [ticketNumber, setTicketNumber] = useState<string | null>(null)
  const [tickets, setTickets] = useState<Ticket[]>([])
  const [openTicket, setOpenTicket] = useState<string | null>(null)
  const [replyText, setReplyText] = useState("")
  const [replying, setReplying] = useState(false)
  const [showForm, setShowForm] = useState(false)

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/client/support")
      if (res.ok) {
        const list: Ticket[] = (await res.json()).tickets || []
        setTickets(list)
        setShowForm((prev) => prev || list.length === 0)
      }
    } catch {}
  }

  const sendReply = async (id: string) => {
    if (!replyText.trim()) return
    setReplying(true)
    try {
      const res = await fetch("/api/client/support/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, message: replyText.trim() }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { toast.error(data.error || "Could not send"); return }
      setReplyText("")
      toast.success("Sent. We'll reply here and by email.")
      loadTickets()
    } catch { toast.error("Could not send") }
    setReplying(false)
  }

  useEffect(() => {
    const sess = getClientSession()
    setSession(sess)
    setPlanFeatures(getCurrentPlanFeatures())

    if (sess?.userName) setName(sess.userName)
    if (sess?.userEmail) setEmail(sess.userEmail)
    loadTickets()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!subject.trim() || !message.trim()) {
      toast.error("Please add a subject and describe the issue")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/client/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject: subject.trim(),
          message: message.trim(),
          eventName: session?.eventName || "",
          pageUrl: typeof window !== "undefined" ? window.location.href : ""
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not send your request. Please try again.")
        return
      }
      setSubmitted(true)
      setTicketNumber(data.ticketNumber || null)
      setSubject("")
      setMessage("")
      setShowForm(false)
      loadTickets()
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const isProfessionalOrHigher = useMemo(() =>
    planFeatures &&
    (planFeatures.displayName === "Professional" ||
      planFeatures.displayName === "Enterprise" ||
      planFeatures.displayName === "Premium"),
    [planFeatures]
  )

  const openCount = tickets.filter((t) => t.status !== "closed").length
  const formVisible = showForm || tickets.length === 0

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight leading-none">Support</h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">
            {tickets.length > 0
              ? <>{openCount > 0 ? <><span className="font-medium text-neutral-900">{openCount}</span> open request{openCount === 1 ? "" : "s"}. </> : "All your requests are resolved. "}Replies arrive here and at {email}.</>
              : "Write to us from here. We reply here and to your account email."}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs text-muted-foreground hidden sm:inline">{isProfessionalOrHigher ? "Priority response within 24 hours" : "Response within 48 hours"}</span>
          {!formVisible && (
            <Button size="sm" onClick={() => { setSubmitted(false); setShowForm(true) }} className="h-9 px-3.5 text-[13px] bg-neutral-900 text-white hover:bg-black">
              <MessageSquare className="h-3.5 w-3.5 mr-1.5" /> New request
            </Button>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        <div className="md:col-span-8 space-y-6">
          {/* Confirmation after sending */}
          {submitted && (
            <Card className="border-emerald-200 bg-emerald-50/60">
              <CardContent className="py-5 flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-600 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-neutral-900">Request received{ticketNumber ? <span className="font-mono text-neutral-500 ml-2">{ticketNumber}</span> : null}</p>
                  <p className="text-neutral-600 mt-0.5">It is with our team. The reply will appear below and reach <span className="font-medium text-neutral-900">{email}</span>. {isProfessionalOrHigher ? "Usually within 24 hours." : "Usually within 48 hours."}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* New request form: first thing for a new customer, on demand after that */}
          {formVisible && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <MessageSquare className="h-5 w-5" />
                  New request
                </CardTitle>
                <CardDescription>Tell us what is wrong or what you need. Mention the event and certificate if it is about one.</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input id="name" value={name} readOnly className="bg-muted/50" />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input id="email" type="email" value={email} readOnly className="bg-muted/50" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input id="subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Brief description of your issue" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Message</Label>
                    <Textarea id="message" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Describe your issue in detail..." rows={5} required />
                  </div>
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <p className="text-xs text-muted-foreground">{isProfessionalOrHigher ? "Priority support, 24 hour response" : "Standard support, 48 hour response"}</p>
                    <div className="flex gap-2">
                      {tickets.length > 0 && <Button type="button" variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>}
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? "Sending..." : <><Send className="h-4 w-4 mr-2" /> Send request</>}
                      </Button>
                    </div>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Conversations */}
          {tickets.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Your requests</CardTitle>
                <CardDescription>Open one to read the replies or add to it. Every request has a ticket number.</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y border-t">
                  {tickets.map((t) => {
                    const isOpen = openTicket === t._id
                    const replies = t.replies || []
                    const waiting = t.lastReplyBy === "admin" && t.status !== "closed"
                    return (
                      <li key={t._id}>
                        <button type="button" onClick={() => { setOpenTicket(isOpen ? null : t._id); setReplyText("") }} className="w-full flex items-center justify-between gap-3 px-6 py-3.5 text-left hover:bg-neutral-50/70">
                          <div className="min-w-0">
                            <p className="font-medium text-[14px] text-neutral-900 truncate">{t.subject}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">
                              <span className="font-mono">{t.number}</span> · {when(t.createdAt)}
                              {replies.length > 0 && <> · {replies.length} repl{replies.length === 1 ? "y" : "ies"}</>}
                              {waiting && <span className="ml-2 text-blue-700 font-medium">New reply from support</span>}
                            </p>
                          </div>
                          <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium shrink-0 ${STATUS[t.status].className}`}>{STATUS[t.status].label}</span>
                        </button>
                        {isOpen && (
                          <div className="px-6 pb-5 space-y-3 bg-neutral-50/50 border-t">
                            <div className="pt-4 space-y-3">
                              <div className="rounded-lg bg-white border p-3.5 text-sm">
                                <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">You · {when(t.createdAt)}</p>
                                <p className="whitespace-pre-wrap leading-relaxed text-neutral-800">{t.message}</p>
                              </div>
                              {replies.map((r, i) => (
                                <div key={i} className={`rounded-lg border p-3.5 text-sm ${r.author === "admin" ? "bg-gold-soft/60 border-gold/30" : "bg-white"}`}>
                                  <p className="text-[11px] uppercase tracking-wider text-neutral-500 mb-1">{r.author === "admin" ? "CertiStage support" : "You"} · {when(r.at)}</p>
                                  <p className="whitespace-pre-wrap leading-relaxed text-neutral-800">{r.message}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex flex-col gap-2">
                              <Textarea rows={3} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder={t.status === "closed" ? "Still need help? Writing here reopens the request." : "Add details or answer our reply"} />
                              <div className="flex justify-end">
                                <Button size="sm" disabled={replying || !replyText.trim()} onClick={() => sendReply(t._id)}>
                                  {replying ? "Sending..." : <><Send className="h-3.5 w-3.5 mr-1.5" /> Send</>}
                                </Button>
                              </div>
                            </div>
                          </div>
                        )}
                      </li>
                    )
                  })}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Side: contact, resources, common issues */}
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><HelpCircle className="h-5 w-5" /> Quick help</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a href="mailto:support@certistage.com" className="text-xs text-primary hover:underline">support@certistage.com</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Clock className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">{isProfessionalOrHigher ? `${planFeatures.displayName} support` : "Standard support"}</p>
                  <p className="text-xs text-muted-foreground">{isProfessionalOrHigher ? "Response within 24 hours" : "Response within 48 hours"}</p>
                </div>
              </div>
              {!isProfessionalOrHigher && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">Paid plans get priority support with faster replies.</p>
                  <Button variant="outline" size="sm" className="w-full mt-2" onClick={() => window.location.href = "/client/upgrade"}>See plans</Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2"><ExternalLink className="h-5 w-5" /> Resources</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button variant="outline" className="w-full justify-start text-sm" size="sm" onClick={() => setResourceModal("docs")}>Quick guide</Button>
              <Button variant="outline" className="w-full justify-start text-sm" size="sm" onClick={() => setResourceModal("faqs")}>FAQs</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Common issues</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-[13px]">
              <div><p className="font-medium text-neutral-900">Certificate preview is blank?</p><p className="text-neutral-600">Upload a design image and place the name field on it in the editor.</p></div>
              <div><p className="font-medium text-neutral-900">Excel import fails?</p><p className="text-neutral-600">Download the sample file from Import and keep its column headers.</p></div>
              <div><p className="font-medium text-neutral-900">Download link not working?</p><p className="text-neutral-600">The certificate needs a design, and the recipient's details must match the import.</p></div>
              <div><p className="font-medium text-neutral-900">Hit a plan limit?</p><p className="text-neutral-600">Upgrade, or add a pack of extra certificates from Add-ons.</p></div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={!!resourceModal} onOpenChange={() => setResourceModal(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {resourceModal === "docs" && "Quick guide"}
              {resourceModal === "faqs" && "FAQs"}
              {resourceModal === "videos" && "Video Tutorials"}
            </DialogTitle>
            <DialogDescription>
              {resourceModal === "docs" && "From a new event to downloaded certificates."}
              {resourceModal === "faqs" && "Most asked questions and quick answers."}
              {resourceModal === "videos" && "Watch short how-to clips."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 text-sm text-muted-foreground">
            {resourceModal === "docs" && (
              <ul className="list-disc list-inside space-y-1">
                <li>Create an event, then add a certificate and upload its design.</li>
                <li>Place the name and any other fields on the design in the editor.</li>
                <li>Import recipients from Excel (Name, Email, Mobile, Registration No) or add them one by one.</li>
                <li>Share the public download link. Each recipient finds their certificate with their own details.</li>
                <li>Track downloads on the dashboard and export reports.</li>
              </ul>
            )}
            {resourceModal === "faqs" && (
              <div className="space-y-2">
                <p><span className="font-medium text-foreground">How do I bulk import recipients?</span> Go to the 'Recipients' tab, click on 'Import', and download the sample Excel file. Fill in your recipient data and upload it back.</p>
                <p><span className="font-medium text-foreground">A recipient cannot find their certificate:</span> their name, email or mobile must match what was imported. Check the spelling in the Recipients page.</p>
                <p><span className="font-medium text-foreground">Changing the design after sharing:</span> update the design in the editor. The same link keeps working and new downloads use the new design.</p>
                <p><span className="font-medium text-foreground">Paid plans:</span> more events and certificates, Excel import, report exports, priority support.</p>
              </div>
            )}
            {resourceModal === "videos" && (
              <div className="space-y-2">
                <p>Short clips coming soon. Need a walkthrough? Email support@certistage.com.</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}


