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
  ChevronLeft,
  Settings,
  FolderOpen
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientSession, clearClientSession, clearSessionEvent, PLAN_FEATURES, getTrialStatus, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
 

export function ClientSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const [mounted, setMounted] = useState(false)
  const [eventName, setEventName] = useState("")
  const [userPlan, setUserPlan] = useState<PlanType | null>(null)
  const [userName, setUserName] = useState("")
  const [trialDays, setTrialDays] = useState<number>(-1)
  const [trialTotalDays, setTrialTotalDays] = useState<number>(7)
  const [isOnTrial, setIsOnTrial] = useState(false)
  const [isUserLogin, setIsUserLogin] = useState(false)
  const [hasEventSelected, setHasEventSelected] = useState(false)
  const [collapsed, setCollapsed] = useState(false)

  useEffect(() => {
    setMounted(true)
    const session = getClientSession()
    if (session) {
      if (session.loginType === "event") {
        setEventName(session.eventName || "CertiStage")
        setIsUserLogin(false)
        setHasEventSelected(true)
      } else {
        setUserName(session.userName || "")
        const validPlans: PlanType[] = ["free", "professional", "enterprise", "premium"]
        const sessionPlan = session.userPlan || "free"
        setUserPlan(validPlans.includes(sessionPlan) ? sessionPlan : "free")
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



  const handleLogout = () => {
    clearClientSession()
    toast.success("Logged out successfully")
    router.push("/client/login")
  }

  const navItems = [
    { href: "/client/events", label: "Events", icon: FolderOpen, requiresEvent: false },
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresEvent: true },
    { href: "/client/certificates", label: "Certificates", icon: FileText, requiresEvent: true },
    { href: "/client/recipients", label: "Attendees", icon: Users, requiresEvent: true },
    { href: "/client/reports", label: "Reports", icon: BarChart3, requiresEvent: true },
    { href: "/client/settings", label: "Settings", icon: Settings, requiresEvent: false },
    { href: "/client/support", label: "Support", icon: HelpCircle, requiresEvent: false },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (isUserLogin && !hasEventSelected && item.requiresEvent) return false
    return true
  })

  return (
      <aside
        className={cn(
          "h-screen bg-white border-r border-neutral-200 flex flex-col transition-all duration-200 ease-in-out relative z-30",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >


        {/* Brand / Event Logo */}
        <div className={cn(
          "h-16 flex items-center border-b border-neutral-200 dark:border-neutral-800",
          collapsed ? "justify-center" : "px-4"
        )}>
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} />
            </div>
            {!collapsed && (
              <div className="flex flex-col min-w-0">
                <span className="font-bold text-[15px] text-neutral-900 dark:text-white truncate">
                  {eventName || "CertiStage"}
                </span>
                <span className="text-[11px] text-neutral-400 font-medium tracking-tight">
                  {hasEventSelected && isUserLogin ? "Event Workspace" : "Management Portal"}
                </span>
              </div>
            )}
          </div>
        </div>

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
                title={collapsed ? item.label : undefined}
                className={cn(
                  "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all group relative",
                  isActive
                    ? "bg-neutral-100 text-neutral-900 shadow-sm ring-1 ring-neutral-200/60"
                    : "text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50",
                  collapsed && "justify-center px-0 h-10 w-10 mx-auto"
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

        {/* Trial / Plan Details - Simplified */}
        {userPlan && !collapsed && (
          <div className="mx-2 mb-2 p-4 rounded-xl border border-neutral-100 dark:border-neutral-900 bg-neutral-50/50 dark:bg-neutral-900/50">
            <div className="flex items-center justify-between mb-3">
              <span className={cn(
                "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider",
                userPlan === "free" && "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400",
                userPlan === "professional" && "bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400",
                userPlan === "enterprise" && "bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400",
                userPlan === "premium" && "bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400"
              )}>
                {PLAN_FEATURES[userPlan]?.displayName || "Free"}
              </span>
              <span className="text-[11px] text-neutral-400 truncate max-w-[100px]">{userName}</span>
            </div>

            {isOnTrial && trialDays >= 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[11px] font-medium">
                  <span className="text-neutral-500 font-normal">Trial Ending</span>
                  <span className={cn(trialDays <= 2 ? "text-red-500" : "text-neutral-900 dark:text-white")}>
                    {trialDays} {trialDays === 1 ? 'day' : 'days'}
                  </span>
                </div>
                <Progress
                  value={Math.max(0, Math.min(100, ((trialTotalDays - trialDays) / trialTotalDays) * 100))}
                  className="h-1 bg-neutral-200 dark:bg-neutral-800"
                />
              </div>
            ) : userPlan === "free" && (
              <Button asChild size="sm" className="w-full h-8 text-xs font-semibold bg-neutral-900 dark:bg-white text-white dark:text-black hover:opacity-90 transition-opacity">
                <Link href="/client/upgrade">Upgrade Plan</Link>
              </Button>
            )}
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-2 border-t border-neutral-200 space-y-1">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-10 text-red-500 hover:bg-red-50",
              collapsed ? "justify-center p-0" : "justify-start gap-3 px-3"
            )}
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            {!collapsed && <span className="text-sm font-medium">Log out</span>}
          </Button>
        </div>

        {/* Toggle Collapse Button - Inset */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="absolute -right-3 top-20 bg-white border border-neutral-200 rounded-full p-1 shadow-sm text-neutral-400 hover:text-neutral-900 transition-colors z-50"
        >
          <ChevronLeft className={cn("h-3.5 w-3.5 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
      </aside>
  )
}
