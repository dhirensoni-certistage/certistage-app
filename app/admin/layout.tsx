"use client"

import type React from "react"
import { usePathname, useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { AdminSidebar } from "@/components/admin/admin-sidebar"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [loading, setLoading] = useState(true)
  
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
      <AdminSidebar />
      <main className="flex-1 flex flex-col overflow-hidden">{children}</main>
    </div>
  )
}
