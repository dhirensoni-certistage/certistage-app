"use client"

import { useEffect, useState } from "react"
import { mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"

const CACHE_KEY = "plan_config"
const CACHE_AT_KEY = "plan_config_at"
const CACHE_TTL_MS = 10 * 60 * 1000

function readCachedPlans(): PlanConfig[] {
  if (typeof window === "undefined") return mergePlanConfigWithDefaults([])
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    return mergePlanConfigWithDefaults(raw ? JSON.parse(raw) : [])
  } catch {
    return mergePlanConfigWithDefaults([])
  }
}

/**
 * Live plan configuration for client-side pages.
 * Starts from the cached copy in localStorage (or the defaults), then refreshes
 * from the public plan-config API so prices always match what admin has saved.
 */
export function usePlanConfig(): { plans: PlanConfig[]; isLoaded: boolean } {
  const [plans, setPlans] = useState<PlanConfig[]>(() => mergePlanConfigWithDefaults([]))
  const [isLoaded, setIsLoaded] = useState(false)

  useEffect(() => {
    let mounted = true
    setPlans(readCachedPlans())

    const load = async () => {
      try {
        // Plans change rarely: reuse a fresh local copy instead of refetching on every page
        const seededAt = Number(localStorage.getItem(CACHE_AT_KEY) || 0)
        if (localStorage.getItem(CACHE_KEY) && Date.now() - seededAt < CACHE_TTL_MS) {
          if (mounted) setIsLoaded(true)
          return
        }
        const res = await fetch("/api/plan-config")
        if (!res.ok) return
        const data = await res.json()
        if (!mounted || !Array.isArray(data?.plans)) return
        setPlans(mergePlanConfigWithDefaults(data.plans))
        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify(data.plans))
          localStorage.setItem(CACHE_AT_KEY, String(Date.now()))
        } catch {
          // ignore storage errors
        }
      } catch {
        // keep cached / default plans on network failure
      } finally {
        if (mounted) setIsLoaded(true)
      }
    }

    load()
    return () => {
      mounted = false
    }
  }, [])

  return { plans, isLoaded }
}
