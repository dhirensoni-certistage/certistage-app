import Link from "next/link"
import Image from "next/image"
import { Award, Users, Zap, Shield, Target, Heart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "About Us",
  description: "Learn about CertiStage's mission to simplify certificate management for organizations. Trusted by 500+ companies worldwide for professional certificate generation.",
  keywords: ["about certistage", "certificate platform", "digital certificates", "professional certificates", "certificate management"],
  openGraph: {
    title: "About CertiStage - Professional Certificate Generation Platform",
    description: "Learn about CertiStage's mission to simplify certificate management for organizations.",
  },
}

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} />
            <span className="font-semibold text-lg">CertiStage</span>
          </Link>
        </div>
      </header>

      <main>
        {/* Hero Section */}
        <section className="py-16 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 text-center max-w-3xl">
            <h1 className="text-4xl font-bold mb-4">About CertiStage</h1>
            <p className="text-lg text-muted-foreground">
              Empowering organizations to create and distribute professional certificates with ease. We believe every achievement deserves recognition.
            </p>
          </div>
        </section>

        {/* Mission Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-2xl font-bold mb-4">Our Mission</h2>
                <p className="text-muted-foreground mb-4">
                  At CertiStage, our mission is to simplify certificate management for organizations of all sizes. We understand the importance of recognizing achievements, whether it's completing a course, winning a competition, or participating in an event.
                </p>
                <p className="text-muted-foreground">
                  We've built a platform that makes it easy to create beautiful, professional certificates and deliver them seamlessly to recipients - saving you time and effort while ensuring every achievement is properly celebrated.
                </p>
              </div>
              <div className="flex justify-center">
                <div className="h-48 w-48 rounded-full bg-primary/10 flex items-center justify-center">
                  <Target className="h-24 w-24 text-primary" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Values Section */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl font-bold text-center mb-10">Our Values</h2>
            <div className="grid md:grid-cols-3 gap-6">
              <Card className="border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Zap className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Simplicity</h3>
                  <p className="text-sm text-muted-foreground">
                    We believe powerful tools should be easy to use. Our platform is designed for simplicity without compromising on features.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Shield className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Reliability</h3>
                  <p className="text-sm text-muted-foreground">
                    Your certificates matter. We ensure 99.9% uptime and secure, reliable delivery every time.
                  </p>
                </CardContent>
              </Card>
              <Card className="border-border/50">
                <CardContent className="p-6 text-center">
                  <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-4">
                    <Heart className="h-6 w-6 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">Customer First</h3>
                  <p className="text-sm text-muted-foreground">
                    Your success is our success. We're committed to providing excellent support and continuously improving based on your feedback.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        {/* Stats Section */}
        <section className="py-16">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">Trusted by Organizations</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
              <div>
                <p className="text-4xl font-bold text-primary">10K+</p>
                <p className="text-sm text-muted-foreground">Certificates Generated</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary">500+</p>
                <p className="text-sm text-muted-foreground">Happy Clients</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary">50+</p>
                <p className="text-sm text-muted-foreground">Cities Served</p>
              </div>
              <div>
                <p className="text-4xl font-bold text-primary">99.9%</p>
                <p className="text-sm text-muted-foreground">Uptime</p>
              </div>
            </div>
          </div>
        </section>

        {/* Who We Serve */}
        <section className="py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold text-center mb-10">Who We Serve</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Award className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Educational Institutions</h3>
                  <p className="text-sm text-muted-foreground">Schools, colleges, and universities for course completions, workshops, and academic achievements.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Event Organizers</h3>
                  <p className="text-sm text-muted-foreground">Conferences, competitions, hackathons, and cultural events requiring participant certificates.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Zap className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">Training Companies</h3>
                  <p className="text-sm text-muted-foreground">Corporate training providers and online course platforms for certification programs.</p>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold mb-1">NGOs & Associations</h3>
                  <p className="text-sm text-muted-foreground">Non-profits and professional associations for volunteer recognition and membership certificates.</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Contact CTA */}
        <section className="py-16">
          <div className="container mx-auto px-4 text-center max-w-2xl">
            <h2 className="text-2xl font-bold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-6">
              Have questions or want to learn more about how CertiStage can help your organization? We'd love to hear from you.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Button asChild>
                <Link href="/contact">Contact Us</Link>
              </Button>
              <Button variant="outline" asChild>
                <Link href="/signup">Start Free Trial</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground mt-6">
              Email: <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a>
            </p>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 py-6">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CertiStage. All rights reserved.</p>
        </div>
      </footer>
      </div>
  )
}
