import type { Metadata } from "next"

// Recipient download pages are personal, near-duplicate pages; keep them out
// of search results while still letting crawlers follow links on them.
export const metadata: Metadata = {
  title: "Download your certificate",
  robots: { index: false, follow: true }
}

export default function DownloadLayout({ children }: { children: React.ReactNode }) {
  return children
}
