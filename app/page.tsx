"use client"

import Link from "next/link"
import Image from "next/image"
import { ArrowRight, Shield, Users, Check, BarChart3, Gift, Briefcase, Crown, Gem, LayoutTemplate, PenTool, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"

export default function HomePage() {
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

          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-sm">
              <Link href="/client/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-sm h-9 px-4">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section - Clean & Minimal */}
      <section className="pt-16 md:pt-20 pb-16 md:pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[42px] md:text-[64px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
            Built to make you<br />
            <span className="text-neutral-400 dark:text-neutral-600">extraordinarily productive</span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 mb-10 max-w-2xl mx-auto leading-relaxed">
            The enterprise standard for digital credentialing. Design, issue, and track certificates at scale.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-16">
            <Button size="lg" asChild className="h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="/signup">
                Try CertiStage <ArrowRight className="h-4 w-4 ml-1.5" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm font-medium rounded-lg">
              <Link href="/client/login">
                View Demo
              </Link>
            </Button>
          </div>

          {/* Dashboard Preview - Simple Border */}
          <div className="relative mx-auto max-w-5xl mt-12">
            <div className="rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden shadow-2xl shadow-neutral-900/10 dark:shadow-black/50">
              <div className="h-9 border-b border-neutral-200 dark:border-neutral-800 flex items-center px-4 gap-2 bg-neutral-50 dark:bg-neutral-900">
                <div className="flex gap-1.5">
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                  <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
                </div>
                <div className="ml-3 h-5 flex-1 max-w-md rounded bg-neutral-100 dark:bg-neutral-800 flex items-center px-2.5 text-[11px] text-neutral-500 dark:text-neutral-500 font-mono">
                  app.certistage.com/dashboard
                </div>
              </div>
              <div className="relative w-full aspect-[16/9] bg-white dark:bg-neutral-950">
                <Image
                  src="/dashboard-preview-v2.png"
                  alt="CertiStage Dashboard"
                  fill
                  className="object-cover object-top"
                  priority
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats - Minimal */}
      <section className="py-12 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-6xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {[
              { label: "Certificates Issued", value: "2M+" },
              { label: "Organizations", value: "1,500+" },
              { label: "Delivery Rate", value: "99.9%" },
              { label: "Support Rating", value: "4.9/5" }
            ].map((stat, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-1">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wide">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features - Clean Boxes */}
      <section id="features" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-bold text-neutral-900 dark:text-white mb-4">
              Built for scale
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
              Everything you need to issue professional certificates to thousands of attendees
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-4">
            {/* Feature 1 - Large */}
            <div className="md:col-span-2 p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                <LayoutTemplate className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-semibold text-neutral-900 dark:text-white mb-3">
                Visual Template Studio
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-[15px] leading-relaxed">
                Design pixel-perfect certificates with dynamic variables. Upload custom fonts, logos, and signatures. Map CSV columns automatically.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                Recipient Portal
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Self-service portal for attendees. Search by email, mobile, or registration number.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                <Users className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                Bulk Operations
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Upload 10,000+ recipients via Excel. Automatic column mapping and validation.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                <BarChart3 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                Real-time Analytics
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Track downloads, engagement, and completion rates with live dashboards.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
              <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                <Shield className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">
                Enterprise Security
              </h3>
              <p className="text-neutral-600 dark:text-neutral-400 text-sm leading-relaxed">
                Audit logs, role-based access, and secure authentication for authenticity.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works - Simple Steps */}
      <section className="py-24 px-6 bg-neutral-50 dark:bg-neutral-950">
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
              { step: "01", title: "Configure Event", icon: PenTool, desc: "Create your workspace and set up branding" },
              { step: "02", title: "Design & Map", icon: LayoutTemplate, desc: "Build templates and map CSV columns" },
              { step: "03", title: "Launch", icon: Check, desc: "Generate and distribute certificates instantly" }
            ].map((item, i) => (
              <div key={i} className="text-center">
                <div className="inline-flex w-12 h-12 rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                  <item.icon className="w-5 h-5" />
                </div>
                <div className="text-xs font-mono text-neutral-400 dark:text-neutral-600 mb-2">{item.step}</div>
                <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-2">{item.title}</h3>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing - Clean Cards */}
      <section id="pricing" className="py-24 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400">
              Choose the plan that fits your needs
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-4">
            {[
              {
                name: "Free",
                price: "₹0",
                period: "/year",
                features: ["50 certificates", "1 template", "Email support"],
                icon: Gift,
                cta: "Start Free",
                href: "/signup?plan=free"
              },
              {
                name: "Professional",
                price: "₹2,999",
                period: "/year",
                features: ["2,000 certificates/year", "5 certificate types", "Excel import", "Priority email support"],
                icon: Briefcase,
                cta: "Get Started",
                href: "/signup?plan=professional",
                popular: true
              },
              {
                name: "Enterprise",
                price: "₹6,999",
                period: "/year",
                features: ["25,000 certificates/year", "100 certificate types", "Bulk import & processing", "Advanced report filtering"],
                icon: Crown,
                cta: "Get Started",
                href: "/signup?plan=enterprise"
              },
              {
                name: "Premium",
                price: "₹11,999",
                period: "/year",
                features: ["50,000 certificates/year", "Unlimited certificate types", "Full white-label branding", "API & Webhook access"],
                icon: Gem,
                cta: "Contact Sales",
                href: "/contact"
              }
            ].map((plan, i) => (
              <div
                key={i}
                className={`p-6 rounded-xl border ${plan.popular
                  ? "border-neutral-900 dark:border-white shadow-lg"
                  : "border-neutral-200 dark:border-neutral-800"
                  } bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors relative`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-[10px] font-semibold rounded-full uppercase tracking-wide">
                    Popular
                  </div>
                )}

                <div className="mb-6">
                  <plan.icon className="w-8 h-8 text-neutral-700 dark:text-neutral-300 mb-4" />
                  <h3 className="font-semibold text-lg text-neutral-900 dark:text-white mb-1">{plan.name}</h3>
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-neutral-900 dark:text-white">{plan.price}</span>
                    <span className="text-sm text-neutral-500 dark:text-neutral-500">{plan.period}</span>
                  </div>
                </div>

                <ul className="space-y-2.5 mb-6">
                  {plan.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm text-neutral-600 dark:text-neutral-400">
                      <Check className="w-4 h-4 text-neutral-900 dark:text-white shrink-0 mt-0.5" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>

                <Button
                  variant={plan.popular ? "default" : "outline"}
                  className="w-full text-sm h-9"
                  asChild
                >
                  <Link href={plan.href}>{plan.cta}</Link>
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA - Minimal */}
      <section className="py-24 px-6 border-y border-neutral-200 dark:border-neutral-800">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
            Ready to get started?
          </h2>
          <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
            Join 1,500+ organizations using CertiStage
          </p>
          <Button size="lg" asChild className="h-11 px-6 text-sm">
            <Link href="/signup">
              Start for free
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
                Professional certificate generation for events and courses.
              </p>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Product</h4>
              <nav className="flex flex-col gap-2">
                <Link href="#features" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</Link>
                <Link href="#pricing" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
              </nav>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Company</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/about" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">About</Link>
                <Link href="/contact" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Contact</Link>
              </nav>
            </div>

            <div>
              <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Legal</h4>
              <nav className="flex flex-col gap-2">
                <Link href="/privacy" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Privacy</Link>
                <Link href="/terms" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Terms</Link>
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



