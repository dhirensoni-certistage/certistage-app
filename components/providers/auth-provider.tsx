"use client"

import { usePathname } from "next/navigation"
import { SessionProvider } from "next-auth/react"

// Recipient download pages never use the organiser's login, so they skip the session
// provider and its /api/auth/session calls (on load and again on every tab refocus)
const NO_SESSION_PREFIXES = ["/download", "/d/"]

export default function AuthProvider({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname() || ""
  if (NO_SESSION_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return <>{children}</>
  }
  return <SessionProvider>{children}</SessionProvider>
}
