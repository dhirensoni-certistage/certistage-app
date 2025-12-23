"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { 
  LayoutDashboard, 
  Users, 
  Calendar, 
  IndianRupee, 
  BarChart3, 
  Settings,
  Moon, 
  Sun, 
  ChevronLeft,
  LogOut,
  Command,
  Mail
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Badge } from "@/components/ui/badge"

interface SidebarCounts {
  pendingPayments: number
  newUsersToday: number
  activeEvents: number
}

const navigationItems = [
  { name: 'Dashboard', href: '/admin/dashboard', icon: LayoutDashboard, shortcut: 'G D' },
  { name: 'Users', href: '/admin/users', icon: Users, shortcut: 'G U' },
  { name: 'Events', href: '/admin/events', icon: Calendar, shortcut: 'G E' },
  { name: 'Revenue', href: '/admin/revenue', icon: IndianRupee, shortcut: 'G R', countKey: 'pendingPayments' as const },
  { name: 'Email Logs', href: '/admin/email-logs', icon: Mail, shortcut: 'G M' },
  { name: 'Analytics', href: '/admin/analytics', icon: BarChart3, shortcut: 'G A' },
  { name: 'Settings', href: '/admin/settings', icon: Settings, shortcut: 'G S' },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [counts, setCounts] = useState<SidebarCounts>({ pendingPayments: 0, newUsersToday: 0, activeEvents: 0 })

  useEffect(() => {
    setMounted(true)
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

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/admin/logout", { method: "POST" })
      if (res.ok) {
        toast.success("Logged out successfully")
        router.push("/admin/login")
      } else {
        toast.error("Logout failed")
      }
    } catch (error) {
      toast.error("Logout failed")
    }
  }

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
      >
        {/* Logo */}
        <div className={cn("h-16 border-b border-sidebar-border flex items-center px-4", collapsed ? "justify-center" : "justify-between")}>
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            </div>
            {!collapsed && (
              <div>
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="font-semibold text-sidebar-foreground block">
                  CertiStage
                </motion.span>
                <span className="text-xs text-sidebar-muted">Admin Panel</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button variant="ghost" size="icon" className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setCollapsed(true)}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Search Trigger */}
        <div className={cn("p-3", collapsed && "px-2")}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full bg-sidebar-accent/50 border-sidebar-border text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed ? "px-0 justify-center" : "justify-start"
                )}
                onClick={openCommandPalette}
              >
                <Command className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <>
                    <span className="ml-2 flex-1 text-left text-sm">Search...</span>
                    <kbd className="pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium">
                      ⌘K
                    </kbd>
                  </>
                )}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={12}>Search (⌘K)</TooltipContent>}
          </Tooltip>
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            const count = item.countKey ? counts[item.countKey] : 0
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative group",
                      active ? "bg-sidebar-accent text-sidebar-foreground" : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {active && (
                      <motion.div layoutId="sidebar-indicator" className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full" />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && (
                      <>
                        <span className="flex-1">{item.name}</span>
                        {count > 0 && (
                          <Badge variant="destructive" className="h-5 min-w-[20px] px-1.5 text-xs">
                            {count > 99 ? "99+" : count}
                          </Badge>
                        )}
                      </>
                    )}
                    {collapsed && count > 0 && (
                      <span className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center">
                        {count > 9 ? "9+" : count}
                      </span>
                    )}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={12}>
                    <div className="flex items-center gap-2">
                      {item.name}
                      {count > 0 && <Badge variant="destructive" className="h-4 text-[10px]">{count}</Badge>}
                    </div>
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Keyboard Shortcuts Hint */}
        {!collapsed && (
          <div className="px-3 py-2 mx-3 mb-2 rounded-lg bg-sidebar-accent/30 border border-sidebar-border">
            <p className="text-[10px] text-sidebar-muted text-center">
              Press <kbd className="px-1 py-0.5 bg-sidebar-accent rounded text-[9px]">?</kbd> for keyboard shortcuts
            </p>
          </div>
        )}

        {/* Bottom Actions */}
        <div className={cn("p-3 border-t border-sidebar-border space-y-1", collapsed && "flex flex-col items-center")}>
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent" onClick={() => setCollapsed(false)}>
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>Expand</TooltipContent>
            </Tooltip>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                className={cn("text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent", collapsed ? "h-10 w-10" : "w-full justify-start gap-3")}
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              >
                {mounted && theme === "dark" ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
                {!collapsed && <span>Toggle Theme</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && <TooltipContent side="right" sideOffset={12}>Toggle Theme</TooltipContent>}
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                className={cn("text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent", collapsed ? "h-10 w-10" : "w-full justify-start gap-3")}
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
    </TooltipProvider>
  )
}
