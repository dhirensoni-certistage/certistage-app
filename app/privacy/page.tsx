import Link from "next/link"
import Image from "next/image"

export default function PrivacyPage() {
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
        <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground">
              CertiStage ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our certificate generation platform.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <h3 className="text-lg font-medium mb-2">Personal Information</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Name, email address, phone number</li>
              <li>Organization/company name</li>
              <li>Billing information and payment details</li>
              <li>Account credentials</li>
            </ul>
            <h3 className="text-lg font-medium mb-2 mt-4">Certificate Recipient Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Recipient names, email addresses, mobile numbers</li>
              <li>Certificate-related information (registration numbers, achievements, etc.)</li>
            </ul>
            <h3 className="text-lg font-medium mb-2 mt-4">Usage Data</h3>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>IP address, browser type, device information</li>
              <li>Pages visited, features used, time spent</li>
              <li>Certificate download statistics</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>To provide and maintain our Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To generate and deliver certificates</li>
              <li>To communicate with you about your account</li>
              <li>To send service updates and promotional materials (with consent)</li>
              <li>To improve our Service and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Sharing & Disclosure</h2>
            <p className="text-muted-foreground mb-2">We may share your information with:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Payment Processors:</strong> Razorpay for processing payments securely</li>
              <li><strong>Service Providers:</strong> Cloud hosting, email services, analytics</li>
              <li><strong>Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="text-muted-foreground mt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Security</h2>
            <p className="text-muted-foreground">
              We implement appropriate security measures including encryption, secure servers, and access controls. However, no method of transmission over the Internet is 100% secure. We cannot guarantee absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data Retention</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Account data is retained while your account is active</li>
              <li>Certificate data is retained for the duration of your subscription</li>
              <li>Payment records are retained for 7 years for tax/legal compliance</li>
              <li>You may request data deletion by contacting us</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Your Rights</h2>
            <p className="text-muted-foreground mb-2">You have the right to:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Cookies</h2>
            <p className="text-muted-foreground">
              We use cookies and similar technologies to enhance your experience, analyze usage, and for authentication. You can control cookies through your browser settings.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Third-Party Links</h2>
            <p className="text-muted-foreground">
              Our Service may contain links to third-party websites. We are not responsible for their privacy practices. Please review their privacy policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Children's Privacy</h2>
            <p className="text-muted-foreground">
              Our Service is not intended for children under 18. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">11. Changes to This Policy</h2>
            <p className="text-muted-foreground">
              We may update this Privacy Policy from time to time. We will notify you of significant changes via email or through the Service.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">12. Contact Us</h2>
            <p className="text-muted-foreground">
              For privacy-related questions or to exercise your rights, contact us at:<br />
              Email: <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a>
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
