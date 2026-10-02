"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { Menu, X } from "lucide-react"
import { Button } from "@/components/ui/button"

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" }
]

/** Marketing site header: landing, contact, about and other public pages. */
export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-neutral-200 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 hover:opacity-80 transition-opacity">
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
          <span className="font-semibold text-[17px] text-neutral-900 dark:text-white">CertiStage</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7">
          {NAV.filter((item) => item.label !== "FAQ").map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="text-sm text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white transition-colors"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex text-sm">
            <Link href="/client/login">Sign In</Link>
          </Button>
          <Button size="sm" asChild className="text-sm h-9 px-4">
            <Link href="/signup">Start free</Link>
          </Button>
          <button
            type="button"
            className="md:hidden h-9 w-9 inline-flex items-center justify-center rounded-md text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="md:hidden border-t border-neutral-200 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] px-6 py-3 flex flex-col">
          {[...NAV, { href: "/client/login", label: "Sign In" }].map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              className="py-3 text-sm text-neutral-700 dark:text-neutral-300 border-b border-neutral-100 dark:border-neutral-900 last:border-0"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  )
}
