import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Get in touch with CertiStage team for support, sales inquiries, or partnership opportunities. We're here to help you with your certificate generation needs.",
  keywords: ["contact certistage", "certificate support", "sales inquiry", "customer support"],
  openGraph: {
    title: "Contact CertiStage - Get Support & Sales Help",
    description: "Get in touch with our team for support, sales inquiries, or partnership opportunities.",
  },
}

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
