"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Shield, Check, BarChart3, Gift, Briefcase, Crown, Gem, LayoutTemplate, PenTool, Sparkles, Award, Download, Search, FileSpreadsheet, Menu, X, Quote, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"
import { formatApproxCount, type PublicStats } from "@/lib/public-stats"

const planIcons: Record<string, any> = {
  free: Gift,
  professional: Briefcase,
  enterprise: Crown,
  premium: Gem
}

// Client logos for the "Trusted by" strip. Add files under public/clients/ and list them here.
const TRUSTED_BY: { name: string; logo: string; width: number; height: number; rounded?: boolean }[] = [
  { name: "IMA NATCON 2025, Ahmedabad Medical Association", logo: "/clients/ima-natcon-2025.png", width: 320, height: 320, rounded: true },
  { name: "OSSICON 2026, Obesity and Metabolic Surgery Society of India", logo: "/clients/ossicon-2026.png", width: 800, height: 364 },
  { name: "Arise Learning Festival", logo: "/clients/arise-learning-festival.png", width: 500, height: 202 }
]

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
    a: "You share one link. Recipients search by name, email, mobile or registration number and download their PDF. Nothing is emailed one by one."
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
    a: "Online through Razorpay with UPI, cards or net banking. Prices are in INR and billed yearly."
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
    desc: "Share one link. Recipients search by name, email, mobile or registration number and download their own PDF."
  },
  {
    icon: FileSpreadsheet,
    title: "Excel import",
    desc: "Import thousands of recipients from a single Excel sheet, with validation before anything is generated."
  },
  {
    icon: BarChart3,
    title: "Live download tracking",
    desc: "See who has downloaded and who is still pending, per certificate type, as it happens."
  },
  {
    icon: Shield,
    title: "Secure by default",
    desc: "Recipients only ever see their own certificate. Your account keeps an activity log of every change."
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

  const [menuOpen, setMenuOpen] = useState(false)

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

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Simple Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-[17px] text-neutral-900 dark:text-white">CertiStage</span>
          </Link>

          <nav className="hidden md:flex items-center gap-7">
            <Link href="#features" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</Link>
            <Link href="#pricing" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
            <Link href="/contact" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-sm">
              <Link href="/client/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-sm h-9 px-4">
              <Link href="/signup">Start free</Link>
            </Button>
            <button
              type="button"
              className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
              aria-label={menuOpen ? "Close menu" : "Open menu"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <nav className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] px-6 py-3 flex flex-col">
            {[
              { href: "#features", label: "Features" },
              { href: "#pricing", label: "Pricing" },
              { href: "#faq", label: "FAQ" },
              { href: "/contact", label: "Contact" },
              { href: "/client/login", label: "Sign In" }
            ].map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="py-3 text-sm text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        )}
      </header>

      {/* Hero */}
      <section className="pt-16 md:pt-20 pb-16 md:pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <p className="inline-flex items-center gap-2 text-xs font-medium text-gold-deep dark:text-gold-light bg-gold-soft dark:bg-gold/10 border border-gold/30 dark:border-gold/30 rounded-full px-3 py-1 mb-6">
            <Award className="h-3.5 w-3.5" />
            <span>For events, colleges, institutes and training programs</span>
          </p>
          <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
            Issue <span className="text-gold-deep dark:text-gold-light">certificates</span> to thousands{" "}
            <br className="hidden md:block" />
            of people in minutes
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            Upload your certificate design and an Excel sheet of names. Every attendee, student or participant finds and downloads their own certificate. No designer, no manual emailing.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button size="lg" asChild className="h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="/signup">
                Start free <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="#how-it-works">
                See how it works
              </Link>
            </Button>
          </div>

          {/* Certificate mockup with recipient download card */}
          <div className="relative mx-auto max-w-4xl mt-4 md:mt-8 sm:pb-8">
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
          </div>
        </div>
      </section>

      {/* Stats - Minimal */}
      <section className="py-12 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
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
          </div>
        </div>
      </section>

      {/* Trusted by: dark band so full-colour conference logos sit well together */}
      {TRUSTED_BY.length > 0 && (
        <section className="py-14 px-6 bg-black border-y border-neutral-800">
          <div className="max-w-6xl mx-auto text-center">
            <p className="text-xs text-neutral-400 uppercase tracking-wide mb-8">Trusted by organizers of</p>
            <div className="flex flex-wrap items-center justify-center gap-x-14 gap-y-8">
              {TRUSTED_BY.map((client) => (
                <Image
                  key={client.name}
                  src={client.logo}
                  alt={client.name}
                  title={client.name}
                  width={client.width}
                  height={client.height}
                  className={`h-20 md:h-24 w-auto object-contain opacity-90 hover:opacity-100 transition-opacity ${client.rounded ? "rounded-full" : ""}`}
                />
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section id="features" className="py-24 px-6 scroll-mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              Everything you need to issue certificates
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              From a 50-person workshop to a 10,000-attendee conference or an entire graduating batch.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {FEATURES.map((feature) => (
              <div
                key={feature.title}
                className={`${feature.wide ? "md:col-span-2" : ""} p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-gold/50 dark:hover:border-gold/50 transition-colors`}
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
              </div>
            ))}
          </div>

          {/* Dashboard preview */}
          <div className="mt-4 rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white dark:bg-neutral-950">
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
          </div>
        </div>
      </section>

      {/* How it Works - Simple Steps */}
      <section id="how-it-works" className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950 scroll-mt-16">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              How it works
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              From setup to delivery in three simple steps
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { step: "01", title: "Create an event or batch", icon: PenTool, desc: "A conference, a course, a convocation or a training program" },
              { step: "02", title: "Upload design and Excel", icon: LayoutTemplate, desc: "Place the name and other fields on your certificate design" },
              { step: "03", title: "Share the link", icon: Check, desc: "Recipients find and download their certificate instantly" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-gold/30 dark:border-gold/30 items-center justify-center text-gold-deep dark:text-gold-light mb-6">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-mono text-gold-deep dark:text-gold-light mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.desc}</p>
              </div>
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
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Choose the plan that fits your needs
            </p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {visiblePlans.map((plan) => {
              const Icon = planIcons[plan.id] || Sparkles
              const badge = plan.badge || (plan.highlight ? "Popular" : "")
              const priceLabel = formatPrice(plan.price, plan.currency || "INR")
              const showPeriod =
                plan.price > 0 && plan.billingPeriod && plan.billingPeriod !== "one-time"
              const periodLabel = showPeriod ? `/${plan.billingPeriod}` : ""
              const features = (plan.features || []).slice(0, 4)
              const ctaLabel = plan.price === 0
                ? "Start Free"
                : plan.limits?.canUpgrade === false
                  ? "Contact Sales"
                  : "Get Started"
              const ctaHref = plan.price === 0
                ? "/signup?plan=free"
                : plan.limits?.canUpgrade === false
                  ? "/contact"
                  : `/signup?plan=${plan.id}`

              return (
                <div
                  key={plan.id}
                  className={`p-6 rounded-xl border ${plan.highlight
                    ? "border-gold dark:border-gold-light shadow-lg shadow-gold/10"
                    : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700"
                    } bg-white dark:bg-neutral-950 transition-colors relative`}
                >
                  {badge && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gold text-neutral-900 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                      {badge}
                    </div>
                  )}

                  <div className="mb-6">
                    <Icon className="w-8 h-8 text-gold-deep dark:text-gold-light mb-4" />
                    <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-neutral-900 dark:text-white">{priceLabel}</span>
                      {periodLabel && (
                        <span className="text-sm text-neutral-500 dark:text-neutral-500">{periodLabel}</span>
                      )}
                    </div>
                  </div>

                  <ul className="space-y-2.5 mb-6">
                    {features.map((feature, idx) => (
                      <li key={`${plan.id}-feature-${idx}`} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                        <Check className="w-4 h-4 text-gold-deep dark:text-gold-light shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.highlight ? "default" : "outline"}
                    className="w-full text-sm h-9"
                    asChild
                  >
                    <Link href={ctaHref}>{ctaLabel}</Link>
                  </Button>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950 scroll-mt-16">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Questions organizers ask
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Anything else? <Link href="/contact" className="text-gold-deep dark:text-gold-light underline underline-offset-4">Contact us</Link>
            </p>
          </div>
          <div className="space-y-3">
            {FAQS.map((faq) => (
              <details
                key={faq.q}
                className="group rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 open:border-gold/50"
              >
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-6 py-4 text-[15px] font-medium text-neutral-900 dark:text-white [&::-webkit-details-marker]:hidden">
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
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-24 px-6 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Ready to issue your next batch of certificates?
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            {publicStats && publicStats.organizations >= 50
              ? `Join ${formatApproxCount(publicStats.organizations)} organizations using CertiStage`
              : "Join event organizers and institutions using CertiStage"}
          </p>
          <Button size="lg" asChild className="h-11 px-6 text-sm">
            <Link href="/signup">
              Start free
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer - Clean */}
      <footer className="py-16 px-6 bg-neutral-50 dark:bg-neutral-950">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-12">
            <div className="col-span-2 md:col-span-1">
              <div className="flex items-center gap-2 mb-4">
                <Image src="/Certistage_icon.svg" alt="CertiStage" width={24} height={24} />
                <span className="font-semibold text-sm text-neutral-900 dark:text-white">CertiStage</span>
              </div>
              <p className="text-xs text-neutral-600 dark:text-neutral-400 leading-relaxed">
                Certificates for events, colleges, institutes and training programs.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Product</h4>
              <nav className="flex flex-col gap-2">
                <Link href="#features" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</Link>
                <Link href="#pricing" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
                <Link href="#faq" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">FAQ</Link>
              </nav>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Company</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">About</Link>
                <Link href="/contact" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</Link>
                <a href="mailto:support@certistage.com" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">support@certistage.com</a>
              </nav>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Legal</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/privacy" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</Link>
                <Link href="/refund" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Refund Policy</Link>
                <Link href="/shipping" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Shipping & Delivery</Link>
              </nav>
            </div>
          </div>

          <div className="pt-8 border-t border-neutral-200 dark:border-neutral-800 text-center">
            <p className="text-xs text-neutral-500 dark:text-neutral-500">
              © {new Date().getFullYear()} CertiStage. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  )
}







