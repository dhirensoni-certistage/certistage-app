"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Send, Loader2, CheckCircle2, Mail, MapPin, Headphones } from "lucide-react"
import { toast } from "sonner"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    inquiryType: "general",
    message: ""
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.name || !formData.email || !formData.message) {
      toast.error("Please fill in all required fields")
      return
    }

    setIsSubmitting(true)
    await new Promise(resolve => setTimeout(resolve, 1500))
    console.log("Contact form submitted:", formData)
    setIsSubmitting(false)
    setIsSubmitted(true)
    toast.success("Message sent successfully!")
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
        <Header />
        <main className="container mx-auto px-6 py-16">
          <div className="max-w-lg mx-auto text-center p-12 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
            <div className="h-16 w-16 rounded-full bg-neutral-500/10 flex items-center justify-center mx-auto mb-6">
              <CheckCircle2 className="h-8 w-8 text-neutral-500" />
            </div>
            <h2 className="text-2xl font-bold text-neutral-900 dark:text-white mb-2">Thank You!</h2>
            <p className="text-neutral-600 dark:text-neutral-400 mb-6">
              We've received your message and will get back to you within 24 hours.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button asChild className="h-10 text-sm">
                <Link href="/">Return to Home</Link>
              </Button>
              <Button variant="outline" onClick={() => setIsSubmitted(false)} className="h-10 text-sm">
                Send Another Message
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <Header />

      {/* Hero Section */}
      <section className="pt-16 md:pt-20 pb-12 md:pb-16 px-6 border-b border-neutral-200 dark:border-neutral-800">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-[42px] md:text-[56px] font-bold tracking-tight text-neutral-900 dark:text-white leading-[1.1] mb-6">
            Get in Touch
          </h1>
          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto">
            Have questions? Need support? Want to discuss a custom solution? Our team is ready to assist you.
          </p>
        </div>
      </section>

      <main className="container mx-auto px-6 py-12 md:py-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-12 gap-8">
            {/* Left Sidebar - Contact Info */}
            <div className="lg:col-span-4 space-y-4">
              <div className="mb-6">
                <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Contact Information</h2>
                <p className="text-sm text-neutral-600 dark:text-neutral-400">
                  Choose your preferred way to reach us
                </p>
              </div>

              {/* Contact Cards */}
              <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 text-neutral-700 dark:text-neutral-300">
                    <Mail className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Email Us</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-2">Response within 24 hours</p>
                    <a href="mailto:support@certistage.com" className="text-sm text-neutral-900 dark:text-white hover:underline">
                      support@certistage.com
                    </a>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 text-neutral-700 dark:text-neutral-300">
                    <Headphones className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Live Support</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-2">Mon-Fri, 9 AM - 6 PM IST</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Chat with our team</p>
                  </div>
                </div>
              </div>

              <div className="p-6 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors">
                <div className="flex items-start gap-4">
                  <div className="h-10 w-10 rounded-lg bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center shrink-0 text-neutral-700 dark:text-neutral-300">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-neutral-900 dark:text-white mb-1">Visit Us</h3>
                    <p className="text-xs text-neutral-500 dark:text-neutral-500 mb-2">Our office location</p>
                    <p className="text-sm text-neutral-600 dark:text-neutral-400">Mumbai, Maharashtra, India</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Contact Form */}
            <div className="lg:col-span-8">
              <div className="p-8 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold text-neutral-900 dark:text-white mb-2">Send us a Message</h2>
                  <p className="text-sm text-neutral-600 dark:text-neutral-400">
                    Fill out the form below and we'll get back to you as soon as possible.
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="name" className="text-sm">Full Name <span className="text-red-500">*</span></Label>
                      <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm">Email <span className="text-red-500">*</span></Label>
                      <Input
                        id="email"
                        type="email"
                        placeholder="john@company.com"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-5">
                    <div className="space-y-2">
                      <Label htmlFor="phone" className="text-sm">Phone Number</Label>
                      <Input
                        id="phone"
                        type="tel"
                        placeholder="+91 98765 43210"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="h-10"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="organization" className="text-sm">Organization</Label>
                      <Input
                        id="organization"
                        placeholder="Company Name"
                        value={formData.organization}
                        onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                        className="h-10"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="inquiryType" className="text-sm">How can we help you?</Label>
                    <Select
                      value={formData.inquiryType}
                      onValueChange={(value) => setFormData({ ...formData, inquiryType: value })}
                    >
                      <SelectTrigger className="h-10">
                        <SelectValue placeholder="Select inquiry type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">General Inquiry</SelectItem>
                        <SelectItem value="support">Technical Support</SelectItem>
                        <SelectItem value="sales">Sales & Pricing</SelectItem>
                        <SelectItem value="partnership">Partnership Opportunity</SelectItem>
                        <SelectItem value="feedback">Feedback & Suggestions</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-sm">Message <span className="text-red-500">*</span></Label>
                    <Textarea
                      id="message"
                      placeholder="Tell us more about your inquiry..."
                      rows={6}
                      value={formData.message}
                      onChange={(e) => setFormData({ ...formData, message: e.target.value })}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full h-10 text-sm" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

function Header() {
  return (
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
  )
}

function Footer() {
  return (
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
  )
}

