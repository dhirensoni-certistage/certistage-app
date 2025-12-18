import Link from "next/link"
import Image from "next/image"

export default function TermsPage() {
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

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Acceptance of Terms</h2>
            <p className="text-muted-foreground">
              By accessing and using CertiStage ("Service"), you accept and agree to be bound by the terms and provisions of this agreement. If you do not agree to these terms, please do not use our Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Description of Service</h2>
            <p className="text-muted-foreground">
              CertiStage is a certificate generation and management platform that allows users to create, customize, and distribute digital certificates for events, courses, and achievements.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Accounts</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>You must provide accurate and complete information when creating an account.</li>
              <li>You are responsible for maintaining the confidentiality of your account credentials.</li>
              <li>You are responsible for all activities that occur under your account.</li>
              <li>You must notify us immediately of any unauthorized use of your account.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscription Plans & Payments</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Paid subscriptions are billed annually in advance.</li>
              <li>All prices are in Indian Rupees (INR) and inclusive of applicable taxes.</li>
              <li>Subscription fees are non-refundable except as stated in our Refund Policy.</li>
              <li>We reserve the right to modify pricing with 30 days advance notice.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Acceptable Use</h2>
            <p className="text-muted-foreground mb-2">You agree not to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Use the Service for any illegal or unauthorized purpose.</li>
              <li>Upload content that infringes on intellectual property rights.</li>
              <li>Attempt to gain unauthorized access to our systems.</li>
              <li>Use the Service to distribute spam or malicious content.</li>
              <li>Create fraudulent or misleading certificates.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Intellectual Property</h2>
            <p className="text-muted-foreground">
              You retain ownership of content you upload. By using our Service, you grant us a license to use, store, and process your content solely for providing the Service. CertiStage branding, logos, and software remain our exclusive property.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Data & Privacy</h2>
            <p className="text-muted-foreground">
              Your use of the Service is also governed by our Privacy Policy. We collect and process data as described therein.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground">
              We strive for 99.9% uptime but do not guarantee uninterrupted service. We may perform maintenance with reasonable notice. We are not liable for any downtime or service interruptions.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Limitation of Liability</h2>
            <p className="text-muted-foreground">
              CertiStage shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of the Service. Our total liability shall not exceed the amount paid by you in the 12 months preceding the claim.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Termination</h2>
            <p className="text-muted-foreground">
              We may terminate or suspend your account at any time for violation of these terms. Upon termination, your right to use the Service ceases immediately. You may export your data within 30 days of termination.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Governing Law</h2>
            <p className="text-muted-foreground">
              These terms shall be governed by the laws of India. Any disputes shall be subject to the exclusive jurisdiction of courts in Mumbai, Maharashtra.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact</h2>
            <p className="text-muted-foreground">
              For questions about these Terms, contact us at: <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-border/50 py-6 mt-12">
        <div className="container mx-auto px-4 text-center text-sm text-muted-foreground">
          <p>&copy; {new Date().getFullYear()} CertiStage. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
