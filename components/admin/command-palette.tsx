"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import {
  LayoutDashboard,
  Users,
  Calendar,
  IndianRupee,
  BarChart3,
  Settings,
  Search,
  User,
  FileText,
  CreditCard,
  Plus,
  Download,
  RefreshCw,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"

interface SearchResult {
  users: Array<{ _id: string; name: string; email: string; plan: string }>
  events: Array<{ _id: string; name: string; userName: string; status: string }>
  payments: Array<{ _id: string; userName: string; plan: string; amount: number; status: string }>
}

const navigationItems = [
  { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard, shortcut: "G D" },
  { name: "Users", href: "/admin/users", icon: Users, shortcut: "G U" },
  { name: "Events", href: "/admin/events", icon: Calendar, shortcut: "G E" },
  { name: "Revenue", href: "/admin/revenue", icon: IndianRupee, shortcut: "G R" },
  { name: "Analytics", href: "/admin/analytics", icon: BarChart3, shortcut: "G A" },
  { name: "Settings", href: "/admin/settings", icon: Settings, shortcut: "G S" },
]

const quickActions = [
  { name: "Export Users CSV", action: "export-users", icon: Download },
  { name: "Export Payments CSV", action: "export-payments", icon: Download },
  { name: "Sync All Pending Payments", action: "sync-payments", icon: RefreshCw },
]

export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<SearchResult | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Cmd+K to open
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setOpen((open) => !open)
      }
    }
    document.addEventListener("keydown", down)
    return () => document.removeEventListener("keydown", down)
  }, [])

  // Keyboard shortcuts for navigation
  useEffect(() => {
    let lastKey = ""
    let timeout: NodeJS.Timeout

    const handleKeydown = (e: KeyboardEvent) => {
      if (open) return
      
      const key = e.key.toLowerCase()
      
      if (lastKey === "g") {
        const shortcuts: Record<string, string> = {
          d: "/admin/dashboard",
          u: "/admin/users",
          e: "/admin/events",
          r: "/admin/revenue",
          a: "/admin/analytics",
          s: "/admin/settings",
        }
        if (shortcuts[key]) {
          e.preventDefault()
          router.push(shortcuts[key])
        }
        lastKey = ""
      } else if (key === "g") {
        lastKey = "g"
        timeout = setTimeout(() => { lastKey = "" }, 500)
      }
    }

    document.addEventListener("keydown", handleKeydown)
    return () => {
      document.removeEventListener("keydown", handleKeydown)
      clearTimeout(timeout)
    }
  }, [open, router])

  // Search API call
  const searchData = useCallback(async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults(null)
      return
    }
    
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/search?q=${encodeURIComponent(searchQuery)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } catch (error) {
      console.error("Search failed:", error)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const debounce = setTimeout(() => {
      searchData(query)
    }, 300)
    return () => clearTimeout(debounce)
  }, [query, searchData])

  const handleSelect = (callback: () => void) => {
    setOpen(false)
    setQuery("")
    callback()
  }

  const handleAction = async (action: string) => {
    setOpen(false)
    switch (action) {
      case "export-users":
        window.open("/api/admin/export/users", "_blank")
        break
      case "export-payments":
        window.open("/api/admin/export/payments", "_blank")
        break
      case "sync-payments":
        await fetch("/api/admin/payments/sync", { method: "PUT" })
        break
    }
  }

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Search users, events, payments... or type a command" 
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>
          {loading ? "Searching..." : "No results found."}
        </CommandEmpty>

        {/* Search Results */}
        {results?.users && results.users.length > 0 && (
          <CommandGroup heading="Users">
            {results.users.map((user) => (
              <CommandItem
                key={user._id}
                onSelect={() => handleSelect(() => router.push(`/admin/users/${user._id}`))}
              >
                <User className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <span>{user.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">{user.email}</span>
                </div>
                <Badge variant="outline" className="ml-2">{user.plan}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.events && results.events.length > 0 && (
          <CommandGroup heading="Events">
            {results.events.map((event) => (
              <CommandItem
                key={event._id}
                onSelect={() => handleSelect(() => router.push(`/admin/events/${event._id}`))}
              >
                <Calendar className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <span>{event.name}</span>
                  <span className="text-muted-foreground ml-2 text-xs">by {event.userName}</span>
                </div>
                <Badge variant={event.status === "active" ? "default" : "secondary"}>{event.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {results?.payments && results.payments.length > 0 && (
          <CommandGroup heading="Payments">
            {results.payments.map((payment) => (
              <CommandItem
                key={payment._id}
                onSelect={() => handleSelect(() => router.push("/admin/revenue"))}
              >
                <CreditCard className="mr-2 h-4 w-4" />
                <div className="flex-1">
                  <span>{payment.userName}</span>
                  <span className="text-muted-foreground ml-2 text-xs">₹{payment.amount}</span>
                </div>
                <Badge variant={payment.status === "success" ? "default" : "secondary"}>{payment.status}</Badge>
              </CommandItem>
            ))}
          </CommandGroup>
        )}

        {!query && (
          <>
            <CommandGroup heading="Navigation">
              {navigationItems.map((item) => (
                <CommandItem
                  key={item.href}
                  onSelect={() => handleSelect(() => router.push(item.href))}
                >
                  <item.icon className="mr-2 h-4 w-4" />
                  <span>{item.name}</span>
                  <kbd className="ml-auto pointer-events-none inline-flex h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
                    {item.shortcut}
                  </kbd>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />

            <CommandGroup heading="Quick Actions">
              {quickActions.map((action) => (
                <CommandItem
                  key={action.action}
                  onSelect={() => handleAction(action.action)}
                >
                  <action.icon className="mr-2 h-4 w-4" />
                  <span>{action.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}

