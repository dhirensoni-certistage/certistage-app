import Link from "next/link"
import Image from "next/image"

const linkClass = "text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"

/** Marketing site footer shared by the public pages. */
export function SiteFooter() {
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
              Certificates for events, colleges, institutes and training programs.
            </p>
          </div>

          <div>
            <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Product</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/#features" className={linkClass}>Features</Link>
              <Link href="/#pricing" className={linkClass}>Pricing</Link>
              <Link href="/#faq" className={linkClass}>FAQ</Link>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Company</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/about" className={linkClass}>About</Link>
              <Link href="/contact" className={linkClass}>Contact</Link>
              <a href="mailto:support@certistage.com" className={linkClass}>support@certistage.com</a>
            </nav>
          </div>

          <div>
            <h4 className="font-semibold text-xs text-neutral-900 dark:text-white mb-3 uppercase tracking-wider">Legal</h4>
            <nav className="flex flex-col gap-2">
              <Link href="/privacy" className={linkClass}>Privacy</Link>
              <Link href="/terms" className={linkClass}>Terms</Link>
              <Link href="/refund" className={linkClass}>Refund Policy</Link>
              <Link href="/shipping" className={linkClass}>Shipping & Delivery</Link>
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
