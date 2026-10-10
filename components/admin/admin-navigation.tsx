"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { usePathname } from "next/navigation"

const NavigationContext = createContext({ mobileOpen: false, setMobileOpen: (_open: boolean) => {} })

export function AdminNavigationProvider({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  useEffect(() => { setMobileOpen(false) }, [pathname])
  useEffect(() => {
    const media = window.matchMedia("(min-width: 768px)")
    const close = () => { if (media.matches) setMobileOpen(false) }
    media.addEventListener("change", close)
    return () => media.removeEventListener("change", close)
  }, [])
  return <NavigationContext.Provider value={{ mobileOpen, setMobileOpen }}>{children}</NavigationContext.Provider>
}

export const useAdminNavigation = () => useContext(NavigationContext)
