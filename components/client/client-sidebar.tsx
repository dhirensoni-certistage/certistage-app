"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  BarChart3,
  LogOut,
  FileText,
  Users,
  HelpCircle,
  Crown,
  PanelLeftClose,
  PanelLeftOpen,
  Settings,
  FolderOpen
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientSession, clearClientSession, clearSessionEvent, getPlanFeaturesMap, getTrialStatus, normalizePlanId, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"
 

export function ClientSidebar({ mobile = false, onNavigate }: { mobile?: boolean; onNavigate?: () => void } = {}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [eventName, setEventName] = useState("")
  const [userPlan, setUserPlan] = useState<PlanType | null>(null)
  const [userName, setUserName] = useState("")
  const [userEmail, setUserEmail] = useState("")
  const [trialDays, setTrialDays] = useState<number>(-1)
  const [trialTotalDays, setTrialTotalDays] = useState<number>(7)
  const [isOnTrial, setIsOnTrial] = useState(false)
  const [isUserLogin, setIsUserLogin] = useState(false)
  const [hasEventSelected, setHasEventSelected] = useState(false)
  const [collapsed, setCollapsedState] = useState(false)
  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    try { localStorage.setItem("sidebarCollapsed", value ? "1" : "0") } catch {}
  }

  const normalizePlan = (plan?: string): PlanType => normalizePlanId(plan)

  useEffect(() => {
    setMounted(true)
    try { if (!mobile && localStorage.getItem("sidebarCollapsed") === "1") setCollapsedState(true) } catch {}
    const session = getClientSession()
    if (session) {
      if (session.loginType === "event") {
        setEventName(session.eventName || "CertiStage")
        setIsUserLogin(false)
        setHasEventSelected(true)
      } else {
        setUserName(session.userName || "")
        setUserEmail(session.userEmail || "")
        setUserPlan(normalizePlan(session.userPlan))
        setIsUserLogin(true)

        if (session.eventId) {
          setEventName(session.eventName || "Event")
          setHasEventSelected(true)
        } else {
          setEventName(session.userName || "CertiStage")
          setHasEventSelected(false)
        }

        const trialStatus = getTrialStatus(session.userId)
        if (trialStatus.isOnTrial) {
          setTrialDays(trialStatus.daysRemaining)
          setTrialTotalDays(trialStatus.totalDays)
          setIsOnTrial(true)
        }
      }
    }
  }, [pathname])

  useEffect(() => {
    const syncPlanFromServer = async () => {
      const session = getClientSession()
      if (!session?.userId || session.loginType !== "user") return
      const result = await fetchClientProfile()
      if (!result.ok || !result.user) return
      const updated = applyProfileToSession(result.user)
      if (updated) setUserPlan(normalizePlan(updated.userPlan))
    }
    syncPlanFromServer()
  }, [])

  const handleLogout = () => {
    clearClientSession()
    toast.success("Logged out successfully")
    router.push("/client/login")
  }

  const navItems = [
    { href: "/client/events", label: "Events", icon: FolderOpen, requiresEvent: false },
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresEvent: true },
    { href: "/client/certificates", label: "Certificates", icon: FileText, requiresEvent: true },
    { href: "/client/recipients", label: "Recipients", icon: Users, requiresEvent: true },
    { href: "/client/reports", label: "Reports", icon: BarChart3, requiresEvent: true },
    { href: "/client/settings", label: "Settings", icon: Settings, requiresEvent: false },
    { href: "/client/support", label: "Support", icon: HelpCircle, requiresEvent: false },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (isUserLogin && !hasEventSelected && item.requiresEvent) return false
    return true
  })

  const planFeaturesMap = getPlanFeaturesMap()

  return (
      <aside
        className={cn(
          "bg-white flex flex-col transition-all duration-200 ease-in-out relative z-30",
          mobile ? "h-full w-full" : cn("h-screen border-r border-neutral-200", collapsed ? "w-[72px]" : "w-[260px]")
        )}
      >


        {/* Brand / current event + panel toggle */}
        {collapsed ? (
          <div className="flex flex-col items-center gap-2 pt-3 pb-2 border-b border-neutral-200">
            <Link href="/client/events" title="Events" className="h-10 w-10 flex items-center justify-center">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} />
            </Link>
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Expand sidebar"
              aria-label="Expand sidebar"
              className="h-8 w-8 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <PanelLeftOpen className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <div className="h-16 flex items-center gap-2 border-b border-neutral-200 pl-4 pr-2">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} className="shrink-0" />
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-[14px] text-neutral-900 truncate leading-tight">{eventName || "CertiStage"}</span>
              {hasEventSelected && isUserLogin ? (
                <Link href="/client/events" onClick={onNavigate} className="text-[11px] text-neutral-500 hover:text-neutral-900 leading-tight">Switch event</Link>
              ) : (
                <span className="text-[11px] text-neutral-500 leading-tight">CertiStage</span>
              )}
            </div>
            {!mobile && (
              <button
                type="button"
                onClick={() => setCollapsed(true)}
                title="Collapse sidebar"
                aria-label="Collapse sidebar"
                className="h-8 w-8 shrink-0 rounded-md flex items-center justify-center text-neutral-400 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
              >
                <PanelLeftClose className="h-4 w-4" />
              </button>
            )}
          </div>
        )}

        {/* Dynamic Nav Indicator handled by active classes below */}

        {/* Navigation */}
        <nav className="flex-1 p-2 space-y-1 overflow-y-auto mt-2 scrollbar-minimal">
          {filteredNavItems.map((item) => {
            const isActive = item.href === "/client/certificates"
              ? pathname.startsWith("/client/certificates")
              : pathname === item.href

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onNavigate}
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                  isActive
                    ? "bg-neutral-100 text-neutral-900 shadow-sm ring-1 ring-neutral-200/60"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
                  collapsed && "justify-center px-0 h-10 w-10 mx-auto rounded-lg"
                )}
              >
                {isActive && !collapsed && (
                  <span className="absolute left-1.5 top-1/2 -translate-y-1/2 h-5 w-[3px] rounded-full bg-neutral-900" />
                )}
                <item.icon className={cn("h-5 w-5 shrink-0", isActive ? "text-neutral-900" : "text-neutral-400 group-hover:text-neutral-900")} />
                {!collapsed && <span className="truncate">{item.label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* Account + plan */}
        {userPlan && !collapsed && (
          <div className="mx-2 mb-2 p-3.5 rounded-xl border border-neutral-200 bg-white">
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-neutral-900">
                <span className={cn("h-1.5 w-1.5 rounded-full", userPlan === "free" ? "bg-neutral-400" : "bg-gold")} />
                {planFeaturesMap[userPlan]?.displayName || "Free"} plan
              </span>
              {userPlan !== "free" && (
                <Link href="/client/settings" onClick={onNavigate} className="text-[11px] text-neutral-500 hover:text-neutral-900">Manage</Link>
              )}
            </div>
            <p className="text-[12px] text-neutral-500 truncate" title={userEmail}>{userEmail || userName}</p>

            {isOnTrial && trialDays >= 0 ? (
              <div className="space-y-1.5 mt-3">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-neutral-500">Trial ends in</span>
                  <span className={cn("font-medium", trialDays <= 2 ? "text-red-600" : "text-neutral-900")}>{trialDays} {trialDays === 1 ? "day" : "days"}</span>
                </div>
                <Progress value={Math.max(0, Math.min(100, ((trialTotalDays - trialDays) / trialTotalDays) * 100))} className="h-1 bg-neutral-100" />
              </div>
            ) : userPlan === "free" && (
              <Button asChild size="sm" className="w-full h-8 mt-3 text-xs font-medium bg-neutral-900 text-white hover:bg-black">
                <Link href="/client/upgrade" onClick={onNavigate}>See plans</Link>
              </Button>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-2 border-t border-neutral-200 space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50",
              collapsed ? "justify-center p-0" : "justify-start gap-3 px-3"
            )}
            onClick={handleLogout}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm font-medium">Log out</span>}
          </Button>
        </div>

      </aside>
  )
}
