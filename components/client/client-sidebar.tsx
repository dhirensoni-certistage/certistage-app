"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  ChartColumnIncreasing,
  MailCheck,
  PackagePlus,
  LogOut,
  ChevronRight,
  Award,
  Users,
  LifeBuoy,
  Crown,
  Settings2,
  CalendarDays, ArchiveRestore } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientSession, clearClientSession, clearSessionEvent, getPlanFeaturesMap, getTrialStatus, normalizePlanId, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { fetchClientProfile, applyProfileToSession } from "@/lib/client-profile"
 

export function ClientSidebar({ mobile = false, onNavigate, collapsed: collapsedProp }: { mobile?: boolean; onNavigate?: () => void; collapsed?: boolean } = {}) {
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
  const collapsed = !mobile && !!collapsedProp

  const normalizePlan = (plan?: string): PlanType => normalizePlanId(plan)

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
    { href: "/client/events", label: "Events", icon: CalendarDays, requiresEvent: false, group: "" },
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresEvent: true, group: "Event" },
    { href: "/client/certificates", label: "Certificates", icon: Award, requiresEvent: true, group: "Event" },
    { href: "/client/recipients", label: "Recipients", icon: Users, requiresEvent: true, group: "Event" },
    { href: "/client/email-log", label: "Email log", icon: MailCheck, requiresEvent: true, group: "Event" },
    { href: "/client/reports", label: "Reports", icon: ChartColumnIncreasing, requiresEvent: true, group: "Event" },
    { href: "/client/addons", label: "Add-ons", icon: PackagePlus, requiresEvent: false, group: "Account" },
    { href: "/client/settings", label: "Settings", icon: Settings2, requiresEvent: false, group: "Account" },
    { href: "/client/trash", label: "Recently deleted", icon: ArchiveRestore, requiresEvent: false, group: "Account" },
    { href: "/client/support", label: "Support", icon: LifeBuoy, requiresEvent: false, group: "Account" },
  ]

  const filteredNavItems = navItems.filter(item => {
    if (isUserLogin && !hasEventSelected && item.requiresEvent) return false
    return true
  })
  const groups = Array.from(new Set(filteredNavItems.map((i) => i.group)))

  const planFeaturesMap = getPlanFeaturesMap()

  return (
      <aside
        className={cn(
          "bg-white flex flex-col transition-all duration-200 ease-in-out relative z-30",
          mobile ? "h-full w-full" : cn("h-screen border-r border-neutral-200", collapsed ? "w-[72px]" : "w-[260px]")
        )}
      >


        {/* Brand / current event */}
        <div className={cn("h-14 flex items-center border-b border-neutral-200 shrink-0", collapsed ? "justify-center" : "px-4 gap-2.5")}>
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={28} height={28} className="shrink-0" />
          {!collapsed && (
            <div className="flex flex-col min-w-0 flex-1">
              <span className="font-semibold text-[14px] text-neutral-900 truncate leading-tight">{eventName || "CertiStage"}</span>
              {hasEventSelected && isUserLogin ? (
                <Link href="/client/events" onClick={onNavigate} className="text-[11px] text-neutral-500 hover:text-neutral-900 leading-tight">Switch event</Link>
              ) : (
                <span className="text-[11px] text-neutral-500 leading-tight">CertiStage</span>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Nav Indicator handled by active classes below */}

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto scrollbar-minimal px-3 py-3", collapsed ? "space-y-1.5" : "space-y-5")}>
          {groups.map((group) => (
            <div key={group || "top"} className={collapsed ? "space-y-1.5" : "space-y-0.5"}>
              {group && !collapsed && (
                <p className="px-2.5 pb-1.5 text-[11px] font-medium uppercase tracking-[0.08em] text-neutral-400">{group}</p>
              )}
              {group && collapsed && <div className="mx-2 my-1 border-t border-neutral-200" />}
              {filteredNavItems.filter((i) => i.group === group).map((item) => {
                const isActive = item.href === "/client/certificates"
                  ? pathname.startsWith("/client/certificates")
                  : pathname === item.href
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={onNavigate}
                    title={collapsed ? item.label : undefined}
                    aria-current={isActive ? "page" : undefined}
                    className={cn(
                      "flex items-center gap-2.5 rounded-md text-[13.5px] transition-colors",
                      collapsed ? "justify-center h-10 w-10 mx-auto" : "h-9 px-2.5",
                      isActive
                        ? "bg-neutral-100 text-neutral-900 font-medium"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                    )}
                  >
                    <item.icon className={cn("h-[18px] w-[18px] shrink-0", isActive ? "text-neutral-900" : "text-neutral-500")} strokeWidth={isActive ? 2 : 1.75} />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                )
              })}
            </div>
          ))}
        </nav>

        {/* Account card */}
        {userPlan && !collapsed && (
          <Link href="/client/settings" onClick={onNavigate} className="mx-3 mb-2 rounded-xl border border-neutral-200 bg-white p-3 flex items-center gap-3 hover:border-neutral-400 transition-colors">
            <span className="h-9 w-9 rounded-full bg-neutral-900 text-white text-[12px] font-semibold flex items-center justify-center shrink-0">
              {(userName || userEmail).split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) || "U"}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[13px] font-medium text-neutral-900 truncate">{userName || userEmail}</span>
              <span className="block text-[11.5px] text-neutral-500 truncate">
                <span className={cn("inline-block h-1.5 w-1.5 rounded-full mr-1.5 align-middle", userPlan === "free" ? "bg-neutral-400" : "bg-gold")} />
                {planFeaturesMap[userPlan]?.displayName || "Free"} plan{isOnTrial && trialDays >= 0 ? ` · trial, ${trialDays}d left` : ""}
              </span>
            </span>
            <ChevronRight className="h-4 w-4 text-neutral-400 shrink-0" />
          </Link>
        )}
        {userPlan && !collapsed && userPlan === "free" && (
          <div className="mx-3 mb-2">
            <Button asChild size="sm" className="w-full h-8 text-xs font-medium bg-neutral-900 text-white hover:bg-black">
              <Link href="/client/upgrade" onClick={onNavigate}>See plans</Link>
            </Button>
          </div>
        )}

        {/* Footer Actions */}
        <div className="p-3 border-t border-neutral-200">
          <Button
            variant="ghost"
            className={cn(
              "w-full h-9 text-[13.5px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50",
              collapsed ? "justify-center p-0 w-10 mx-auto" : "justify-start gap-2.5 px-2.5"
            )}
            onClick={handleLogout}
            title={collapsed ? "Log out" : undefined}
          >
            <LogOut className="h-[18px] w-[18px]" strokeWidth={1.75} />
            {!collapsed && <span>Log out</span>}
          </Button>
        </div>

      </aside>
  )
}
