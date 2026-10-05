"use client"

import { normalizePlanId } from "@/lib/auth"

/**
 * One shared profile request for the whole client portal.
 *
 * The layout, sidebar and several pages all need the user's current plan.
 * Each used to call /api/client/profile on its own, so a single page view
 * fired the request three or four times. This module de-duplicates
 * concurrent calls and caches the answer briefly.
 */

export interface ClientProfile {
  id: string
  name: string
  email: string
  phone?: string
  organization?: string
  plan?: string
  pendingPlan?: string | null
  planExpiresAt?: string
  isActive?: boolean
  createdAt?: string
  hidePoweredBy?: boolean
  canHidePoweredBy?: boolean
  logo?: string | null
}

interface ProfileResult {
  ok: boolean
  status: number
  user: ClientProfile | null
}

const CACHE_MS = 30_000

let cached: { at: number; result: ProfileResult } | null = null
let inflight: Promise<ProfileResult> | null = null

export function invalidateClientProfile() {
  cached = null
}

export async function fetchClientProfile(options: { force?: boolean } = {}): Promise<ProfileResult> {
  if (!options.force && cached && Date.now() - cached.at < CACHE_MS) return cached.result
  if (inflight) return inflight

  inflight = (async () => {
    try {
      const res = await fetch("/api/client/profile")
      const data = res.ok ? await res.json().catch(() => ({})) : {}
      const result: ProfileResult = { ok: res.ok, status: res.status, user: res.ok ? data.user || null : null }
      if (res.ok) cached = { at: Date.now(), result }
      else cached = null
      return result
    } catch {
      return { ok: false, status: 0, user: null }
    } finally {
      inflight = null
    }
  })()
  return inflight
}

/** Copies the server's plan fields into the locally stored session and returns the updated copy. */
export function applyProfileToSession(user: ClientProfile | null) {
  if (!user || typeof window === "undefined") return null
  const raw = localStorage.getItem("clientSession")
  if (!raw) return null
  try {
    const session = JSON.parse(raw)
    const updated = {
      ...session,
      userPlan: normalizePlanId(user.plan),
      planExpiresAt: user.planExpiresAt,
      pendingPlan: user.pendingPlan || null
    }
    localStorage.setItem("clientSession", JSON.stringify(updated))
    return updated
  } catch {
    return null
  }
}
