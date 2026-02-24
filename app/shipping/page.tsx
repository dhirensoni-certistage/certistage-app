import Link from "next/link"
import Image from "next/image"

export default function ShippingPage() {
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
        <h1 className="text-3xl font-bold mb-2">Shipping & Delivery Policy</h1>
        <p className="text-muted-foreground mb-8">Last updated: December 17, 2025</p>

        <div className="prose prose-neutral dark:prose-invert max-w-none space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Digital Product Delivery</h2>
            <p className="text-muted-foreground">
              CertiStage is a digital service platform. All our products and services are delivered electronically. There is no physical shipping involved.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Service Activation</h2>
            <div className="bg-muted/50 p-4 rounded-lg">
              <h3 className="font-medium mb-2">Instant Activation</h3>
              <p className="text-muted-foreground text-sm">
                Upon successful payment, your subscription plan is activated immediately. You will receive a confirmation email with your account details and can start using the service right away.
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. What You Receive</h2>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Account Access:</strong> Immediate access to your CertiStage dashboard</li>
              <li><strong>Plan Features:</strong> All features included in your selected plan</li>
              <li><strong>Email Confirmation:</strong> Receipt and subscription details sent to your email</li>
              <li><strong>Support Access:</strong> Access to customer support as per your plan</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Certificate Delivery</h2>
            <p className="text-muted-foreground mb-2">Certificates generated through our platform are delivered digitally:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Download Links:</strong> Unique download page links for each event</li>
              <li><strong>PDF Format:</strong> Certificates are generated as high-quality PDF files</li>
              <li><strong>Instant Generation:</strong> Certificates are generated in real-time</li>
              <li><strong>Recipient Access:</strong> Recipients can download using email/mobile verification</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Delivery Timeline</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 font-medium">Item</th>
                    <th className="text-left py-2 font-medium">Delivery Time</th>
                  </tr>
                </thead>
                <tbody className="text-muted-foreground">
                  <tr className="border-b">
                    <td className="py-2">Subscription Activation</td>
                    <td className="py-2">Instant (upon payment confirmation)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Account Credentials</td>
                    <td className="py-2">Instant (via email)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Certificate Generation</td>
                    <td className="py-2">Instant (real-time)</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2">Payment Receipt</td>
                    <td className="py-2">Within 24 hours (via email)</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Access Requirements</h2>
            <p className="text-muted-foreground mb-2">To access our digital services, you need:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li>A device with internet connection (computer, tablet, or smartphone)</li>
              <li>A modern web browser (Chrome, Firefox, Safari, Edge)</li>
              <li>Valid email address for account verification</li>
              <li>PDF reader for viewing/printing certificates</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Delivery Issues</h2>
            <p className="text-muted-foreground mb-2">If you experience any delivery issues:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2">
              <li><strong>Email not received:</strong> Check spam/junk folder, or contact support</li>
              <li><strong>Access issues:</strong> Clear browser cache or try a different browser</li>
              <li><strong>Payment confirmed but no access:</strong> Contact support immediately</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Service Availability</h2>
            <p className="text-muted-foreground">
              Our platform is available 24/7 with 99.9% uptime. Scheduled maintenance, if any, will be communicated in advance via email.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. No Physical Shipping</h2>
            <p className="text-muted-foreground">
              As a purely digital service, we do not offer physical shipping of any products. All certificates are digital (PDF format) and can be printed by the recipient if needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact for Delivery Issues</h2>
            <p className="text-muted-foreground">
              For any delivery-related queries or issues:<br />
              Email: <a href="mailto:support@certistage.com" className="text-primary hover:underline">support@certistage.com</a><br />
              Response Time: Within 24 hours
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
