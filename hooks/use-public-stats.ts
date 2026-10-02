"use client"

import { useEffect, useState } from "react"
import type { PublicStats } from "@/lib/public-stats"

/** Live platform counts from /api/public-stats (CDN-cached for an hour). Null until loaded or on failure. */
export function usePublicStats(): PublicStats | null {
  const [stats, setStats] = useState<PublicStats | null>(null)

  useEffect(() => {
    let mounted = true
    fetch("/api/public-stats")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (mounted && data && typeof data.certificates === "number") setStats(data)
      })
      .catch(() => {})
    return () => {
      mounted = false
    }
  }, [])

  return stats
}
