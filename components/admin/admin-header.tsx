"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Bell, Search, HelpCircle, Command, ChevronDown, User, CreditCard, Calendar, Check, Activity, Settings, LogOut, PackagePlus, LifeBuoy } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { formatDistanceToNow } from "date-fns"
import { toast } from "sonner"
import Link from "next/link"
import { Home } from "lucide-react"
import { LogoutConfirmation } from "@/components/admin/logout-confirmation"

interface Notification {
  _id: string
  type: "signup" | "payment" | "event"
  title: string
  description: string
  read: boolean
  createdAt: string
}

interface AdminHeaderProps {
  title: string
  description?: string
  compact?: boolean
}

export function AdminHeader({ title, description, compact = false }: AdminHeaderProps) {
  const router = useRouter()
  const [logoutOpen, setLogoutOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)

  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchNotifications = async () => {
    try {
      const res = await fetch("/api/admin/notifications", { cache: "no-store" })
      if (res.ok) {
        const data = await res.json()
        setNotifications(data.notifications)
        setUnreadCount(data.unreadCount)
      }
    } catch (error) {
      console.error("Failed to fetch notifications:", error)
    }
  }

  const markAsRead = async (id: string) => {
    try {
      const res = await fetch("/api/admin/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notificationId: id }),
      })
      if (!res.ok) throw new Error("Failed to save notification read status")
      await fetchNotifications()
    } catch (error) {
      console.error("Failed to mark as read:", error)
      toast.error("Failed to mark notification as read. Please try again.")
    }
  }

  const markAllAsRead = async () => {
    try {
      const res = await fetch("/api/admin/notifications", { method: "POST" })
      if (!res.ok) throw new Error("Failed to save notification read status")
      await fetchNotifications()
    } catch (error) {
      console.error("Failed to mark all as read:", error)
      toast.error("Failed to mark notifications as read. Please try again.")
    }
  }

  const openCommandPalette = () => {
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
  }

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "signup": return <User className="h-4 w-4 text-blue-500" />
      case "payment": return <CreditCard className="h-4 w-4 text-neutral-500" />
      case "event": return <Calendar className="h-4 w-4 text-purple-500" />
      case "addon_request": return <PackagePlus className="h-4 w-4 text-amber-600" />
      case "support": return <LifeBuoy className="h-4 w-4 text-red-500" />
      default: return <Bell className="h-4 w-4" />
    }
  }

  return (
    <header className="sticky top-0 z-40 bg-neutral-50/85 backdrop-blur-sm px-6 py-4 flex items-center justify-between gap-4">
      <div className="min-w-0">
        {compact ? (
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-[13px]">
            <Link href="/admin/dashboard" aria-label="Admin dashboard" className="text-neutral-400 hover:text-neutral-700"><Home className="h-3.5 w-3.5" /></Link>
            <span className="text-neutral-400">/</span><span className="font-medium text-neutral-700" aria-current="page">{title}</span>
          </nav>
        ) : (
          <><h1 className="text-2xl font-semibold tracking-tight text-neutral-900 truncate">{title}</h1>
          {description && <p className="text-sm text-neutral-500 mt-0.5 truncate">{description}</p>}</>
        )}
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        {/* Search (opens the command palette) */}
        <button
          type="button"
          onClick={openCommandPalette}
          className="hidden md:flex items-center gap-2 h-10 w-72 rounded-lg border border-neutral-200 bg-white pl-3 pr-2 text-left text-[13px] text-neutral-400 hover:border-neutral-300 transition-colors mr-2"
        >
          <Search className="h-4 w-4 text-neutral-500 shrink-0" />
          <span className="flex-1 truncate">Search users, events or payments...</span>
          <kbd className="pointer-events-none inline-flex h-5 select-none items-center rounded border border-neutral-200 bg-neutral-50 px-1.5 font-mono text-[10px] font-medium text-neutral-500">
            Ctrl + K
          </kbd>
        </button>

        {/* Help */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100">
                <HelpCircle className="h-[18px] w-[18px]" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Help & Documentation</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {/* Notifications */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 rounded-full relative text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
              aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : "Notifications"}
            >
              <Bell className="h-[18px] w-[18px]" />
              {unreadCount > 0 && (
                <span className="absolute top-1.5 right-2 h-2 w-2 rounded-full bg-red-500 ring-2 ring-neutral-50" />
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel className="flex items-center justify-between">
              <span>
                Notifications
                {unreadCount > 0 && <span className="ml-1.5 text-xs font-normal text-neutral-500">{unreadCount > 99 ? "99+" : unreadCount} new</span>}
              </span>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="h-auto p-0 text-xs text-gold-deep hover:text-gold-deep hover:bg-transparent" onClick={markAllAsRead}>
                  Mark all read
                </Button>
              )}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <ScrollArea className="h-[300px]">
              {notifications.length === 0 ? (
                <div className="p-4 text-center text-sm text-muted-foreground">
                  No notifications
                </div>
              ) : (
                notifications.map((notification) => (
                  <DropdownMenuItem
                    key={notification._id}
                    className={cn("flex items-start gap-3 p-3 cursor-pointer", !notification.read && "bg-muted/50")}
                    onClick={() => !notification.read && markAsRead(notification._id)}
                  >
                    <div className="mt-0.5">{getNotificationIcon(notification.type)}</div>
                    <div className="flex-1 space-y-1">
                      <p className={cn("text-sm", !notification.read && "font-medium")}>{notification.title}</p>
                      <p className="text-xs text-muted-foreground">{notification.description}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {formatDistanceToNow(new Date(notification.createdAt), { addSuffix: true })}
                      </p>
                    </div>
                    {!notification.read && <div className="h-2 w-2 bg-gold rounded-full mt-1.5" />}
                  </DropdownMenuItem>
                ))
              )}
            </ScrollArea>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Admin Profile */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-10 gap-1.5 pl-1 pr-2 rounded-full hover:bg-neutral-100" aria-label="Admin account">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-neutral-200 text-neutral-900 text-xs font-semibold">AD</AvatarFallback>
              </Avatar>
              <ChevronDown className="h-4 w-4 text-neutral-500" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Admin Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => router.push("/admin/profile")} className="cursor-pointer">
              <Settings className="h-4 w-4 mr-2" />
              Profile Settings
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push("/admin/activity")} className="cursor-pointer">
              <Activity className="h-4 w-4 mr-2" />
              Activity Log
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem 
              className="text-destructive cursor-pointer"
              onSelect={() => setLogoutOpen(true)}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Logout
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <LogoutConfirmation open={logoutOpen} onOpenChange={setLogoutOpen} />
    </header>
  )
}

