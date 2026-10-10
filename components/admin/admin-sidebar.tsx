"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  CalendarDays,
  IndianRupee,
  ChartColumnIncreasing,
  Settings2,
  ChevronLeft,
  LogOut,
  Mail,
  Tag,
  LifeBuoy
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { useState, useEffect } from "react"
import { LogoutConfirmation } from "@/components/admin/logout-confirmation"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface SidebarCounts {
  pendingPayments: number
  newUsersToday: number
  activeEvents: number
  openTickets: number
}

const navigationItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { name: 'Users', href: '/admin/users', icon: Users, shortcut: 'G U' },
  { name: 'Events', href: '/admin/events', icon: CalendarDays, shortcut: 'G E' },
  { name: 'Revenue', href: '/admin/revenue', icon: IndianRupee, shortcut: 'G R', countKey: 'pendingPayments' as const },
  { name: 'Plans', href: '/admin/plans', icon: Tag, shortcut: 'G P' },
  { name: 'Email Logs', href: '/admin/email-logs', icon: Mail, shortcut: 'G M' },
  { name: 'Support', href: '/admin/support', icon: LifeBuoy, shortcut: 'G T', countKey: 'openTickets' as const },
  { name: 'Analytics', href: '/admin/analytics', icon: ChartColumnIncreasing, shortcut: 'G A' },
  { name: 'Settings', href: '/admin/settings', icon: Settings2, shortcut: 'G S' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [collapsedPreference, setCollapsedState] = useState(false)
  const [compactViewport, setCompactViewport] = useState(false)
  const collapsed = collapsedPreference || compactViewport
  const [counts, setCounts] = useState<SidebarCounts>({ pendingPayments: 0, newUsersToday: 0, activeEvents: 0, openTickets: 0 })

  const setCollapsed = (value: boolean) => {
    setCollapsedState(value)
    try { localStorage.setItem("adminSidebarCollapsed", value ? "1" : "0") } catch {}
  }

  useEffect(() => {
    const mediaQuery = window.matchMedia("(max-width: 767px)")
    const updateViewport = () => setCompactViewport(mediaQuery.matches)
    updateViewport()
    mediaQuery.addEventListener("change", updateViewport)
    return () => mediaQuery.removeEventListener("change", updateViewport)
  }, [])

  useEffect(() => {
    try { setCollapsedState(localStorage.getItem("adminSidebarCollapsed") === "1") } catch {}
    fetchCounts()
    // Refresh counts every 30 seconds
    const interval = setInterval(fetchCounts, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchCounts = async () => {
    try {
      const res = await fetch("/api/admin/sidebar-counts")
      if (res.ok) {
        const data = await res.json()
        setCounts(data)
      }
    } catch (error) {
      console.error("Failed to fetch sidebar counts:", error)
    }
  }

  const isActive = (href: string) => {
    if (href === '/admin/dashboard') {
      return pathname === '/admin' || pathname === '/admin/dashboard'
    }
    return pathname.startsWith(href)
  }

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "h-screen shrink-0 bg-white border-r border-neutral-200 flex flex-col transition-all duration-200 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {/* Brand */}
        <div className={cn("h-16 flex items-center border-b border-neutral-200 shrink-0", collapsed ? "justify-center" : "px-4 gap-2.5")}>
          <Link href="/admin/dashboard" className="flex items-center gap-2.5 min-w-0 flex-1">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} className="shrink-0" />
            {!collapsed && (
              <span className="flex flex-col min-w-0">
                <span className="font-semibold text-[15px] text-neutral-900 truncate leading-tight">CertiStage</span>
                <span className="text-[11.5px] text-neutral-500 leading-tight">Admin Panel</span>
              </span>
            )}
          </Link>
          {!collapsed && (
            <button
              type="button"
              onClick={() => setCollapsed(true)}
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
              className="h-8 w-8 -mr-1 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-100 transition-colors"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className={cn("flex-1 overflow-y-auto scrollbar-minimal px-3 py-4", collapsed ? "space-y-1.5" : "space-y-1")}>
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const count = item.countKey ? counts[item.countKey] : 0

            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "relative flex items-center gap-3 rounded-md text-[13.5px] transition-colors",
                      collapsed ? "justify-center h-10 w-10 mx-auto" : "h-10 px-3",
                      active
                        ? "bg-neutral-100 text-neutral-900 font-medium"
                        : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50"
                    )}
                  >
                    {active && (
                      <span className="absolute -left-3 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-gold" />
                    )}
                    <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-neutral-900" : "text-neutral-500")} strokeWidth={active ? 2 : 1.75} />
                    {!collapsed && (
                      <>
                        <span className="flex-1 truncate">{item.name}</span>
                        {count > 0 && (
                          <span className="h-5 min-w-[20px] px-1.5 rounded-full bg-red-500 text-white text-[11px] font-medium flex items-center justify-center">
                            {count > 99 ? "99+" : count}
                          </span>
                        )}
                      </>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={12}>
                    {item.name}{count > 0 ? ` (${count})` : ""}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Footer Actions */}
        <div className={cn("p-3 border-t border-neutral-200 space-y-1", collapsed && "flex flex-col items-center")}>
          {collapsed && !compactViewport && (
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  type="button"
                  onClick={() => setCollapsed(false)}
                  aria-label="Expand sidebar"
                  className="h-10 w-10 rounded-md flex items-center justify-center text-neutral-500 hover:text-neutral-900 hover:bg-neutral-50 transition-colors"
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>Expand</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                aria-label="Logout" onClick={() => setLogoutOpen(true)}
                className={cn(
                  "flex items-center rounded-md text-[13.5px] text-neutral-600 hover:text-neutral-900 hover:bg-neutral-50 transition-colors",
                  collapsed ? "h-10 w-10 justify-center" : "h-10 w-full gap-3 px-3"
                )}
              >
                <LogOut className="h-[18px] w-[18px] shrink-0" strokeWidth={1.75} />
                {!collapsed && <span>Logout</span>}
              </button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={12}>Logout</TooltipContent>}
          </Tooltip>
        </div>
      </aside>
      <LogoutConfirmation open={logoutOpen} onOpenChange={setLogoutOpen} />
    </TooltipProvider>
  )
}
