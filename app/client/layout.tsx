"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ClientSidebar } from "@/components/client/client-sidebar"
import { getClientSession, clearClientSession, PLAN_FEATURES } from "@/lib/auth"
import { Loader2, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PageTransition } from "@/components/ui/page-transition"

// Page title mapping
const pageTitles: Record<string, string> = {
  "/client/events": "Events - CertiStage",
  "/client/dashboard": "Dashboard - CertiStage",
  "/client/certificates": "Certificates - CertiStage",
  "/client/recipients": "Attendees - CertiStage",
  "/client/reports": "Reports - CertiStage",
  "/client/settings": "Settings - CertiStage",
  "/client/upgrade": "Upgrade - CertiStage",
  "/client/login": "Login - CertiStage",
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [hasEventSelected, setHasEventSelected] = useState(false)
  const [userName, setUserName] = useState("")
  const [userPlan, setUserPlan] = useState<string>("free")

  const normalizePlan = (plan?: string): "free" | "professional" | "enterprise" | "premium" => {
    const candidate = String(plan || "free").toLowerCase()
    const validPlans = ["free", "professional", "enterprise", "premium"]
    return validPlans.includes(candidate) ? (candidate as "free" | "professional" | "enterprise" | "premium") : "free"
  }

  // Set page title
  useEffect(() => {
    const baseTitle = pageTitles[pathname] || "CertiStage"
    document.title = baseTitle
  }, [pathname])

  // Sync session with server to get latest plan
  const syncSessionWithServer = async (session: ReturnType<typeof getClientSession>) => {
    if (!session || session.loginType !== "user" || !session.userId) return

    try {
      const res = await fetch(`/api/client/profile?userId=${encodeURIComponent(session.userId)}`)
      if (res.ok) {
        const data = await res.json()
        const serverPlan = normalizePlan(data.user?.plan)
        const updatedSession = {
          ...session,
          userPlan: serverPlan,
          planExpiresAt: data.user?.planExpiresAt,
          pendingPlan: data.user?.pendingPlan || session.pendingPlan || null
        }
        localStorage.setItem("clientSession", JSON.stringify(updatedSession))
        setUserPlan(serverPlan)
      }
    } catch (error) {
      console.error("Failed to sync session:", error)
    }
  }

  // Pages that should render without any layout (standalone pages)
  const standalonePages = ["/client/login", "/client/complete-payment"]
  const isStandalonePage = standalonePages.includes(pathname)

  useEffect(() => {
    // Skip everything for standalone pages (login, payment completion)
    if (isStandalonePage) {
      setIsLoading(false)
      setIsAuthenticated(false)
      return
    }

    const initialize = async () => {
      const session = getClientSession()

      if (!session) {
        // Not logged in - redirect to login
        router.replace("/client/login")
        return
      }

      setIsAuthenticated(true)
      setUserName(session.userName || "")
      setUserPlan(normalizePlan(session.userPlan))

      // Check if user has selected an event
      const eventSelected = !!(session.eventId && session.loginType === "user")
      setHasEventSelected(eventSelected)

      // Always sync plan from DB before rendering child pages
      await syncSessionWithServer(session)
      setIsLoading(false)
    }

    initialize()
  }, [pathname, router])

  const handleLogout = () => {
    clearClientSession()
    toast.success("Logged out successfully")
    router.push("/client/login")
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFDFD]">
        <Loader2 className="h-8 w-8 animate-spin text-black" />
      </div>
    )
  }

  // Standalone pages (login, payment completion) - no layout wrapper
  if (isStandalonePage) {
    return <>{children}</>
  }

  // Authenticated pages - with sidebar
  if (!isAuthenticated) {
    return null
  }

  // Check if we're on events page (always show minimal header layout on events page)
  const isEventsPage = pathname === "/client/events"
  const showMinimalLayout = isEventsPage

  // Minimal layout for events listing (like Evenuefy)
  if (showMinimalLayout) {
    return (
      <div className="min-h-screen bg-[#FDFDFD]">
        {/* Top Header */}
        <header className="border-b border-[#E5E5E5] bg-white/80 backdrop-blur sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4 md:px-8">
            {/* Logo */}
            <Link href="/client/events" className="flex items-center gap-2">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
              <span className="font-semibold text-[17px] text-black">CertiStage</span>
            </Link>

            {/* Right side - User info & Logout */}
            <div className="flex items-center gap-4">
              {/* Plan Badge */}
              <div className="hidden sm:flex items-center gap-3">
                <span className="text-sm font-medium text-black">{userName}</span>
                <span className="px-2.5 py-1 rounded text-xs font-semibold bg-neutral-100 text-[#333] border border-neutral-200">
                  {PLAN_FEATURES[userPlan as keyof typeof PLAN_FEATURES]?.displayName || "Free"}
                </span>
              </div>

              <Button
                variant="ghost"
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-[#666] hover:text-black hover:bg-neutral-100"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1">
          {children}
        </main>
      </div>
    )
  }

  // Full layout with sidebar (when event is selected)
  return (
    <div className="flex h-screen bg-[#FDFDFD] overflow-hidden">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto overflow-x-hidden border-l border-[#E5E5E5] bg-[#FDFDFD] scrollbar-minimal">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}
