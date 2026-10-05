import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import AuthProvider from "@/components/providers/auth-provider"
import { ErrorBoundary } from "@/components/ui/error-boundary"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

// Prices mirror the default plans in lib/plan-config.ts (admin can override them in the database)
const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://www.certistage.com/#organization",
      "name": "CertiStage",
      "url": "https://www.certistage.com",
      "logo": "https://www.certistage.com/Certistage-logo.svg",
      "address": {
        "@type": "PostalAddress",
        "addressLocality": "Ahmedabad",
        "addressRegion": "Gujarat",
        "addressCountry": "IN"
      }
    },
    {
      "@type": "WebSite",
      "@id": "https://www.certistage.com/#website",
      "name": "CertiStage",
      "url": "https://www.certistage.com",
      "publisher": { "@id": "https://www.certistage.com/#organization" }
    },
    {
      "@type": "SoftwareApplication",
      "name": "CertiStage",
      "applicationCategory": "BusinessApplication",
      "operatingSystem": "Web",
      "url": "https://www.certistage.com",
      "description": "Issue certificates to thousands of attendees, students and participants. For events, colleges, institutes and training programs.",
      "featureList": "Excel import, Visual template editor, Self-service download page, Email delivery with open and click tracking, Add to LinkedIn profile, WhatsApp share, Organiser logo and branding, Download tracking and reports",
      "audience": { "@type": "Audience", "audienceType": "Event organisers, colleges, universities, training institutes" },
      "areaServed": "IN",
      "publisher": { "@id": "https://www.certistage.com/#organization" },
      "offers": {
        "@type": "AggregateOffer",
        "priceCurrency": "INR",
        "lowPrice": "0",
        "highPrice": "19999",
        "offerCount": 5,
        "offers": [
          { "@type": "Offer", "name": "Free", "price": "0", "priceCurrency": "INR" },
          { "@type": "Offer", "name": "One event", "price": "799", "priceCurrency": "INR", "description": "One event, up to 1,000 certificates, paid once" },
          { "@type": "Offer", "name": "Professional", "price": "4999", "priceCurrency": "INR" },
          { "@type": "Offer", "name": "Enterprise", "price": "9999", "priceCurrency": "INR" },
          { "@type": "Offer", "name": "Premium", "price": "19999", "priceCurrency": "INR" }
        ]
      }
    }
  ]
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.certistage.com'),
  title: {
    default: "CertiStage - Certificates for Events, Colleges and Institutes",
    template: "%s | CertiStage"
  },
  description: "Bulk certificate generator for events, colleges, institutes and training programs in India. Upload your design and an Excel sheet; every recipient downloads their own certificate or gets it by email, with Add to LinkedIn built in. From ₹799 per event.",
  keywords: [
    "certificate generator",
    "online certificate maker",
    "bulk certificate generation",
    "event certificates",
    "course completion certificate",
    "participation certificate",
    "certificate management system",
    "digital certificates India",
    "certificate software",
    "automated certificate generation",
    "bulk certificate generator excel",
    "CME certificate for conference",
    "convocation certificate online",
    "certificate with LinkedIn add to profile",
    "send certificates by email bulk"
  ],
  authors: [{ name: "CertiStage" }],
  creator: "CertiStage",
  publisher: "CertiStage",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  icons: {
    icon: '/Certistage_icon.svg',
    shortcut: '/Certistage_icon.svg',
    apple: '/Certistage_icon.svg',
  },
  openGraph: {
    type: 'website',
    locale: 'en_IN',
    url: 'https://www.certistage.com',
    siteName: 'CertiStage',
    title: 'CertiStage - Certificates for Events, Colleges and Institutes',
    description: 'Issue certificates to thousands of attendees, students and participants in minutes. For events, colleges, institutes and training programs.',
    images: [
      {
        url: '/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CertiStage - Certificate Generation Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CertiStage - Certificates for Events, Colleges and Institutes',
    description: 'Issue certificates to thousands of attendees, students and participants in minutes. For events, colleges, institutes and training programs.',
    images: ['/og-image.png'],
  },
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
    ? { verification: { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } }
    : {}),
}



export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8f8f6" },
    { media: "(prefers-color-scheme: dark)", color: "#1a1a22" },
  ],
  width: "device-width",
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased overflow-x-hidden`} suppressHydrationWarning>
        <ErrorBoundary>
          <AuthProvider>
            <ThemeProvider attribute="class" defaultTheme="light" forcedTheme="light" enableSystem={false} disableTransitionOnChange>
              {children}
              <Toaster />
            </ThemeProvider>
          </AuthProvider>
        </ErrorBoundary>
        <Analytics />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </body>
    </html>
  )
}
