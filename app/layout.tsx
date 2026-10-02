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

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "CertiStage",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "0",
    "priceCurrency": "INR"
  },
  "description": "Issue certificates to thousands of attendees, students and participants. For events, colleges, institutes and training programs.",
  "featureList": "Excel import, Visual template editor, Self-service download page, Download tracking",
  "author": {
    "@type": "Organization",
    "name": "CertiStage",
    "url": "https://www.certistage.com"
  }
}

export const metadata: Metadata = {
  metadataBase: new URL('https://www.certistage.com'),
  title: {
    default: "CertiStage - Certificates for Events, Colleges and Institutes",
    template: "%s | CertiStage"
  },
  description: "Issue certificates to thousands of attendees, students and participants in minutes. Upload your design and an Excel sheet; every recipient downloads their own certificate. For events, colleges, institutes and training programs.",
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
    "automated certificate generation"
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
  verification: {
    google: 'your-google-verification-code',
  },
  alternates: {
    canonical: 'https://www.certistage.com',
  },
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
