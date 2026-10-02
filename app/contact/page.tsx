"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Send, Loader2, CheckCircle2, Mail, Clock, ArrowRight, Check } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/landing/site-footer"
import { Reveal } from "@/components/landing/reveal"

const TOPICS = [
  { value: "general", label: "General question" },
  { value: "support", label: "Account or event help" },
  { value: "pricing", label: "Pricing and plans" },
  { value: "partnership", label: "Partnership" },
  { value: "feedback", label: "Feedback" }
]

const INCLUDE = [
  "What you are organizing (conference, convocation, course, workshop)",
  "Roughly how many certificates and when you need them",
  "For account help, the email you signed up with"
]

const inputClass =
  "h-11 px-3.5 text-[14px] rounded-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:border-gold transition-all placeholder:text-neutral-400"

const EMPTY = { name: "", email: "", phone: "", organization: "", topic: "general", message: "" }

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [form, setForm] = useState(EMPTY)

  const update = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.name.trim() || !form.email.trim() || !form.phone.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email, phone and message")
      return
    }
    if (form.phone.replace(/\D/g, "").length < 8) {
      toast.error("Please enter a valid phone number")
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

      <section className="relative pt-16 md:pt-24 pb-12 px-6 overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-72 bg-[radial-gradient(60%_60%_at_50%_0%,rgba(200,150,30,0.12),transparent)] pointer-events-none" />
        <Reveal className="relative max-w-3xl mx-auto text-center">
          <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-deep dark:text-gold-light mb-5">Contact</p>
          <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-5">
            Talk to a real person
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-xl mx-auto leading-relaxed">
            Planning an event or a batch? Stuck on something in your account? Tell us, and we reply within one business day.
          </p>
        </Reveal>
      </section>

      <main className="px-6 pb-24">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-12 gap-6 items-stretch">
          {/* Dark info card */}
          <Reveal className="lg:col-span-5 h-full" delay={0.05}>
            <div className="relative overflow-hidden rounded-2xl bg-neutral-950 text-white p-8 md:p-10 h-full flex flex-col">
              <div className="absolute -top-32 -right-24 h-80 w-80 rounded-full bg-gold/20 blur-[100px] pointer-events-none" />
              <div className="relative flex flex-col gap-8 flex-1">
                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    <Mail className="h-3.5 w-3.5 text-gold-light" /> Email
                  </div>
                  <a href="mailto:support@certistage.com" className="text-xl md:text-2xl font-semibold text-white hover:text-gold-light transition-colors">
                    support@certistage.com
                  </a>
                </div>

                <div>
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-3">
                    <Clock className="h-3.5 w-3.5 text-gold-light" /> Response time
                  </div>
                  <p className="text-neutral-200">Within one business day.</p>
                  <p className="text-sm text-neutral-500 mt-1">Monday to Saturday, 10am to 7pm IST.</p>
                </div>

                <div className="pt-6 border-t border-white/10">
                  <p className="text-[11px] uppercase tracking-[0.2em] text-neutral-400 mb-4">Helpful to include</p>
                  <ul className="space-y-3">
                    {INCLUDE.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-neutral-300">
                        <span className="mt-0.5 h-5 w-5 rounded-full bg-gold/15 border border-gold/40 flex items-center justify-center shrink-0">
                          <Check className="h-3 w-3 text-gold-light" />
                        </span>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto pt-6 border-t border-white/10 flex flex-col gap-2 text-sm">
                  {[
                    { href: "/#faq", label: "Frequently asked questions" },
                    { href: "/#pricing", label: "Plans and pricing" },
                    { href: "/refund", label: "Refund policy" }
                  ].map((l) => (
                    <Link key={l.href} href={l.href} className="group inline-flex items-center gap-1.5 text-neutral-300 hover:text-white transition-colors">
                      {l.label} <ArrowRight className="h-3.5 w-3.5 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Reveal>

          {/* Form card */}
          <Reveal className="lg:col-span-7 h-full" delay={0.1}>
            <div className="relative h-full flex flex-col rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.25)] overflow-hidden">
              <div className="h-1 bg-gradient-to-r from-gold via-gold-light to-gold" />
              <div className="p-6 md:p-10 flex-1 flex flex-col">
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
                      <Button asChild className="h-11 px-6 text-sm">
                        <Link href="/">Back to home</Link>
                      </Button>
                      <Button variant="outline" className="h-11 px-6 text-sm" onClick={() => { setForm(EMPTY); setIsSubmitted(false) }}>
                        Send another message
                      </Button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col" noValidate>
                    <div>
                      <Label className="mb-2.5 block text-[13px] font-medium text-neutral-800 dark:text-neutral-200">What is this about?</Label>
                      <div className="flex flex-wrap gap-2">
                        {TOPICS.map((t) => {
                          const active = form.topic === t.value
                          return (
                            <button
                              key={t.value}
                              type="button"
                              onClick={() => update("topic")(t.value)}
                              aria-pressed={active}
                              className={cn(
                                "h-9 px-3.5 rounded-full border text-[13px] font-medium transition-all",
                                active
                                  ? "border-neutral-900 bg-neutral-900 text-white dark:border-white dark:bg-white dark:text-neutral-900"
                                  : "border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:border-gold/60 hover:text-neutral-900 dark:hover:text-white"
                              )}
                            >
                              {t.label}
                            </button>
                          )
                        })}
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="name" className="text-[13px] font-medium">Name</Label>
                        <Input id="name" name="name" autoComplete="name" placeholder="Your full name" value={form.name} onChange={(e) => update("name")(e.target.value)} required className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-[13px] font-medium">Email</Label>
                        <Input id="email" name="email" type="email" autoComplete="email" placeholder="you@example.com" value={form.email} onChange={(e) => update("email")(e.target.value)} required className={inputClass} />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-5">
                      <div className="space-y-2">
                        <Label htmlFor="phone" className="text-[13px] font-medium">Phone</Label>
                        <Input id="phone" name="phone" type="tel" autoComplete="tel" inputMode="tel" placeholder="+91 98XXX XXXXX" value={form.phone} onChange={(e) => update("phone")(e.target.value)} required className={inputClass} />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization" className="text-[13px] font-medium">Organization <span className="text-neutral-400 font-normal">(optional)</span></Label>
                        <Input id="organization" name="organization" autoComplete="organization" placeholder="College, company or event name" value={form.organization} onChange={(e) => update("organization")(e.target.value)} className={inputClass} />
                      </div>
                    </div>

                    <div className="space-y-2 flex-1 flex flex-col">
                      <Label htmlFor="message" className="text-[13px] font-medium">Message</Label>
                      <Textarea
                        id="message"
                        name="message"
                        rows={6}
                        placeholder="What are you organizing, roughly how many certificates, and what do you need help with?"
                        value={form.message}
                        onChange={(e) => update("message")(e.target.value)}
                        required
                        className="flex-1 min-h-[140px] rounded-lg bg-white dark:bg-neutral-900 border-neutral-200 dark:border-neutral-800 focus-visible:ring-2 focus-visible:ring-gold/30 focus-visible:border-gold placeholder:text-neutral-400 text-[14px]"
                      />
                    </div>

                    <div className="flex flex-col sm:flex-row sm:items-center gap-4 pt-1">
                      <Button type="submit" className="group h-11 px-6 text-sm rounded-lg" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Sending</>
                        ) : (
                          <>Send message <Send className="h-4 w-4 ml-2 transition-transform duration-200 group-hover:translate-x-0.5" /></>
                        )}
                      </Button>
                      <p className="text-xs text-neutral-500">We only use your details to reply to this message.</p>
                    </div>
                  </form>
                )}
              </div>
            </div>
          </Reveal>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
