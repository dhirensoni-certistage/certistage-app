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

  useEffect(() => {
    const session = getClientSession()
    
    // Skip auth check for login page
    if (pathname === "/client/login") {
      setIsLoading(false)
      setIsAuthenticated(false)
      return
    }

    if (!session) {
      router.push("/client/login")
    } else {
      setIsAuthenticated(true)
      setUserName(session.userName || "")
      setUserPlan(session.userPlan || "free")
      // Check if user has selected an event
      const eventSelected = !!(session.eventId && session.loginType === "user")
      setHasEventSelected(eventSelected)
      
      // If user login and no event selected, redirect to events page (except if already there)
      if (session.loginType === "user" && !session.eventId && !pathname.startsWith("/client/events") && pathname !== "/client/upgrade") {
        router.push("/client/events")
      }
    }
    setIsLoading(false)
  }, [pathname, router])

  const handleLogout = () => {
    clearClientSession()
    toast.success("Logged out successfully")
    router.push("/client/login")
  }

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    )
  }

  // Login page - no sidebar
  if (pathname === "/client/login") {
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
      <div className="min-h-screen bg-background">
        {/* Top Header */}
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-50">
          <div className="container flex h-16 items-center justify-between px-4 md:px-8">
            {/* Logo */}
            <Link href="/client/events" className="flex items-center gap-2">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} />
              <span className="font-semibold text-lg">CertiStage</span>
            </Link>

            {/* Right side - User info & Logout */}
            <div className="flex items-center gap-4">
              {/* Plan Badge */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="text-sm text-muted-foreground">{userName}</span>
                <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary">
                  {PLAN_FEATURES[userPlan as keyof typeof PLAN_FEATURES]?.displayName || "Free"}
                </span>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleLogout}
                className="gap-2 text-muted-foreground hover:text-foreground"
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
    <div className="flex h-screen bg-background overflow-hidden">
      <ClientSidebar />
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
