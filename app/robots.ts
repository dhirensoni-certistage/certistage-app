import { MetadataRoute } from "next"

// Public marketing pages are crawlable. The portal, admin, APIs and
// transactional flows are not. Recipient download pages are crawlable but
// carry a noindex tag (see app/download/layout.tsx), which is what Google
// recommends over a robots block for pages that should stay out of search.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          "/api/",
          "/admin/",
          "/client/",
          "/auth/",
          "/setup",
          "/verify-email",
          "/complete-payment",
          "/test-links",
          "/download/embed"
        ]
      }
    ],
    sitemap: "https://www.certistage.com/sitemap.xml",
    host: "https://www.certistage.com"
  }
}
