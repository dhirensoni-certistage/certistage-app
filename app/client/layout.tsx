"use client"

import { useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"
import { ClientSidebar } from "@/components/client/client-sidebar"
import { MobileTopBar } from "@/components/client/mobile-top-bar"
import { getClientSession, clearClientSession, getPlanFeaturesMap, normalizePlanId } from "@/lib/auth"
import { Loader2, LogOut, PanelLeft } from "lucide-react"
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
  "/client/email-log": "Email log - CertiStage",
  "/client/addons": "Add-ons - CertiStage",
  "/client/settings": "Settings - CertiStage",
  "/client/trash": "Recently deleted - CertiStage",
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
  const [userEmail, setUserEmail] = useState("")
  const [collapsed, setCollapsedState] = useState(false)
  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    try { localStorage.setItem("sidebarCollapsed", value ? "1" : "0") } catch {}
  }

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
      setUserEmail(session.userEmail || "")
      try { setCollapsedState(localStorage.getItem("sidebarCollapsed") === "1") } catch {}
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
        <header className="border-b border-neutral-200 bg-white sticky top-0 z-50">
          <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 md:px-10">
            {/* Logo */}
            <Link href="/client/events" className="flex items-center gap-2">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} />
              <span className="font-semibold text-[15px] text-neutral-900">CertiStage</span>
            </Link>

            {/* Account + plan + logout */}
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex items-center gap-3">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-900">
                  <span className={userPlan === "free" ? "h-1.5 w-1.5 rounded-full bg-neutral-400" : "h-1.5 w-1.5 rounded-full bg-gold"} />
                  {planFeatures[userPlan]?.displayName || "Free"}
                </span>
                <Link href="/client/settings" className="flex items-center gap-2 group">
                  <span className="h-8 w-8 rounded-full bg-neutral-900 text-white text-[12px] font-semibold flex items-center justify-center">
                    {userName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
                  </span>
                  <span className="text-[13.5px] font-medium text-neutral-900 group-hover:underline underline-offset-4">{userName}</span>
                </Link>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                title="Log out"
                className="h-9 w-9 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <LogOut className="h-4 w-4" />
              </button>
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
  const navTitles: Record<string, string> = {
    "/client/dashboard": "Dashboard", "/client/certificates": "Certificates", "/client/recipients": "Recipients", "/client/email-log": "Email log", "/client/addons": "Add-ons",
    "/client/reports": "Reports", "/client/settings": "Settings", "/client/support": "Support", "/client/upgrade": "Plans", "/client/trash": "Recently deleted"
  }
  const pageTitle = navTitles[pathname] || (pathname.startsWith("/client/certificates") ? "Certificates" : pathname.startsWith("/client/settings") ? "Settings" : "")
  const planFeatures = getPlanFeaturesMap()
  const initials = (userName || userEmail).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"

  return (
    <div className="flex h-screen flex-col lg:flex-row bg-[#FDFDFD] overflow-hidden">
      <MobileTopBar />
      <div className="hidden lg:flex h-full shrink-0">
        <ClientSidebar collapsed={collapsed} />
      </div>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="hidden lg:flex h-14 shrink-0 items-center justify-between px-5 bg-white border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setCollapsed(!collapsed)}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="h-9 w-9 -ml-2 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <PanelLeft className="h-[18px] w-[18px]" strokeWidth={1.75} />
            </button>
            <span className="text-[15px] font-semibold text-neutral-900">{pageTitle}</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-900">
              <span className={userPlan === "free" ? "h-1.5 w-1.5 rounded-full bg-neutral-400" : "h-1.5 w-1.5 rounded-full bg-gold"} />
              {planFeatures[userPlan]?.displayName || "Free"}
            </span>
            <Link href="/client/settings" className="flex items-center gap-2 group" title={userEmail}>
              <span className="h-8 w-8 rounded-full bg-neutral-900 text-white text-[12px] font-semibold flex items-center justify-center">{initials}</span>
              <span className="text-[13.5px] font-medium text-neutral-900 group-hover:underline underline-offset-4">{userName}</span>
            </Link>
          </div>
        </header>
        <main className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden bg-[#FDFDFD] scrollbar-minimal">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
    </div>
  )
}
