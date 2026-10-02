"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Send, Loader2, CheckCircle2, Mail, Clock, HelpCircle, ArrowRight } from "lucide-react"
import { toast } from "sonner"
import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/landing/site-footer"
import { Reveal } from "@/components/landing/reveal"

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "support", label: "Help with my account or an event" },
  { value: "pricing", label: "Pricing and plans" },
  { value: "partnership", label: "Partnership" },
  { value: "feedback", label: "Feedback" }
]

const inputClass = "h-10 bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus-visible:ring-1 focus-visible:ring-gold focus-visible:border-gold"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [form, setForm] = useState({ name: "", email: "", phone: "", organization: "", topic: "general", message: "" })

  const update = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email and message")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Could not send your message. Please try again.")
        return
      }
      setIsSubmitted(true)
    } catch {
      toast.error("Could not send your message. Please check your connection and try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <SiteHeader />

      <section className="pt-16 md:pt-20 pb-10 px-6">
        <Reveal className="max-w-3xl mx-auto text-center">
          <h1 className="text-[36px] md:text-[48px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-4">
            Talk to us
          </h1>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto">
            Planning a conference, convocation or training batch? Stuck on something in your account? Write to us, a real person replies.
          </p>
        </Reveal>
      </section>

      <main className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6">
          {/* Left: ways to reach us */}
          <Reveal className="lg:col-span-4 space-y-4" delay={0.05}>
            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="h-10 w-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-4">
                <Mail className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-1">Email</h2>
              <a href="mailto:support@certistage.com" className="text-sm text-gold-deep dark:text-gold-light underline underline-offset-4">
                support@certistage.com
              </a>
              <p className="text-xs text-neutral-500 mt-2">For account help, include the email you signed up with.</p>
            </div>

            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="h-10 w-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-4">
                <Clock className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-1">Response time</h2>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Within one business day, Monday to Saturday, IST.</p>
            </div>

            <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              <div className="h-10 w-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-4">
                <HelpCircle className="h-5 w-5" />
              </div>
              <h2 className="font-semibold text-neutral-900 dark:text-white mb-2">Quick answers</h2>
              <nav className="flex flex-col gap-1.5 text-sm">
                <Link href="/#faq" className="text-neutral-700 dark:text-neutral-300 hover:text-gold-deep dark:hover:text-gold-light inline-flex items-center gap-1">
                  Frequently asked questions <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/#pricing" className="text-neutral-700 dark:text-neutral-300 hover:text-gold-deep dark:hover:text-gold-light inline-flex items-center gap-1">
                  Plans and pricing <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/refund" className="text-neutral-700 dark:text-neutral-300 hover:text-gold-deep dark:hover:text-gold-light inline-flex items-center gap-1">
                  Refund policy <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </nav>
            </div>
          </Reveal>

          {/* Right: form */}
          <Reveal className="lg:col-span-8" delay={0.1}>
            <div className="p-6 md:p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
              {isSubmitted ? (
                <div className="text-center py-10">
                  <div className="h-14 w-14 rounded-full bg-gold-soft dark:bg-gold/10 flex items-center justify-center mx-auto mb-5">
                    <CheckCircle2 className="h-7 w-7 text-gold-deep dark:text-gold-light" />
                  </div>
                  <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Message sent</h2>
                  <p className="text-neutral-600 dark:text-neutral-400 mb-8 max-w-md mx-auto">
                    Thanks, {form.name.split(" ")[0]}. We will reply to <span className="font-medium text-neutral-900 dark:text-white">{form.email}</span> within one business day.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 justify-center">
                    <Button asChild className="h-10 text-sm">
                      <Link href="/">Back to home</Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-10 text-sm"
                      onClick={() => {
                        setForm({ name: "", email: "", phone: "", organization: "", topic: "general", message: "" })
                        setIsSubmitted(false)
                      }}
                    >
                      Send another message
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-6">
                    <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-1">Send a message</h2>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Tell us what you are organizing and how many certificates you expect. We will reply with specifics.</p>
                  </div>

                  <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name">Name <span className="text-red-500">*</span></Label>
                        <Input id="name" name="name" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(e) => update("name")(e.target.value)} required className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email <span className="text-red-500">*</span></Label>
                        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email")(e.target.value)} required className={inputClass} />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone <span className="text-neutral-400 font-normal">(optional)</span></Label>
                        <Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={(e) => update("phone")(e.target.value)} className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization">Organization <span className="text-neutral-400 font-normal">(optional)</span></Label>
                        <Input id="organization" name="organization" autoComplete="organization" placeholder="College, company or event name" value={form.organization} onChange={(e) => update("organization")(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="topic">Topic</Label>
                      <Select value={form.topic} onValueChange={update("topic")}>
                        <SelectTrigger id="topic" className={inputClass}>
                          <SelectValue placeholder="Choose a topic" />
                        </SelectTrigger>
                        <SelectContent>
                          {TOPICS.map((t) => (
                            <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message <span className="text-red-500">*</span></Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        placeholder="What are you organizing, roughly how many certificates, and what do you need help with?"
                        value={form.message}
                        onChange={(e) => update("message")(e.target.value)}
                        required
                        className="bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus-visible:ring-1 focus-visible:ring-gold focus-visible:border-gold"
                      />
                    </div>

                    <Button type="submit" className="w-full sm:w-auto h-10 px-6 text-sm group" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</>
                      ) : (
                        <><Send className="h-4 w-4 mr-2 transition-transform duration-200 group-hover:translate-x-0.5" /> Send message</>
                      )}
                    </Button>
                  </form>
                </>
              )}
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
