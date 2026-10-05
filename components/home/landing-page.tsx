"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Ticket, ArrowRight, Shield, Check, BarChart3, Gift, Briefcase, Crown, Gem, LayoutTemplate, PenTool, Sparkles, Award, Download, Search, FileSpreadsheet, Quote, ChevronDown, Mail, Linkedin, Building2, PackagePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mergePlanConfigWithDefaults, isOneTimePlan, planValidityDays, type PlanConfig } from "@/lib/plan-config"
import { formatApproxCount, type PublicStats } from "@/lib/public-stats"
import { Reveal } from "@/components/landing/reveal"
import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/landing/site-footer"

const planIcons: Record<string, any> = {
  free: Gift,
  event: Ticket,
  professional: Briefcase,
  enterprise: Crown,
  premium: Gem
}

// Client logos for the "Trusted by" strip. Add files under public/clients/ and list them here.
// Logos are transparent PNGs; they render as uniform grey marks via .logo-mono
const TRUSTED_BY: { name: string; logo: string; width: number; height: number; darkLogo?: boolean }[] = [
  { name: "IMA NATCON 2025, Ahmedabad Medical Association", logo: "/clients/ima-natcon-2025.png", width: 318, height: 320 },
  { name: "OSSICON 2026, Obesity and Metabolic Surgery Society of India", logo: "/clients/ossicon-2026.png", width: 772, height: 296 },
  // white wordmark: gets a dark backing on hover so its colours show
  { name: "Arise Learning Festival", logo: "/clients/arise-learning-festival.png", width: 481, height: 173, darkLogo: true }
]

// Repeat the logo set so one half of the marquee track is wider than any screen
const MARQUEE_HALF = Array.from({ length: 4 }, () => TRUSTED_BY).flat()

// Real customer quotes only. Add an entry once the person has approved their quote in writing.
const TESTIMONIALS: { quote: string; name: string; role: string; org: string }[] = []

const FAQS: { q: string; a: string; href?: string; linkText?: string }[] = [
  {
    q: "What counts as one certificate?",
    a: "Every recipient you add to an event or batch counts as one certificate against your plan's yearly limit, whether or not they download it."
  },
  {
    q: "Do I need a designer?",
    a: "No. Upload the certificate design you already have as an image, place the name and any other fields on it, and you are done."
  },
  {
    q: "How do recipients get their certificate?",
    a: "Two ways, and you can use both. Share one link: recipients search by name, email, mobile or registration number and download their PDF. Or click Email certificates and every person gets their own download link in their inbox, with an \"Add to LinkedIn profile\" button."
  },
  {
    q: "Can I see who opened the email?",
    a: "Yes. The Email log shows sent, delivered, opened, clicked, bounced and failed for every email, and whether the person has downloaded. Send reminders only to those who haven't."
  },
  {
    q: "Does the download page show my branding?",
    a: "Yes, on every plan. Upload your logo in Settings and it appears with your organisation name at the top of every download page. Annual plans can also switch off the small \"Powered by CertiStage\" line in the footer."
  },
  {
    q: "Can colleges and training institutes use it?",
    a: "Yes. An \"event\" can be a convocation, a course batch, a workshop or a conference. Everything works the same way."
  },
  {
    q: "Can I try it before paying?",
    a: "Yes. The Free plan lets you set up one event and issue up to 50 certificates so you can test the full flow."
  },
  {
    q: "What is the One event plan?",
    a: "A single payment of ₹799 for one event: up to 1,000 certificates, 3 certificate designs, Excel import and email delivery, with 60 days of organiser access. Recipients can keep downloading after that. If you later move to an annual plan within 180 days, the ₹799 is credited."
  },
  {
    q: "What if I need more certificates than my plan includes?",
    a: "Buy a one-time pack of extra certificates from Add-ons; they never expire and are used after your plan's quota. Extra email packs work the same way."
  },
  {
    q: "Is there a refund?",
    a: "No. Paid plans activate instantly, so we do not offer refunds. Test everything on the Free plan first. You can cancel anytime and keep access until the end of your billing period.",
    href: "/refund",
    linkText: "Read the refund policy"
  },
  {
    q: "What happens to my data when the plan expires?",
    a: "Your data stays available for 30 days after expiry so you can export it. After that it is permanently deleted."
  },
  {
    q: "How do I pay?",
    a: "Online through Razorpay with UPI, cards or net banking. Prices are in INR: paid once for the One event plan, yearly for the others. No auto-renewal; we email you before a plan ends."
  }
]

const FEATURES = [
  {
    icon: LayoutTemplate,
    title: "Visual template editor",
    desc: "Upload your certificate design, drag the name and other fields into place, and set the font, size and colour for each one. Add signatures where you need them.",
    wide: true
  },
  {
    icon: Search,
    title: "Self-service download page",
    desc: "Share one link. Recipients search by name, email, mobile or registration number and download their own PDF. No email list needed."
  },
  {
    icon: Mail,
    title: "Email delivery with tracking",
    desc: "One click emails every recipient their own download link. The Email log shows delivered, opened, clicked and bounced, and reminders go only to those who haven't downloaded."
  },
  {
    icon: Linkedin,
    title: "LinkedIn and WhatsApp sharing",
    desc: "An \"Add to LinkedIn profile\" button on every download page and in every email, with your organisation as the issuer. WhatsApp share built in. Clicks counted on your dashboard."
  },
  {
    icon: FileSpreadsheet,
    title: "Excel import",
    desc: "Import thousands of recipients from a single Excel sheet, with validation before anything is generated. Fix a typo by re-uploading; the next download is correct."
  },
  {
    icon: Building2,
    title: "Your brand, not ours",
    desc: "Your logo and organisation name lead every download page, on every plan. Annual plans can remove the CertiStage line entirely."
  },
  {
    icon: BarChart3,
    title: "Live download tracking",
    desc: "Who has downloaded, who is pending, downloads by day and by certificate, completion rate and LinkedIn adds, as it happens."
  },
  {
    icon: Shield,
    title: "Secure by default",
    desc: "Recipients only ever see their own certificate. Your account keeps an activity log of every change."
  }
]

const n = (v: number) => v.toLocaleString("en-IN")

/**
 * What a plan includes, from its limits, so the cards stay true to what the plan enforces.
 * Admin-written feature lines are added after, skipping ones that repeat a number shown here.
 */
function planHighlights(plan: PlanConfig): string[] {
  const l = plan.limits
  const oneTime = isOneTimePlan(plan)
  const items: string[] = []
  if (l.maxCertificates) items.push(l.maxCertificates === -1 ? "Unlimited certificates" : `${n(l.maxCertificates)} certificates${oneTime ? "" : " a year"}`)
  if (l.maxEvents) items.push(l.maxEvents === -1 ? "Unlimited events" : `${n(l.maxEvents)} event${l.maxEvents === 1 ? "" : "s"}`)
  if (l.maxCertificateTypes) items.push(l.maxCertificateTypes === -1 ? "Unlimited certificate designs" : `${n(l.maxCertificateTypes)} certificate design${l.maxCertificateTypes === 1 ? "" : "s"}`)
  items.push(l.canImportData ? "Excel import and reports" : "Add recipients one by one")
  items.push(plan.price > 0 ? "Email delivery with open and click tracking" : "Email delivery for your first recipients")
  if (oneTime) items.push(`Organiser access for ${planValidityDays(plan)} days`)
  if (l.canRemoveBranding) items.push("Remove the \"Powered by CertiStage\" line")
  const seen = new Set(items.map((i) => i.toLowerCase()))
  // Limits above already cover certificates, events, designs and import; admin lines add the rest
  const repeats = (text: string) => /certificate|event|design|type|import|excel|template|email delivery/i.test(text)
  for (const f of plan.features || []) {
    const text = String(f || "").trim()
    if (text && !seen.has(text.toLowerCase()) && !repeats(text) && items.length < 7) {
      seen.add(text.toLowerCase())
      items.push(text)
    }
  }
  return items
}

// Who it is for: one card per segment, in the words organisers search with
const USE_CASES: { title: string; desc: string; tags: string[] }[] = [
  {
    title: "Medical conferences and CME",
    desc: "Participation and CME attendance certificates for delegates, with credit hours, accreditation number and co-signatories printed. Delegates search by registration number; the council can see who attended.",
    tags: ["IMA branches", "state chapters", "PCOs"]
  },
  {
    title: "Colleges, universities and NAAC",
    desc: "Convocations, value-added courses, FDPs, NSS camps and workshops. Every batch in one place, with recipient lists and download reports for NAAC and IQAC files.",
    tags: ["convocation", "FDP", "value-added courses"]
  },
  {
    title: "Training institutes and coaching",
    desc: "Course completion certificates for every batch, issued the day the course ends. Learners add them to LinkedIn with your institute as the issuer.",
    tags: ["course completion", "internship", "skill programs"]
  },
  {
    title: "Hackathons, fests and corporate events",
    desc: "Thousands of one-time participants, messy email lists and a deadline. Import the sheet, share one link, done. Winners and volunteers get their own designs.",
    tags: ["participation", "winner", "volunteer"]
  }
]

const formatPrice = (amountInPaise: number, currency: string) => {
  const amount = amountInPaise / 100
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`
  }
}

export default function HomePage() {
  const [planConfig, setPlanConfig] = useState<PlanConfig[]>(() =>
    mergePlanConfigWithDefaults([])
  )

  useEffect(() => {
    let mounted = true

    const cached = typeof window !== "undefined" ? localStorage.getItem("plan_config") : null
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        if (mounted) {
          setPlanConfig(mergePlanConfigWithDefaults(parsed))
        }
      } catch {
        // ignore cache errors
      }
    }

    const loadPlans = async () => {
      try {
        const res = await fetch("/api/plan-config")
        if (!res.ok) return
        const data = await res.json()
        if (mounted) {
          setPlanConfig(mergePlanConfigWithDefaults(data.plans))
          localStorage.setItem("plan_config", JSON.stringify(data.plans))
        }
      } catch {
        // ignore network errors
      }
    }

    loadPlans()

    return () => {
      mounted = false
    }
  }, [])

  const visiblePlans = useMemo(
    () => planConfig.filter((plan) => plan.enabled !== false),
    [planConfig]
  )

  // FAQ accordion: only one answer open at a time
  const [openFaq, setOpenFaq] = useState<number | null>(0)

  // Live platform numbers (cached server-side for an hour)
  const [publicStats, setPublicStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let mounted = true
    fetch("/api/public-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && typeof data.certificates === "number") setPublicStats(data)
      })
      .catch(() => {
        // keep placeholders on failure
      })
    return () => {
      mounted = false
    }
  }, [])

  const landingStats = useMemo(() => {
    if (!publicStats) return null
    // With few organizations on the platform, a design count reads better than a tiny org count
    const fourth = publicStats.organizations >= 10
      ? { label: "Organizations", value: formatApproxCount(publicStats.organizations) }
      : { label: "Certificate Designs", value: formatApproxCount(publicStats.certificateTypes) }
    return [
      { label: "Certificates Issued", value: formatApproxCount(publicStats.certificates) },
      { label: "Certificates Downloaded", value: formatApproxCount(publicStats.downloads) },
      { label: "Events Powered", value: formatApproxCount(publicStats.events) },
      fourth
    ]
  }, [publicStats])

  // FAQ rich results: the same questions as the accordion below
  const faqJsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } }))
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      {/* Simple Header */}
      <SiteHeader />

      {/* Hero */}
      <section className="pt-16 md:pt-20 pb-16 md:pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <Reveal y={12}>
            <p className="inline-flex items-center gap-2 text-xs font-medium text-gold-deep dark:text-gold-light bg-gold-soft dark:bg-gold/10 border border-gold/30 dark:border-gold/30 rounded-full px-3 py-1 mb-6">
              <Award className="h-3.5 w-3.5" />
              <span>Bulk certificate generator for events, colleges, institutes and training programs</span>
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
              Issue <span className="text-gold-deep dark:text-gold-light">certificates</span> to thousands{" "}
              <br className="hidden md:block" />
              of people in minutes
            </h1>
          </Reveal>

          <Reveal delay={0.16}>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
              Upload your certificate design and an Excel sheet of names. Every attendee, student or participant finds and downloads their own certificate, or gets it by email with one click. Add to LinkedIn built in.
            </p>
          </Reveal>

          <Reveal delay={0.24} className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button size="lg" asChild className="group h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="/signup">
                Start free <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="#how-it-works">
                See how it works
              </Link>
            </Button>
          </Reveal>

          {/* Certificate mockup with recipient download card */}
          <Reveal delay={0.32} y={32} amount={0.1} className="relative mx-auto max-w-4xl mt-4 md:mt-8 sm:pb-8">
            <div className="relative rounded-xl border border-neutral-200 dark:border-neutral-800 shadow-2xl shadow-neutral-900/10 dark:shadow-black/50 overflow-hidden">
              <div className="relative aspect-[1.414/1] sm:aspect-[16/9] p-5 sm:p-8 md:p-10 bg-[#fffdf8] dark:bg-neutral-950">
                <div className="absolute inset-3 sm:inset-5 border-[3px] border-gold/80 rounded-sm pointer-events-none" />
                <div className="absolute inset-4 sm:inset-6 border border-gold/40 rounded-sm pointer-events-none" />

                <div className="relative h-full flex flex-col items-center justify-center text-center">
                  <div className="text-[9px] sm:text-[11px] tracking-[0.3em] uppercase text-neutral-500 dark:text-neutral-400 mb-1 sm:mb-2">Your organization</div>
                  <div className="font-serif text-xl sm:text-3xl md:text-4xl text-neutral-900 dark:text-white mb-1 sm:mb-2">Certificate of Participation</div>
                  <div className="text-[10px] sm:text-xs text-neutral-500 dark:text-neutral-400 mb-3 sm:mb-5">This certificate is proudly presented to</div>

                  <div className="inline-flex items-center rounded-md border-2 border-dashed border-gold bg-gold-soft dark:bg-gold/10 px-3 sm:px-5 py-1 sm:py-1.5 mb-3 sm:mb-5">
                    <span className="font-serif text-lg sm:text-2xl md:text-3xl text-neutral-900 dark:text-white">{"{{NAME}}"}</span>
                  </div>

                  <div className="text-[10px] sm:text-xs text-neutral-600 dark:text-neutral-400 max-w-xs sm:max-w-md leading-relaxed">
                    for participating in the Annual Conference 2026
                  </div>

                  <div className="mt-4 sm:mt-7 w-full flex items-end justify-between px-4 sm:px-10">
                    <div className="text-left">
                      <div className="w-16 sm:w-28 border-t border-neutral-400 dark:border-neutral-600 mb-1" />
                      <div className="text-[8px] sm:text-[10px] text-neutral-500 dark:text-neutral-400">Director</div>
                    </div>
                    <div className="h-9 w-9 sm:h-14 sm:w-14 rounded-full bg-gold ring-4 ring-gold/30 dark:ring-gold/30 flex items-center justify-center shadow-sm">
                      <Award className="h-4 w-4 sm:h-7 sm:w-7 text-neutral-900" />
                    </div>
                    <div className="text-right">
                      <div className="w-16 sm:w-28 border-t border-neutral-400 dark:border-neutral-600 mb-1 ml-auto" />
                      <div className="text-[8px] sm:text-[10px] text-neutral-500 dark:text-neutral-400">Coordinator</div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="sm:absolute sm:bottom-0 sm:-right-4 md:-right-10 mt-4 sm:mt-0 w-full sm:w-64 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xl p-4 text-left">
              <div className="text-xs font-semibold text-neutral-900 dark:text-white mb-0.5">Find your certificate</div>
              <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mb-3">Annual Conference 2026</div>
              <div className="h-8 rounded-md border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 flex items-center text-[11px] text-neutral-500 dark:text-neutral-400 mb-2">Name or registration no.</div>
              <div className="h-8 rounded-md bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[11px] font-medium flex items-center justify-center gap-1.5">
                <Download className="h-3.5 w-3.5" /> Download PDF
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* Stats - Minimal */}
      <section className="py-12 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <Reveal className="grid grid-cols-2 md:grid-cols-4 gap-8" y={16}>
            {(landingStats ?? [
              { label: "Certificates Issued", value: null },
              { label: "Certificates Downloaded", value: null },
              { label: "Events Powered", value: null },
              { label: "Certificate Designs", value: null }
            ]).map((stat, i) => (
              <div key={i} className="text-center">
                {stat.value === null ? (
                  <div
                    className="h-9 md:h-10 w-24 mx-auto mb-1 rounded bg-neutral-200 dark:bg-neutral-800 animate-pulse"
                    aria-label="Loading"
                  />
                ) : (
                  <p className="text-3xl md:text-4xl font-bold text-gold-deep dark:text-gold-light mb-1">{stat.value}</p>
                )}
                <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </Reveal>
        </div>
      </section>

      {/* Trusted by: compact, muted logo marquee */}
      {TRUSTED_BY.length > 0 && (
        <section className="py-10 bg-white dark:bg-[#0a0a0a] border-b border-neutral-200 dark:border-neutral-800 overflow-hidden">
          <Reveal y={10}>
            <p className="text-[11px] text-neutral-500 uppercase tracking-[0.2em] text-center mb-7 px-6">Trusted by organizers of</p>
            <div
              className="logo-marquee relative [mask-image:linear-gradient(to_right,transparent,black_15%,black_85%,transparent)]"
              aria-label="Client logos"
            >
              <div className="logo-marquee-track flex w-max items-center">
                {[0, 1].map((half) => (
                  <div key={half} className="flex shrink-0 items-center" aria-hidden={half === 1}>
                    {MARQUEE_HALF.map((client, i) => (
                      <div key={`${half}-${i}`} className={`logo-item ${client.darkLogo ? "logo-item-dark" : ""} flex items-center justify-center mx-3 md:mx-5 px-5 md:px-7 h-16`}>
                        <Image
                          src={client.logo}
                          alt={half === 0 ? client.name : ""}
                          title={client.name}
                          width={client.width}
                          height={client.height}
                          className="logo-mono h-10 md:h-12 w-auto max-w-[180px] object-contain opacity-80"
                        />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need to issue certificates
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              From a 50-person workshop to a 10,000-attendee conference or an entire graduating batch.
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feature, i) => (
              <Reveal
                key={feature.title}
                delay={i * 0.07}
                className={`${feature.wide ? "md:col-span-2" : ""} p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-gold/50 dark:hover:border-gold/50 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-neutral-900/5 transition-[border-color,transform,box-shadow] duration-300`}
              >
                <div className="w-10 h-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-6">
                  <feature.icon className="w-5 h-5" />
                </div>
                <h3 className={`${feature.wide ? "text-xl" : "text-lg"} font-semibold text-neutral-900 dark:text-white mb-3`}>
                  {feature.title}
                </h3>
                <p className={`${feature.wide ? "text-[15px]" : "text-sm"} text-neutral-600 dark:text-neutral-400 leading-relaxed`}>
                  {feature.desc}
                </p>
              </Reveal>
            ))}
          </div>

          {/* Dashboard preview */}
          <Reveal y={28} amount={0.1} className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
            <div className="p-6 md:p-8 border-b border-neutral-200 dark:border-neutral-800">
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-1">One dashboard for every event and batch</h3>
              <p className="text-sm text-neutral-600 dark:text-neutral-400">Attendees, downloads, pending recipients and completion rate, all in one place.</p>
            </div>
            <div className="relative w-full aspect-[16/7] bg-white dark:bg-neutral-950">
              <Image
                src="/dashboard-preview.png"
                alt="CertiStage dashboard showing attendees, downloads and completion rate"
                fill
                className="object-cover object-top"
              />
            </div>
          </Reveal>
        </div>
      </section>

      {/* Who it is for */}
      <section id="use-cases" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-14">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Certificates for every kind of organiser
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Conference secretaries, IQAC coordinators, training heads and student committees use the same three steps.
            </p>
          </Reveal>
          <div className="grid md:grid-cols-2 gap-4">
            {USE_CASES.map((u, i) => (
              <Reveal key={u.title} delay={i * 0.06} className="p-7 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-gold/50 transition-colors">
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{u.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{u.desc}</p>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {u.tags.map((t) => (
                    <li key={t} className="rounded-full border border-neutral-200 dark:border-neutral-800 px-2.5 py-0.5 text-[11.5px] text-neutral-600 dark:text-neutral-400">{t}</li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it Works - Simple Steps */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              From setup to delivery in three simple steps
            </p>
          </Reveal>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create an event or batch", icon: PenTool, desc: "A conference, a course, a convocation or a training program" },
              { step: "02", title: "Upload design and Excel", icon: LayoutTemplate, desc: "Place the name and other fields on your certificate design" },
              { step: "03", title: "Share the link or email everyone", icon: Check, desc: "Recipients find and download their certificate, or get it in their inbox with Add to LinkedIn" }
            ].map((item, i) => (
              <Reveal key={i} delay={i * 0.1} className="text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-gold/30 dark:border-gold/30 items-center justify-center text-gold-deep dark:text-gold-light mb-6">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-mono text-gold-deep dark:text-gold-light mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.desc}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials (shown once real, approved quotes are added to TESTIMONIALS) */}
      {TESTIMONIALS.length > 0 && (
        <section className="py-24 px-6">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
                What organizers say
              </h2>
            </div>
            <div className="grid md:grid-cols-3 gap-4">
              {TESTIMONIALS.map((t) => (
                <figure key={t.name} className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 flex flex-col">
                  <Quote className="h-6 w-6 text-gold mb-4" />
                  <blockquote className="text-[15px] text-neutral-700 dark:text-neutral-300 leading-relaxed flex-1">
                    {t.quote}
                  </blockquote>
                  <figcaption className="mt-6 text-sm">
                    <div className="font-semibold text-neutral-900 dark:text-white">{t.name}</div>
                    <div className="text-neutral-500 dark:text-neutral-400">{t.role}, {t.org}</div>
                  </figcaption>
                </figure>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Pricing - Clean Cards */}
      <section id="pricing" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <Reveal className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Pay once for a single event, or yearly for more. Prices in INR, UPI accepted.
            </p>
          </Reveal>
          <div className={`grid sm:grid-cols-2 gap-4 ${visiblePlans.length >= 5 ? "lg:grid-cols-3 xl:grid-cols-5" : "lg:grid-cols-4"}`}>
            {visiblePlans.map((plan, i) => {
              const Icon = planIcons[plan.id] || Sparkles
              const badge = plan.badge || (plan.highlight ? "Popular" : "")
              const priceLabel = formatPrice(plan.price, plan.currency || "INR")
              const periodLabel = plan.price <= 0 ? "" : plan.billingPeriod === "one-time" ? "once" : `/${plan.billingPeriod || "year"}`
              const features = planHighlights(plan)
              const ctaLabel = plan.price === 0
                ? "Start free"
                : plan.limits?.canUpgrade === false
                  ? "Contact sales"
                  : "Get started"
              const ctaHref = plan.price === 0
                ? "/signup?plan=free"
                : plan.limits?.canUpgrade === false
                  ? "/contact"
                  : `/signup?plan=${plan.id}`

              return (
                <Reveal
                  key={plan.id}
                  delay={i * 0.07}
                  className={`h-full flex flex-col p-6 rounded-xl border ${plan.highlight
                    ? "border-gold dark:border-gold-light shadow-lg shadow-gold/10"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    } bg-white dark:bg-neutral-950 hover:-translate-y-0.5 transition-[border-color,transform] duration-300 relative`}
                >
                  {badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold text-neutral-900 text-[10px] font-semibold rounded-full uppercase tracking-wide whitespace-nowrap">
                      {badge}
                    </div>
                  )}

                  <div className="mb-5">
                    <Icon className="w-8 h-8 text-gold-deep dark:text-gold-light mb-4" />
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-neutral-900 dark:text-white">{priceLabel}</span>
                      {periodLabel && (
                        <span className="text-sm text-neutral-500 dark:text-neutral-500">{periodLabel}</span>
                      )}
                    </div>
                    <p className="mt-1.5 text-xs text-neutral-500 dark:text-neutral-500 min-h-[32px] leading-snug">{plan.description}</p>
                  </div>

                  {/* The list grows, the button stays on one line across the row */}
                  <ul className="space-y-2.5 mb-6 flex-1">
                    {features.map((feature, idx) => (
                      <li key={`${plan.id}-feature-${idx}`} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Check className="w-4 h-4 text-gold-deep dark:text-gold-light shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full text-sm h-10 mt-auto"
                    asChild
                  >
                    <Link href={ctaHref}>{ctaLabel}</Link>
                  </Button>
                </Reveal>
              )
            })}
          </div>

          <Reveal delay={0.2} className="mt-6 grid gap-3 md:grid-cols-3 text-sm text-neutral-600 dark:text-neutral-400">
            <p className="flex items-start gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <PackagePlus className="h-4 w-4 mt-0.5 shrink-0 text-gold-deep dark:text-gold-light" />
              <span>Need more? One-time packs of extra certificates and emails on every plan. They never expire.</span>
            </p>
            <p className="flex items-start gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <Ticket className="h-4 w-4 mt-0.5 shrink-0 text-gold-deep dark:text-gold-light" />
              <span>Start with One event; move to an annual plan within 180 days and the ₹799 is credited.</span>
            </p>
            <p className="flex items-start gap-2.5 rounded-xl border border-neutral-200 dark:border-neutral-800 px-4 py-3">
              <Shield className="h-4 w-4 mt-0.5 shrink-0 text-gold-deep dark:text-gold-light" />
              <span>No auto-renewal. Paid through Razorpay with UPI, cards or net banking; receipt by email.</span>
            </p>
          </Reveal>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <Reveal className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Questions organizers ask
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Anything else? <Link href="/contact" className="text-gold-deep dark:text-gold-light underline underline-offset-4">Contact us</Link>
            </p>
          </Reveal>
          <Reveal className="space-y-3" delay={0.1} amount={0.1}>
            {FAQS.map((faq, i) => (
              <details
                key={faq.q}
                open={openFaq === i}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 open:border-gold/50 transition-colors"
              >
                <summary
                  onClick={(e) => {
                    e.preventDefault()
                    setOpenFaq(openFaq === i ? null : i)
                  }}
                  className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-4 text-[15px] font-medium text-neutral-900 dark:text-white [&::-webkit-details-marker]:hidden"
                >
                  {faq.q}
                  <ChevronDown className="h-4 w-4 shrink-0 text-neutral-400 transition-transform group-open:rotate-180" />
                </summary>
                <div className="px-6 pb-5 text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  {faq.a}
                  {faq.href && (
                    <>
                      {" "}
                      <Link href={faq.href} className="text-gold-deep dark:text-gold-light underline underline-offset-4">{faq.linkText}</Link>
                    </>
                  )}
                </div>
              </details>
            ))}
          </Reveal>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-24 px-6 border-y border-neutral-200 dark:border-neutral-800">
        <Reveal className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Ready to issue your next batch of certificates?
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            {publicStats && publicStats.organizations >= 50
              ? `Join ${formatApproxCount(publicStats.organizations)} organizations using CertiStage`
              : "Join event organizers and institutions using CertiStage"}
          </p>
          <Button size="lg" asChild className="group h-11 px-6 text-sm">
            <Link href="/signup">
              Start free <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 ease-out group-hover:translate-x-1" />
            </Link>
          </Button>
        </Reveal>
      </section>

      {/* Footer - Clean */}
      <SiteFooter />
    </div>
  )
}







