import Link from "next/link"
import Image from "next/image"
import { Award, ArrowRight, Shield, Zap, Users, Check, FileText, BarChart3, Download, Star, Gift, Briefcase, Crown, Gem } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border/50 bg-background/80 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-lg text-foreground">CertiStage</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#features" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Features
            </Link>
            <Link href="#pricing" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="#how-it-works" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              How it Works
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" asChild>
              <Link href="/client/login">Login</Link>
            </Button>
            <Button size="sm" asChild>
              <Link href="/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/5" />
        <div className="container mx-auto px-4 relative">
          <div className="max-w-3xl mx-auto text-center">
            <Badge variant="secondary" className="mb-6 px-4 py-1.5">
              <Zap className="h-3.5 w-3.5 mr-1.5" />
              Trusted by 500+ Organizations
            </Badge>
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground mb-6">
              Professional Certificates
              <span className="text-primary block mt-2">Made Simple</span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              Create, customize, and distribute beautiful certificates for your events, 
              courses, and achievements. Simple for you, seamless for recipients.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button size="lg" asChild className="min-w-[180px]">
                <Link href="/signup" className="gap-2">
                  Get Started Free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="#how-it-works">See How It Works</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-4">No credit card required • Free trial with 50 certificates</p>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 border-y border-border/50 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
            <div>
              <p className="text-3xl font-bold text-foreground">10K+</p>
              <p className="text-sm text-muted-foreground">Certificates Generated</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">500+</p>
              <p className="text-sm text-muted-foreground">Happy Clients</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">99.9%</p>
              <p className="text-sm text-muted-foreground">Uptime</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-foreground">4.9</p>
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-1">
                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> Rating
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Features</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Everything you need</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features designed for modern certificate management
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Custom Templates</h3>
                <p className="text-sm text-muted-foreground">
                  Upload your own designs and customize text placement with our visual drag-and-drop editor.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Bulk Generation</h3>
                <p className="text-sm text-muted-foreground">
                  Import recipient data via CSV or Excel and generate certificates for thousands at once.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Easy Download</h3>
                <p className="text-sm text-muted-foreground">
                  Recipients can search and download their certificates using email or mobile number.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Multiple Certificate Types</h3>
                <p className="text-sm text-muted-foreground">
                  Create different certificate types for one event - Participation, Winner, Appreciation & more.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BarChart3 className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Analytics & Reports</h3>
                <p className="text-sm text-muted-foreground">
                  Track download statistics, export reports, and monitor certificate distribution in real-time.
                </p>
              </CardContent>
            </Card>
            <Card className="border-border/50 hover:border-primary/30 transition-colors">
              <CardContent className="p-6">
                <div className="h-11 w-11 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">Secure & Reliable</h3>
                <p className="text-sm text-muted-foreground">
                  Your data is safe with us. Secure authentication and reliable certificate delivery.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">Pricing</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Simple, transparent pricing</h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Choose the plan that fits your needs. No hidden fees. Annual billing.
            </p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto items-stretch">
            {/* Free Plan */}
            <Card className="border-border/50 relative flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Gift className="h-5 w-5 text-muted-foreground" />
                  <CardTitle className="text-lg">Free</CardTitle>
                </div>
                <CardDescription>Trial / Demo</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₹0</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 text-sm flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 50 certificates</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Certificate design & creation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>1 certificate template</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Manual participant entry</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Download page link</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>1 time download only</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Email support (limited)</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/signup?plan=free">Try Free</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Professional Plan */}
            <Card className="border-primary relative shadow-lg flex flex-col">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <Badge className="bg-primary">Most Popular</Badge>
              </div>
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Professional</CardTitle>
                </div>
                <CardDescription>Up to 3 events</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₹2,999</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 text-sm flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Event creation</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 2,000 certificates/year</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 5 certificate types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Excel import</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Multiple downloads</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Digital signature</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Basic analytics & export</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Online support</span>
                  </li>
                </ul>
                <Button className="w-full mt-4" asChild>
                  <Link href="/signup?plan=professional">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Enterprise Gold Plan */}
            <Card className="border-amber-500/50 relative flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <CardTitle className="text-lg">Enterprise Gold</CardTitle>
                </div>
                <CardDescription>Up to 10 events</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₹6,999</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 text-sm flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 25,000 certificates/year</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 100 certificate types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Custom branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Bulk import</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Priority support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Advanced analytics</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Event-wise export</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/signup?plan=enterprise">Get Started</Link>
                </Button>
              </CardContent>
            </Card>

            {/* Premium Plus Plan */}
            <Card className="border-violet-500/50 relative bg-gradient-to-b from-background to-muted/30 flex flex-col">
              <CardHeader className="pb-4">
                <div className="flex items-center gap-2">
                  <Gem className="h-5 w-5 text-violet-500" />
                  <CardTitle className="text-lg">Premium Plus</CardTitle>
                </div>
                <CardDescription>Up to 25 events</CardDescription>
                <div className="mt-4">
                  <span className="text-4xl font-bold">₹11,999</span>
                  <span className="text-muted-foreground">/year</span>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col flex-1">
                <ul className="space-y-2 text-sm flex-1">
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 50,000 certificates/year</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Up to 200 certificate types</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Custom branding</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Dedicated support</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>White-label (logo + footer)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500 shrink-0" />
                    <span>Advanced & summary reports</span>
                  </li>
                </ul>
                <Button variant="outline" className="w-full mt-4" asChild>
                  <Link href="/signup?plan=premium">Get Started</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it Works */}
      <section id="how-it-works" className="py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-14">
            <Badge variant="outline" className="mb-4">How it Works</Badge>
            <h2 className="text-3xl font-bold text-foreground mb-4">Get started in 3 simple steps</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                1
              </div>
              <h3 className="font-semibold text-foreground mb-2">Create Event</h3>
              <p className="text-sm text-muted-foreground">
                Set up your event and upload your certificate template design.
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                2
              </div>
              <h3 className="font-semibold text-foreground mb-2">Add Recipients</h3>
              <p className="text-sm text-muted-foreground">
                Import your recipient list via Excel or add them manually.
              </p>
            </div>
            <div className="text-center">
              <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4 text-xl font-bold text-primary">
                3
              </div>
              <h3 className="font-semibold text-foreground mb-2">Share & Download</h3>
              <p className="text-sm text-muted-foreground">
                Share the unique download page link via WhatsApp, Email or SMS. Recipients verify with their email/mobile to download PDF.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold text-primary-foreground mb-4">
            Ready to create professional certificates?
          </h2>
          <p className="text-primary-foreground/80 mb-8 max-w-xl mx-auto">
            Join hundreds of organizations using CertiStage to manage their certificates.
          </p>
          <Button size="lg" variant="secondary" asChild>
            <Link href="/signup" className="gap-2">
              Start Free Trial <ArrowRight className="h-4 w-4" />
            </Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 py-16 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-10">
            {/* Brand */}
            <div className="md:col-span-1">
              <div className="flex items-center gap-1.5 mb-4">
                <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} />
                <span className="font-semibold text-foreground">CertiStage</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Professional certificate generation platform for events, courses, and achievements.
              </p>
            </div>
            
            {/* Quick Links */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Quick Links</h4>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="#features" className="hover:text-foreground transition-colors">Features</Link>
                <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
                <Link href="#how-it-works" className="hover:text-foreground transition-colors">How it Works</Link>
              </nav>
            </div>
            
            {/* Account */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Account</h4>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/client/login" className="hover:text-foreground transition-colors">Login</Link>
                <Link href="/signup" className="hover:text-foreground transition-colors">Sign Up</Link>
                <Link href="/contact" className="hover:text-foreground transition-colors">Contact Sales</Link>
              </nav>
            </div>
            
            {/* Legal */}
            <div>
              <h4 className="font-medium text-foreground mb-4">Legal</h4>
              <nav className="flex flex-col gap-2 text-sm text-muted-foreground">
                <Link href="/about" className="hover:text-foreground transition-colors">About Us</Link>
                <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
                <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
                <Link href="/refund" className="hover:text-foreground transition-colors">Refund Policy</Link>
              </nav>
            </div>
          </div>
          
          <div className="border-t border-border/50 pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} CertiStage. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
