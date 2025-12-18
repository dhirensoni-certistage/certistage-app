import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Sign Up - Create Your Account",
  description: "Create your free CertiStage account and start generating professional certificates for your events, courses, and achievements. No credit card required.",
  keywords: ["sign up", "create account", "certificate generator signup", "free certificate maker"],
  openGraph: {
    title: "Sign Up for CertiStage - Free Certificate Generation",
    description: "Create your free account and start generating professional certificates today.",
  },
}

export default function SignupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
