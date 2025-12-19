"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ChevronRight, Home } from "lucide-react"
import { cn } from "@/lib/utils"

interface BreadcrumbItem {
  label: string
  href?: string
}

interface BreadcrumbsProps {
  items?: BreadcrumbItem[]
  className?: string
}

const pathLabels: Record<string, string> = {
  admin: "Admin",
  dashboard: "Dashboard",
  users: "Users",
  events: "Events",
  revenue: "Revenue",
  analytics: "Analytics",
  settings: "Settings",
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  const pathname = usePathname()

  // Auto-generate breadcrumbs from pathname if items not provided
  const breadcrumbs = items || generateBreadcrumbs(pathname)

  if (breadcrumbs.length <= 1) return null

  return (
    <nav className={cn("flex items-center text-sm text-muted-foreground mb-4", className)}>
      <Link href="/admin/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center">
          <ChevronRight className="h-4 w-4 mx-2" />
          {item.href && index < breadcrumbs.length - 1 ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </div>
      ))}
    </nav>
  )
}

function generateBreadcrumbs(pathname: string): BreadcrumbItem[] {
  const segments = pathname.split("/").filter(Boolean)
  const breadcrumbs: BreadcrumbItem[] = []

  let currentPath = ""
  segments.forEach((segment, index) => {
    currentPath += `/${segment}`
    
    // Skip 'admin' in display but keep in path
    if (segment === "admin") return

    const label = pathLabels[segment] || formatSegment(segment)
    breadcrumbs.push({
      label,
      href: index < segments.length - 1 ? currentPath : undefined
    })
  })

  return breadcrumbs
}

function formatSegment(segment: string): string {
  // Check if it's a MongoDB ObjectId (24 hex chars)
  if (/^[a-f0-9]{24}$/i.test(segment)) {
    return "Details"
  }
  // Capitalize and replace hyphens
  return segment
    .split("-")
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ")
}
