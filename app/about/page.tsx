import Link from "next/link"
import Image from "next/image"
import { Shield, Zap, Heart, ArrowRight } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us · CertiStage",
  description: "CertiStage is the enterprise standard for digital credentialing. We empower organizations to recognize achievement at scale.",
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-[17px] text-neutral-900 dark:text-white">CertiStage</span>
          </Link>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild className="text-sm">
              <Link href="/client/login">Sign In</Link>
            </Button>
            <Button size="sm" asChild className="text-sm h-9 px-4">
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="pt-16 md:pt-24 pb-16 md:pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-[42px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
              We believe every achievement<br />
              deserves recognition
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              CertiStage is building the global infrastructure for digital credentials. From local workshops to international conferences.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16 md:py-20 px-6 border-y border-neutral-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-6">Our Mission</h2>
                <div className="space-y-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                  <p>
                    Certificate management has traditionally been a manual, error-prone nightmare of mail merges and printer jams.
                  </p>
                  <p>
                    We've built a platform that automates the chaos. Our mission is to give every organization—regardless of size—access to enterprise-grade credentialing tools.
                  </p>
                  <p>
                    We focus on <strong className="text-neutral-900 dark:text-white">reliability</strong>, <strong className="text-neutral-900 dark:text-white">security</strong>, and <strong className="text-neutral-900 dark:text-white">design excellence</strong>, so you can focus on your event.
                  </p>
                </div>
              </div>
              <div className="flex items-center justify-center">
                <div className="w-full max-w-md aspect-square rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden">
                  <Image
                    src="/our-mission.jpg"
                    alt="Our Mission"
                    width={500}
                    height={500}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white text-center mb-12">Core Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {[
                { icon: Zap, title: "Speed & Simplicity", desc: "We simplify complex workflows into one-click actions." },
                { icon: Shield, title: "Uncompromised Security", desc: "Data privacy and integrity are the foundation of trust." },
                { icon: Heart, title: "User Obsession", desc: "We build what you need, not just what's cool." }
              ].map((val, i) => (
                <div key={i} className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-neutral-700 dark:text-neutral-300 mb-6">
                    <val.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">{val.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-12 border-y border-neutral-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto px-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
              {[
                { label: "Credentials Issued", value: "2M+" },
                { label: "Happy Clients", value: "500+" },
                { label: "Countries", value: "30+" },
                { label: "Uptime", value: "99.99%" }
              ].map((stat, i) => (
                <div key={i} className="text-center">
                  <p className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-1">{stat.value}</p>
                  <p className="text-xs text-neutral-500 dark:text-neutral-500 uppercase tracking-wide">{stat.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 px-6">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">
              Ready to scale your impact?
            </h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">
              Join thousands of organizers who trust CertiStage.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="h-11 px-6 text-sm">
                <Link href="/signup">
                  Start Free Trial <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm">
                <Link href="/contact">Contact Support</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="py-16 px-6 bg-neutral-50 dark:bg-neutral-950 border-t border-neutral-200 dark:border-neutral-800">
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
                <Link href="/#features" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Features</Link>
                <Link href="/#pricing" className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors">Pricing</Link>
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
