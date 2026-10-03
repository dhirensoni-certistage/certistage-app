import Link from "next/link"
import Image from "next/image"
import { ArrowRight, FileSpreadsheet, Search, BarChart3, Award, HeartHandshake, Eye } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { Metadata } from "next"
import { SiteHeader } from "@/components/landing/site-header"
import { SiteFooter } from "@/components/landing/site-footer"
import { LiveStatsStrip } from "@/components/landing/live-stats-strip"

export const metadata: Metadata = {
  alternates: { canonical: "/about" },
  title: "About",
  description: "CertiStage helps events, colleges, institutes and training programs issue certificates to thousands of people in minutes, from Ahmedabad, India."
}

const PRINCIPLES = [
  {
    icon: Eye,
    title: "Honest by default",
    desc: "The numbers on our site are live from the product. We only claim what the software actually does."
  },
  {
    icon: HeartHandshake,
    title: "Built with organizers",
    desc: "Features come from real conferences and batches, not from a roadmap written in a vacuum. Reply from a real person within a business day."
  },
  {
    icon: Award,
    title: "The certificate is the product",
    desc: "A recipient should get a clean PDF with their name in the right place, every time. Everything else exists to make that reliable."
  }
]

const HOW = [
  { icon: FileSpreadsheet, title: "You bring the design and the list", desc: "Upload your certificate artwork and an Excel sheet of names. Place the fields once." },
  { icon: Search, title: "Recipients serve themselves", desc: "One link. Attendees, students or participants search by name, email, mobile or registration number." },
  { icon: BarChart3, title: "You watch it happen", desc: "Downloaded and pending counts per certificate type, as the day unfolds." }
]

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <SiteHeader />

      <main>
        <section className="pt-16 md:pt-24 pb-14 md:pb-20 px-6">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-medium uppercase tracking-[0.2em] text-gold-deep dark:text-gold-light mb-5">About CertiStage</p>
            <h1 className="text-[40px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
              Certificates should take minutes,<br className="hidden md:block" /> not the week after the event
            </h1>
            <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
              CertiStage is a small team in Ahmedabad building one thing well: issuing certificates to thousands of attendees, students and participants without mail merges, design back-and-forth or manual emailing.
            </p>
          </div>
        </section>

        <LiveStatsStrip />

        <section className="py-16 md:py-20 px-6">
          <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white mb-6">Why we built it</h2>
              <div className="space-y-4 text-neutral-600 dark:text-neutral-400 leading-relaxed">
                <p>
                  Every conference, convocation and training batch ends the same way: a spreadsheet of names, a designer who is already on the next project, and hundreds of people asking where their certificate is.
                </p>
                <p>
                  We have watched organizers spend days on mail merges and printer queues for something that should be a link. CertiStage turns that into an upload and a share.
                </p>
                <p>
                  It is used today by medical conferences, learning festivals and institutions in India, and it is priced so a single event can afford it.
                </p>
              </div>
            </div>
            <div className="flex items-center justify-center">
              <div className="w-full max-w-md aspect-[1024/614] rounded-xl border border-neutral-200 dark:border-neutral-800 overflow-hidden bg-white">
                <Image src="/our-mission.jpg" alt="Illustration: a pile of printed certificates replaced by a CertiStage checklist" width={1024} height={614} className="w-full h-full object-cover" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 px-6 bg-neutral-50 dark:bg-neutral-950 border-y border-neutral-200 dark:border-neutral-800">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white text-center mb-12">How it works</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {HOW.map((item) => (
                <div key={item.title} className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                  <div className="w-10 h-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-6">
                    <item.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">{item.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-16 md:py-20 px-6">
          <div className="max-w-6xl mx-auto">
            <h2 className="text-2xl md:text-3xl font-bold text-neutral-900 dark:text-white text-center mb-12">How we work</h2>
            <div className="grid md:grid-cols-3 gap-6">
              {PRINCIPLES.map((val) => (
                <div key={val.title} className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-gold/50 transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-gold-soft dark:bg-gold/10 flex items-center justify-center text-gold-deep dark:text-gold-light mb-6">
                    <val.icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-semibold text-neutral-900 dark:text-white mb-3">{val.title}</h3>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400 leading-relaxed">{val.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 px-6 border-t border-neutral-200 dark:border-neutral-800">
          <div className="max-w-3xl mx-auto text-center">
            <h2 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-4">Have an event coming up?</h2>
            <p className="text-lg text-neutral-600 dark:text-neutral-400 mb-8">Try it on the Free plan, or tell us about your event and we will reply with specifics.</p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button size="lg" asChild className="group h-11 px-6 text-sm">
                <Link href="/signup">
                  Start free <ArrowRight className="ml-1.5 h-4 w-4 transition-transform duration-200 group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild className="h-11 px-6 text-sm">
                <Link href="/contact">Talk to us</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  )
}
