"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ClientSidebar } from "@/components/client/client-sidebar"
import { MobileTopBar } from "@/components/client/mobile-top-bar"
import { getClientSession, clearClientSession, getPlanFeaturesMap, normalizePlanId } from "@/lib/auth"
import { Loader2, LogOut } from "lucide-react"
import Image from "next/image"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { PageTransition } from "@/components/ui/page-transition"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"

// Page title mapping
const pageTitles: Record<string, string> = {
  "/client/events": "Events - CertiStage",
  "/client/dashboard": "Dashboard - CertiStage",
  "/client/certificates": "Certificates - CertiStage",
  "/client/recipients": "Recipients - CertiStage",
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

  const normalizePlan = (plan?: string) => normalizePlanId(plan)

  // Set page title
  useEffect(() => {
    const baseTitle = pageTitles[pathname] || "CertiStage"
    document.title = baseTitle
  }, [pathname])

  // Sync the stored plan with the server (shared, cached request)
  const syncSessionWithServer = async (session: ReturnType<typeof getClientSession>) => {
    if (!session || session.loginType !== "user" || !session.userId) return
    const result = await fetchClientProfile()
    if (result.status === 401) {
      // Server session missing or expired: the local copy is stale
      clearClientSession()
      router.replace("/client/login")
      return
    }
    if (result.ok && result.user) {
      const updated = applyProfileToSession(result.user)
      if (updated) setUserPlan(normalizePlan(updated.userPlan))
    }
  }

  // Pages that should render without any layout (standalone pages)
  const standalonePages = ["/client/login", "/client/complete-payment"]
  const isStandalonePage = standalonePages.includes(pathname)

  useEffect(() => {
    const seedPlanConfig = async () => {
      try {
        // Plans change rarely: reuse the local copy for 10 minutes
        const seededAt = Number(localStorage.getItem("plan_config_at") || 0)
        if (localStorage.getItem("plan_config") && Date.now() - seededAt < 10 * 60 * 1000) return
        const res = await fetch("/api/plan-config")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data?.plans)) {
          localStorage.setItem("plan_config", JSON.stringify(data.plans))
          localStorage.setItem("plan_config_at", String(Date.now()))
        }
      } catch {
        // Ignore plan config failures
      }
    }

    seedPlanConfig()

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

      // Render right away from the stored session; the plan check runs in the background
      setIsLoading(false)
      syncSessionWithServer(session)
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
    const planFeatures = getPlanFeaturesMap()
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
                  {planFeatures[userPlan]?.displayName || "Free"}
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
    <div className="flex h-screen flex-col lg:flex-row bg-[#FDFDFD] overflow-hidden">
      <MobileTopBar />
      <div className="hidden lg:flex h-full shrink-0">
        <ClientSidebar />
      </div>
      <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden lg:border-l border-[#E5E5E5] bg-[#FDFDFD] scrollbar-minimal">
        <PageTransition>
          {children}
        </PageTransition>
      </main>
    </div>
  )
}
