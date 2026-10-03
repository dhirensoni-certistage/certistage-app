import { MetadataRoute } from "next"

const BASE = "https://www.certistage.com"

// Update a date when that page's content changes. Google uses lastmod only
// when it is accurate, and ignores priority and changefreq.
const PAGES: Array<{ path: string; updated: string }> = [
  { path: "/", updated: "2026-10-03" },
  { path: "/about", updated: "2026-09-20" },
  { path: "/contact", updated: "2026-09-20" },
  { path: "/signup", updated: "2026-09-28" },
  { path: "/privacy", updated: "2026-09-01" },
  { path: "/terms", updated: "2026-09-01" },
  { path: "/refund", updated: "2026-09-01" },
  { path: "/shipping", updated: "2026-09-01" }
]

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map((p) => ({ url: `${BASE}${p.path}`, lastModified: new Date(p.updated) }))
}
