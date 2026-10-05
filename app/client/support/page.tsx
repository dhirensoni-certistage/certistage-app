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
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

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
  const [tickets, setTickets] = useState<{ _id: string; number: string; subject: string; status: "open" | "in_progress" | "closed"; createdAt: string }[]>([])

  const loadTickets = async () => {
    try {
      const res = await fetch("/api/client/support")
      if (res.ok) setTickets((await res.json()).tickets || [])
    } catch {}
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

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-[24px] font-semibold text-neutral-900 tracking-tight leading-none">Support</h1>
          <p className="text-[13px] text-neutral-500 mt-1.5">Write to us from here. We reply to your account email.</p>
        </div>
        <div className="text-xs text-muted-foreground">
          {isProfessionalOrHigher ? "Priority response within 24 hours" : "Standard response within 48 hours"}
        </div>
      </div>

      <div className="grid md:grid-cols-12 gap-6">
        {/* Support Contact Info + Resource buttons */}
        <div className="md:col-span-4 space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Quick Help
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-start gap-3">
                <Mail className="h-4 w-4 mt-0.5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Email</p>
                  <a
                    href="mailto:support@certistage.com"
                    className="text-xs text-primary hover:underline"
                  >
                    support@certistage.com
                  </a>
                </div>
              </div>

              {isProfessionalOrHigher && (
                <div className="pt-2 border-t">
                  <Badge className="bg-neutral-900 text-white">
                    {planFeatures.displayName} Support
                  </Badge>
                  <p className="text-xs text-muted-foreground mt-2">
                    Response within 24 hours
                  </p>
                </div>
              )}

              {!isProfessionalOrHigher && (
                <div className="pt-2 border-t">
                  <p className="text-xs text-muted-foreground">
                    Upgrade to Professional or higher for priority support and faster response times.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-2"
                    onClick={() => window.location.href = "/client/upgrade"}
                  >
                    Upgrade Plan
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-neutral-200 dark:border-neutral-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <ExternalLink className="h-5 w-5" />
                Resources
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                size="sm"
                onClick={() => setResourceModal("docs")}
              >
                Quick guide
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start text-sm"
                size="sm"
                onClick={() => setResourceModal("faqs")}
              >
                FAQs
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Support Request Form */}
        <Card className="md:col-span-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5" />
              Submit Support Request
            </CardTitle>
            <CardDescription>
              Fill out the form below and we'll get back to you soon
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submitted ? (
              <div className="py-12 text-center">
                <div className="h-16 w-16 rounded-full bg-neutral-500/10 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="h-8 w-8 text-neutral-600" />
                </div>
                <h3 className="text-xl font-semibold mb-2">Request received{ticketNumber ? <span className="font-mono text-base text-muted-foreground ml-2">{ticketNumber}</span> : null}</h3>
                <p className="text-muted-foreground mb-1">
                  Your ticket is with our team. We will reply to <span className="font-medium text-foreground">{email}</span>.
                </p>
                <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                  <Clock className="h-4 w-4" />
                  {isProfessionalOrHigher ? "Response within 24 hours" : "Response within 48 hours"}
                </p>
                <Button type="button" variant="outline" className="mt-6" onClick={() => setSubmitted(false)}>Send another request</Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input id="name" value={name} readOnly className="bg-muted/50" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input id="email" type="email" value={email} readOnly className="bg-muted/50" />
                    <p className="text-xs text-muted-foreground">We reply to your account email.</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input
                    id="subject"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="Brief description of your issue"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Describe your issue in detail..."
                    rows={6}
                    required
                  />
                </div>

                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-muted-foreground">
                    {isProfessionalOrHigher
                      ? "Priority support - 24 hour response"
                      : "Standard support - 48 hour response"}
                  </p>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>Submitting...</>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Submit Request
                      </>
                    )}
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Common Issues */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Common Issues</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            {[
              {
                title: "Certificate preview is blank?",
                body: "Upload a design image for the certificate and place the name field on it in the editor."
              },
              {
                title: "Excel import fails?",
                body: "Download the sample file from Import and keep its column headers: Name, Email, Mobile, Registration No."
              },
              {
                title: "Download link not working?",
                body: "The certificate needs an uploaded design, and the recipient's details must match the imported data."
              },
              {
                title: "Hit a plan limit?",
                body: "Free plans cap events and certificates. Paid plans raise the limits and add Excel import and exports."
              },
            ].map((item, i) => (
              <div key={i} className="p-4 rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <h4 className="font-medium text-sm">{item.title}</h4>
                <p className="text-sm text-muted-foreground mt-1">{item.body}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

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
      {tickets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your requests</CardTitle>
            <CardDescription>Every request gets a ticket number. Mention it if you write to us again.</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {tickets.map((t) => (
                <li key={t._id} className="flex items-center justify-between gap-3 px-6 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{t.subject}</p>
                    <p className="text-xs text-muted-foreground"><span className="font-mono">{t.number}</span> · {new Date(t.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                  </div>
                  <Badge variant="outline" className={t.status === "closed" ? "text-neutral-500" : t.status === "in_progress" ? "border-blue-200 text-blue-700" : "border-amber-200 text-amber-700"}>
                    {t.status === "in_progress" ? "In progress" : t.status === "closed" ? "Resolved" : "Open"}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  )
}


