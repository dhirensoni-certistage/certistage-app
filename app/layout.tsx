import type React from "react"
import type { Metadata, Viewport } from "next"
import { Inter, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import { Toaster } from "@/components/ui/sonner"
import { ThemeProvider } from "@/components/theme-provider"
import AuthProvider from "@/components/providers/auth-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" })
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" })

export const metadata: Metadata = {
  metadataBase: new URL('https://www.certistage.com'),
  title: {
    default: "CertiStage - Professional Certificate Generation Platform",
    template: "%s | CertiStage"
  },
  description: "Create, customize, and distribute professional certificates for events, courses, and achievements. Bulk generation, custom templates, easy recipient download. Trusted by 500+ organizations.",
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
    title: 'CertiStage - Professional Certificate Generation Platform',
    description: 'Create, customize, and distribute professional certificates for events, courses, and achievements. Trusted by 500+ organizations.',
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
    title: 'CertiStage - Professional Certificate Generation Platform',
    description: 'Create, customize, and distribute professional certificates for events, courses, and achievements.',
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
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} ${geistMono.variable} font-sans antialiased`}>
        <AuthProvider>
          <ThemeProvider attribute="class" defaultTheme="light" enableSystem disableTransitionOnChange>
            {children}
            <Toaster />
          </ThemeProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
