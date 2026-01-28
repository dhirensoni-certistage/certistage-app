"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import {
  LayoutDashboard,
  BarChart3,
  Moon,
  Sun,
  LogOut,
  FileText,
  Users,
  HelpCircle,
  Crown,
  ChevronLeft,
  Settings
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getClientSession, clearClientSession, clearSessionEvent, PLAN_FEATURES, getTrialStatus, type PlanType } from "@/lib/auth"
import { toast } from "sonner"
import { Progress } from "@/components/ui/progress"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

export function ClientSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
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
    const loadSession = () => {
      const session = getClientSession()
      if (session) {
        if (session.loginType === "event") {
          setEventName(session.eventName || "CertiStage")
          setIsUserLogin(false)
          setHasEventSelected(true)
        } else {
          setUserName(session.userName || "")
          // Ensure plan is valid, default to "free" if invalid
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
    }

    loadSession()
  }, [pathname]) // Re-load session when pathname changes

  const handleBackToList = () => {
    clearSessionEvent()
    setHasEventSelected(false)
    setEventName("CertiStage")
    router.push("/client/events")
  }

  const handleLogout = () => {
    clearClientSession()
    toast.success("Logged out successfully")
    router.push("/client/login")
  }

  const navItems = [
    { href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard, requiresEvent: true },
    { href: "/client/certificates", label: "Manage Certificates", icon: FileText, requiresEvent: true },
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
    <TooltipProvider delayDuration={0}>
      <div className="relative">
        <motion.aside
          initial={false}
          animate={{ width: collapsed ? 72 : 260 }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
          className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col overflow-hidden"
        >
          {/* Back to List - Only for user login when event is selected */}
          {isUserLogin && hasEventSelected && (
            <div className="border-b border-sidebar-border">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    onClick={handleBackToList}
                    className={cn(
                      "w-full h-auto rounded-none text-sm text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                      collapsed ? "justify-center py-3" : "justify-start gap-2 px-4 py-3"
                    )}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    {!collapsed && "Back to List"}
                  </Button>
                </TooltipTrigger>
                {collapsed && <TooltipContent side="right" sideOffset={12}>Back to List</TooltipContent>}
              </Tooltip>
            </div>
          )}

          {/* Logo & Event Name */}
          <div className={cn(
            "h-16 border-b border-sidebar-border flex items-center",
            collapsed ? "justify-center px-2" : "px-4"
          )}>
            <Link href="/client/dashboard" className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0">
                <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
              </div>
              {!collapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="min-w-0"
                >
                  <span className="font-semibold text-sidebar-foreground block truncate">
                    {eventName || "CertiStage"}
                  </span>
                  <span className="text-xs text-sidebar-muted">
                    {hasEventSelected && isUserLogin ? "Event" : "Client Portal"}
                  </span>
                </motion.div>
              )}
            </Link>
          </div>

          {/* Floating Collapse/Expand Button */}
          <Tooltip>
            <TooltipTrigger asChild>
              <motion.button
                initial={false}
                animate={{
                  right: collapsed ? -12 : -12,
                  rotate: collapsed ? 180 : 0
                }}
                transition={{ duration: 0.2 }}
                onClick={() => setCollapsed(!collapsed)}
                className="absolute top-20 -right-3 z-50 h-6 w-6 rounded-full bg-sidebar border border-sidebar-border shadow-md flex items-center justify-center text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </motion.button>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8}>
              {collapsed ? "Expand" : "Collapse"}
            </TooltipContent>
          </Tooltip>

          {/* Plan Badge & Trial - Only when expanded */}
          {userPlan && !collapsed && (
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex items-center gap-2">
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-medium",
                  (userPlan === "free" || !PLAN_FEATURES[userPlan]) && "bg-gray-500/10 text-gray-600 dark:text-gray-400",
                  userPlan === "professional" && "bg-blue-500/10 text-blue-600 dark:text-blue-400",
                  userPlan === "enterprise" && "bg-amber-500/10 text-amber-600 dark:text-amber-400",
                  userPlan === "premium" && "bg-purple-500/10 text-purple-600 dark:text-purple-400"
                )}>
                  {PLAN_FEATURES[userPlan]?.displayName || "Free"}
                </div>
                {userName && <span className="text-xs text-sidebar-muted truncate">{userName}</span>}
              </div>

              {isOnTrial && trialDays >= 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex items-center justify-between text-xs font-medium text-sidebar-muted">
                    <span>Trial</span>
                    <span className={cn(
                      "font-semibold",
                      trialDays <= 2 ? "text-red-600 dark:text-red-400" : "text-amber-600 dark:text-amber-400"
                    )}>
                      {trialDays} day{trialDays !== 1 ? "s" : ""} left
                    </span>
                  </div>
                  <Progress
                    value={Math.max(0, Math.min(100, ((trialTotalDays - trialDays) / trialTotalDays) * 100))}
                    className="h-2 bg-sidebar-border"
                  />
                </div>
              )}
            </div>
          )}

          {/* Upgrade CTA for free users */}
          {userPlan === "free" && (
            <div className={cn("border-b border-sidebar-border", collapsed ? "p-2" : "px-3 py-3")}>
              {collapsed ? (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      asChild
                      size="icon"
                      className="w-full h-10 bg-gradient-to-r from-purple-500 via-blue-500 to-sky-400 text-white"
                    >
                      <Link href="/client/upgrade">
                        <Crown className="h-4 w-4" />
                      </Link>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={12}>Upgrade now</TooltipContent>
                </Tooltip>
              ) : (
                <>
                  <Button
                    asChild
                    className="w-full justify-center gap-2 bg-gradient-to-r from-purple-500 via-blue-500 to-sky-400 text-white shadow-md hover:shadow-lg"
                  >
                    <Link href="/client/upgrade">
                      <Crown className="h-4 w-4" />
                      Upgrade now
                    </Link>
                  </Button>
                  <p className="mt-1.5 text-[11px] text-sidebar-muted text-center">
                    Unlock unlimited certificates and exports.
                  </p>
                </>
              )}
            </div>
          )}

          {/* Main Navigation */}
          <nav className="flex-1 p-3 overflow-hidden">
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const isActive = item.href === "/client/certificates"
                  ? pathname.startsWith("/client/certificates")
                  : pathname === item.href

                return (
                  <Tooltip key={item.href}>
                    <TooltipTrigger asChild>
                      <Link
                        href={item.href}
                        className={cn(
                          "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                          isActive
                            ? "bg-sidebar-accent text-sidebar-foreground"
                            : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                          collapsed && "justify-center px-0"
                        )}
                      >
                        {isActive && (
                          <motion.div
                            layoutId="client-sidebar-indicator"
                            className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full"
                          />
                        )}
                        <item.icon className="h-5 w-5 shrink-0" />
                        {!collapsed && <span className="truncate">{item.label}</span>}
                      </Link>
                    </TooltipTrigger>
                    {collapsed && (
                      <TooltipContent side="right" sideOffset={12}>
                        {item.label}
                      </TooltipContent>
                    )}
                  </Tooltip>
                )
              })}
            </div>
          </nav>

          {/* Bottom Actions */}
          <div className={cn("p-3 border-t border-sidebar-border space-y-1", collapsed && "flex flex-col items-center")}>
            {/* Theme Toggle */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  className={cn(
                    "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                    collapsed ? "h-10 w-10" : "w-full justify-start gap-3"
                  )}
                  onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                >
                  {mounted && theme === "dark" ? (
                    <Sun className="h-5 w-5 shrink-0" />
                  ) : (
                    <Moon className="h-5 w-5 shrink-0" />
                  )}
                  {!collapsed && <span>Toggle Theme</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" sideOffset={12}>Toggle Theme</TooltipContent>}
            </Tooltip>

            {/* Logout */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size={collapsed ? "icon" : "default"}
                  className={cn(
                    "text-destructive hover:text-destructive hover:bg-destructive/10",
                    collapsed ? "h-10 w-10" : "w-full justify-start gap-3"
                  )}
                  onClick={handleLogout}
                >
                  <LogOut className="h-5 w-5 shrink-0" />
                  {!collapsed && <span>Logout</span>}
                </Button>
              </TooltipTrigger>
              {collapsed && <TooltipContent side="right" sideOffset={12}>Logout</TooltipContent>}
            </Tooltip>
          </div>
        </motion.aside>
      </div>
    </TooltipProvider>
  )
}
