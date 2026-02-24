import Link from "next/link"
import Image from "next/image"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy · CertiStage",
  description: "CertiStage Privacy Policy - Learn how we collect, use, and protect your personal information when using our certificate generation platform.",
}

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
        <div className="container mx-auto px-6 h-16 flex items-center">
          <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-[17px] text-neutral-900 dark:text-white">CertiStage</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-6 py-12 md:py-16 max-w-3xl">
        <h1 className="text-3xl md:text-4xl font-bold text-neutral-900 dark:text-white mb-2">Privacy Policy</h1>
        <p className="text-sm text-neutral-500 dark:text-neutral-500 mb-12">Last updated: December 17, 2025</p>

        <div className="space-y-8 text-neutral-600 dark:text-neutral-400">
          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">1. Introduction</h2>
            <p className="leading-relaxed">
              CertiStage ("we", "our", "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our certificate generation platform.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">2. Information We Collect</h2>
            <h3 className="text-base font-medium text-neutral-900 dark:text-white">Personal Information</h3>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>Name, email address, phone number</li>
              <li>Organization/company name</li>
              <li>Billing information and payment details</li>
              <li>Account credentials</li>
            </ul>
            <h3 className="text-base font-medium text-neutral-900 dark:text-white pt-3">Certificate Recipient Data</h3>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>Recipient names, email addresses, mobile numbers</li>
              <li>Certificate-related information (registration numbers, achievements, etc.)</li>
            </ul>
            <h3 className="text-base font-medium text-neutral-900 dark:text-white pt-3">Usage Data</h3>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>IP address, browser type, device information</li>
              <li>Pages visited, features used, time spent</li>
              <li>Certificate download statistics</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">3. How We Use Your Information</h2>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>To provide and maintain our Service</li>
              <li>To process payments and manage subscriptions</li>
              <li>To generate and deliver certificates</li>
              <li>To communicate with you about your account</li>
              <li>To send service updates and promotional materials (with consent)</li>
              <li>To improve our Service and user experience</li>
              <li>To comply with legal obligations</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">4. Data Sharing & Disclosure</h2>
            <p className="leading-relaxed">We may share your information with:</p>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li><strong className="text-neutral-900 dark:text-white">Payment Processors:</strong> Razorpay for processing payments securely</li>
              <li><strong className="text-neutral-900 dark:text-white">Service Providers:</strong> Cloud hosting, email services, analytics</li>
              <li><strong className="text-neutral-900 dark:text-white">Legal Requirements:</strong> When required by law or to protect our rights</li>
            </ul>
            <p className="leading-relaxed pt-2">We do not sell your personal information to third parties.</p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">5. Data Security</h2>
            <p className="leading-relaxed">
              We implement appropriate security measures including encryption, secure servers, and access controls. However, no method of transmission over the Internet is 100% secure.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">6. Data Retention</h2>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>Account data is retained while your account is active</li>
              <li>Certificate data is retained for the duration of your subscription</li>
              <li>Payment records are retained for 7 years for tax/legal compliance</li>
              <li>You may request data deletion by contacting us</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">7. Your Rights</h2>
            <p className="leading-relaxed">You have the right to:</p>
            <ul className="list-disc pl-6 space-y-1.5 leading-relaxed">
              <li>Access your personal data</li>
              <li>Correct inaccurate data</li>
              <li>Request deletion of your data</li>
              <li>Export your data</li>
              <li>Opt-out of marketing communications</li>
              <li>Withdraw consent where applicable</li>
            </ul>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">8. Cookies</h2>
            <p className="leading-relaxed">
              We use cookies and similar technologies to enhance your experience, analyze usage, and for authentication. You can control cookies through your browser settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-xl font-semibold text-neutral-900 dark:text-white">9. Contact Us</h2>
            <p className="leading-relaxed">
              For privacy-related questions or to exercise your rights, contact us at:{" "}
              <a href="mailto:support@certistage.com" className="text-neutral-900 dark:text-white hover:underline">support@certistage.com</a>
            </p>
          </section>
        </div>
      </main>

      <footer className="border-t border-neutral-200 dark:border-neutral-800 py-8 mt-12">
        <div className="container mx-auto px-6 text-center">
          <p className="text-xs text-neutral-500 dark:text-neutral-500">
            © {new Date().getFullYear()} CertiStage. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  )
}
