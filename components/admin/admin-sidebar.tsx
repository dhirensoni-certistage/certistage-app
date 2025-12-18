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
  LogOut
} from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useTheme } from "next-themes"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

const navigationItems = [
  { 
    name: 'Dashboard', 
    href: '/admin/dashboard', 
    icon: LayoutDashboard 
  },
  { 
    name: 'Users', 
    href: '/admin/users', 
    icon: Users
  },
  { 
    name: 'Events', 
    href: '/admin/events', 
    icon: Calendar
  },
  { 
    name: 'Revenue', 
    href: '/admin/revenue', 
    icon: IndianRupee 
  },
  { 
    name: 'Analytics', 
    href: '/admin/analytics', 
    icon: BarChart3 
  },
  { 
    name: 'Settings', 
    href: '/admin/settings', 
    icon: Settings 
  },
]

export function AdminSidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const { theme, setTheme } = useTheme()
  const [collapsed, setCollapsed] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

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

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: collapsed ? 72 : 260 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="h-screen bg-sidebar border-r border-sidebar-border flex flex-col"
      >
        {/* Logo */}
        <div
          className={cn(
            "h-16 border-b border-sidebar-border flex items-center px-4",
            collapsed ? "justify-center" : "justify-between"
          )}
        >
          <Link href="/admin/dashboard" className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg flex items-center justify-center shrink-0">
              <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} />
            </div>
            {!collapsed && (
              <div>
                <motion.span
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="font-semibold text-sidebar-foreground block"
                >
                  CertiStage
                </motion.span>
                <span className="text-xs text-sidebar-muted">Host Panel</span>
              </div>
            )}
          </Link>
          {!collapsed && (
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setCollapsed(true)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          )}
        </div>

        {/* Main Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navigationItems.map((item) => {
            const active = isActive(item.href)
            const Icon = item.icon
            
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors relative",
                      active
                        ? "bg-sidebar-accent text-sidebar-foreground"
                        : "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent/50",
                      collapsed && "justify-center px-0"
                    )}
                  >
                    {active && (
                      <motion.div
                        layoutId="sidebar-indicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-sidebar-primary rounded-r-full"
                      />
                    )}
                    <Icon className="h-5 w-5 shrink-0" />
                    {!collapsed && <span>{item.name}</span>}
                  </Link>
                </TooltipTrigger>
                {collapsed && (
                  <TooltipContent side="right" sideOffset={12}>
                    {item.name}
                  </TooltipContent>
                )}
              </Tooltip>
            )
          })}
        </nav>

        {/* Bottom Actions */}
        <div className={cn("p-3 border-t border-sidebar-border space-y-1", collapsed && "flex flex-col items-center")}>
          {collapsed && (
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-10 w-10 text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent"
                  onClick={() => setCollapsed(false)}
                >
                  <ChevronLeft className="h-4 w-4 rotate-180" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={12}>
                Expand
              </TooltipContent>
            </Tooltip>
          )}
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
            {collapsed && (
              <TooltipContent side="right" sideOffset={12}>
                Toggle Theme
              </TooltipContent>
            )}
          </Tooltip>
          
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size={collapsed ? "icon" : "default"}
                className={cn(
                  "text-sidebar-muted hover:text-sidebar-foreground hover:bg-sidebar-accent",
                  collapsed ? "h-10 w-10" : "w-full justify-start gap-3"
                )}
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 shrink-0" />
                {!collapsed && <span>Logout</span>}
              </Button>
            </TooltipTrigger>
            {collapsed && (
              <TooltipContent side="right" sideOffset={12}>
                Logout
              </TooltipContent>
            )}
          </Tooltip>
        </div>
      </motion.aside>
    </TooltipProvider>
  )
}
