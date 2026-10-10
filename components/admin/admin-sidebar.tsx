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
import { useAdminNavigation } from "@/components/admin/admin-navigation"
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "@/components/ui/sheet"
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
  const { mobileOpen, setMobileOpen } = useAdminNavigation()
  const collapsed = collapsedPreference && !compactViewport
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

  const sidebarContent = <>
    <div className={cn("flex h-16 shrink-0 items-center gap-2.5 border-b border-neutral-200", collapsed ? "justify-center px-0" : compactViewport ? "px-4 pr-10" : "px-4")}>
      <Link href="/admin/dashboard" onClick={() => setMobileOpen(false)} className={cn("flex min-w-0 items-center gap-2.5", !collapsed && "flex-1")}>
        <Image src="/Certistage_icon.svg" alt="CertiStage" width={32} height={32} className="shrink-0" />
        {!collapsed && <span className="flex min-w-0 flex-col"><span className="truncate text-[15px] font-semibold text-neutral-900">CertiStage</span><span className="text-xs text-neutral-500">Admin Panel</span></span>}
      </Link>
      {!compactViewport && !collapsed && <button type="button" aria-label="Collapse sidebar" onClick={() => setCollapsed(true)} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100"><ChevronLeft className="h-4 w-4" /></button>}
    </div>
    <nav aria-label="Admin pages" className="min-h-0 flex-1 space-y-1 overflow-y-auto px-3 py-4 scrollbar-minimal">
      {navigationItems.map(item => {
        const active = isActive(item.href)
        const Icon = item.icon
        const count = item.countKey ? counts[item.countKey] : 0
        return <Tooltip key={item.href}><TooltipTrigger asChild><Link href={item.href} aria-label={item.name} aria-current={active ? "page" : undefined} onClick={() => setMobileOpen(false)} className={cn("relative flex h-11 items-center gap-3 rounded-md text-[13.5px] transition-colors", collapsed ? "mx-auto w-10 justify-center" : "px-3", active ? "bg-gold-soft font-medium text-gold-deep" : "text-neutral-600 hover:bg-neutral-50 hover:text-neutral-900")}>
          {active && <span className="absolute -left-3 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-gold" />}
          <Icon className="h-[18px] w-[18px] shrink-0" strokeWidth={active ? 2 : 1.75} />
          {!collapsed && <span className="flex-1 truncate">{item.name}</span>}
          {count > 0 && <span className={cn("flex min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] text-white",collapsed ? "absolute -right-1 top-0 h-4" : "h-5")}>{count > 99 ? "99+" : count}</span>}
        </Link></TooltipTrigger>{collapsed && <TooltipContent side="right" sideOffset={12}>{item.name}</TooltipContent>}</Tooltip>
      })}
    </nav>
    <div className="shrink-0 space-y-1 border-t border-neutral-200 p-3">
      {collapsed && !compactViewport && <button type="button" aria-label="Expand sidebar" onClick={() => setCollapsed(false)} className="flex h-10 w-full items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-50"><ChevronLeft className="h-4 w-4 rotate-180" /></button>}
      <button type="button" aria-label="Logout" onClick={() => { setMobileOpen(false); setLogoutOpen(true) }} className={cn("flex h-11 w-full items-center gap-3 rounded-md text-[13.5px] text-neutral-600 hover:bg-neutral-50", collapsed ? "justify-center" : "px-3")}><LogOut className="h-[18px] w-[18px] shrink-0" />{!collapsed && <span>Logout</span>}</button>
    </div>
  </>

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          "hidden h-dvh shrink-0 bg-white border-r border-neutral-200 md:flex flex-col transition-all duration-200 ease-in-out",
          collapsed ? "w-[72px]" : "w-[260px]"
        )}
      >
        {sidebarContent}
      </aside>
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}><SheetContent side="left" className="w-[280px] max-w-[85vw] gap-0 p-0"><SheetTitle className="sr-only">Admin navigation</SheetTitle><SheetDescription className="sr-only">Navigate between CertiStage admin pages.</SheetDescription>{sidebarContent}</SheetContent></Sheet>
      <LogoutConfirmation open={logoutOpen} onOpenChange={setLogoutOpen} />
    </TooltipProvider>
  )
}
