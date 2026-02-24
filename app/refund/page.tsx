import Link from "next/link"
import Image from "next/image"
import { AlertCircle } from "lucide-react"
import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Refund Policy",
  description: "CertiStage Refund Policy - Learn about our refund and cancellation policy for subscription plans and services.",
  openGraph: {
    title: "Refund Policy - CertiStage",
    description: "Learn about our refund and cancellation policy for subscription plans.",
  },
}

export default function RefundPage() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/50 bg-background">
        <div className="container mx-auto px-4 h-14 flex items-center">
          <Link href="/" className="flex items-center gap-1.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            <span className="font-semibold text-lg">CertiStage</span>
          </Link>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12 max-w-4xl">
        <h1 className="text-3xl font-bold mb-2">Refund & Cancellation Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          {/* Important Notice */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex gap-3">
            <AlertCircle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-600 dark:text-amber-400 mb-1">Important Notice</h3>
              <p className="text-sm text-muted-foreground">
                All purchases on CertiStage are final and non-refundable. Please read this policy carefully before making a purchase.
              </p>
            </div>
          </div>

          <section>
            <h2 className="text-xl font-semibold mb-3">1. No Refund Policy</h2>
            <p className="text-muted-foreground">
              CertiStage operates on a strict <strong>No Refund Policy</strong>. Once a subscription plan is purchased, the payment is final and non-refundable under any circumstances. This policy applies to all subscription plans including Professional, Enterprise, and Premium.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Why No Refunds?</h2>
            <p className="text-muted-foreground mb-2">Our no-refund policy exists because:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>CertiStage is a digital service with immediate access upon payment</li>
              <li>Service resources are allocated instantly upon subscription activation</li>
              <li>We offer a comprehensive Free plan to test our platform before purchasing</li>
              <li>All features and limitations are clearly described before purchase</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. Free Trial</h2>
            <p className="text-muted-foreground">
              We strongly encourage all users to try our <strong>Free plan</strong> before purchasing a paid subscription. The Free plan allows you to:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Generate up to 50 certificates</li>
              <li>Test certificate design and creation features</li>
              <li>Experience the platform functionality</li>
              <li>Evaluate if CertiStage meets your requirements</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              This ensures you can make an informed decision before committing to a paid plan.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Subscription Cancellation</h2>
            <p className="text-muted-foreground mb-2">While refunds are not available, you may cancel your subscription:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your subscription will remain active until the end of the current billing period</li>
              <li>No further charges will be made after cancellation</li>
              <li>You will retain access to all features until the subscription expires</li>
              <li>Auto-renewal will be disabled upon cancellation request</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. How to Cancel</h2>
            <p className="text-muted-foreground mb-2">To cancel your subscription (without refund):</p>
            <ol className="list-decimal pl-6 text-muted-foreground space-y-2">
              <li>Email us at <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a></li>
              <li>Subject line: "Subscription Cancellation - [Your Email]"</li>
              <li>Include your registered email address</li>
              <li>Our team will process your cancellation within 2-3 business days</li>
            </ol>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Data After Cancellation</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Your data will be retained for 30 days after subscription expiry</li>
              <li>You can export your data during this period</li>
              <li>After 30 days, all data will be permanently deleted</li>
              <li>Previously generated certificate download links will continue to work</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Exceptions</h2>
            <p className="text-muted-foreground">
              In rare cases, we may consider exceptions only for:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>Duplicate/accidental charges (with proof of duplicate transaction)</li>
              <li>Technical errors resulting in incorrect billing amount</li>
              <li>Service completely unavailable for extended periods due to our fault</li>
            </ul>
            <p className="text-muted-foreground mt-2">
              Such cases will be reviewed individually and any decision will be at our sole discretion.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Plan Upgrades</h2>
            <p className="text-muted-foreground">
              If you wish to upgrade to a higher plan, you can do so at any time. The price difference will be charged for the upgrade. Downgrades are not available mid-subscription.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Contact Us</h2>
            <p className="text-muted-foreground">
              For any questions about this policy or your subscription:<br />
              Email: <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a>
            </p>
          </section>

          {/* Final Notice */}
          <div className="bg-muted/50 rounded-lg p-4 mt-8">
            <p className="text-sm text-muted-foreground">
              By purchasing a subscription on CertiStage, you acknowledge that you have read, understood, and agree to this No Refund Policy. We recommend using our Free plan to evaluate the service before making a purchase.
            </p>
          </div>
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

