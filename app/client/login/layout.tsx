import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Log in",
  description: "Log in to CertiStage with a one-time code sent to your email, or with Google.",
  alternates: { canonical: "/client/login" }
}

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children
}
