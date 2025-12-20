"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"
import { CommandPalette } from "@/components/admin/command-palette"
import { KeyboardShortcuts } from "@/components/admin/keyboard-shortcuts"

// Page title mapping
const pageTitles: Record<string, string> = {
  "/admin": "Dashboard - CertiStage Admin",
  "/admin/dashboard": "Dashboard - CertiStage Admin",
  "/admin/users": "Users - CertiStage Admin",
  "/admin/events": "Events - CertiStage Admin",
  "/admin/revenue": "Revenue - CertiStage Admin",
  "/admin/analytics": "Analytics - CertiStage Admin",
  "/admin/settings": "Settings - CertiStage Admin",
  "/admin/login": "Login - CertiStage Admin",
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Set page title
  useEffect(() => {
    const title = pageTitles[pathname] || "CertiStage Admin"
    document.title = title
  }, [pathname])
  
  useEffect(() => {
    // Don't check auth on login page
    if (pathname === "/admin/login") {
      setLoading(false)
      return
    }
    checkAuth()
  }, [pathname])

  const checkAuth = async () => {
    try {
      const res = await fetch("/api/admin/verify")
      if (res.ok) {
        setIsAuthenticated(true)
      } else {
        router.push("/admin/login")
      }
    } catch (error) {
      router.push("/admin/login")
    } finally {
      setLoading(false)
    }
  }

  // Don't show sidebar on login page
  if (pathname === "/admin/login") {
    return <>{children}</>
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!isAuthenticated) {
    return null
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      <CommandPalette />
      <KeyboardShortcuts />
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
