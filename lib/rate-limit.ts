import { NextResponse } from "next/server"

/**
 * Rate limiting for public endpoints (login, signup, password reset, contact).
 * Uses Upstash Redis when configured; otherwise an in-memory sliding window,
 * which is per server instance but still blunts automated attempts.
 */
export type RateLimitKind = "login" | "signup" | "forgotPassword" | "contact" | "payment"

const WINDOWS: Record<RateLimitKind, { limit: number; windowMs: number }> = {
  login: { limit: 10, windowMs: 15 * 60 * 1000 },
  signup: { limit: 5, windowMs: 15 * 60 * 1000 },
  forgotPassword: { limit: 5, windowMs: 15 * 60 * 1000 },
  contact: { limit: 5, windowMs: 15 * 60 * 1000 },
  payment: { limit: 10, windowMs: 60 * 60 * 1000 }
}

export interface RateLimitResult {
  success: boolean
  remaining: number
  retryAfterSeconds: number
}

// ---- in-memory fallback ----
const memoryStore = new Map<string, number[]>()

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const windowStart = now - windowMs
  const hits = (memoryStore.get(key) || []).filter((t) => t > windowStart)
  if (hits.length >= limit) {
    memoryStore.set(key, hits)
    return { success: false, remaining: 0, retryAfterSeconds: Math.ceil((hits[0] + windowMs - now) / 1000) }
  }
  hits.push(now)
  memoryStore.set(key, hits)
  if (memoryStore.size > 10000) {
    for (const [k, v] of memoryStore) {
      if (!v.some((t) => t > windowStart)) memoryStore.delete(k)
    }
  }
  return { success: true, remaining: limit - hits.length, retryAfterSeconds: 0 }
}

// ---- Upstash (lazy, only when configured) ----
let upstashLimiters: Partial<Record<RateLimitKind, { limit: (id: string) => Promise<{ success: boolean; remaining: number; reset: number }> }>> | null = null

async function upstashLimit(kind: RateLimitKind, key: string): Promise<RateLimitResult | null> {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) return null
  try {
    if (!upstashLimiters) upstashLimiters = {}
    if (!upstashLimiters[kind]) {
      const { Ratelimit } = await import("@upstash/ratelimit")
      const { Redis } = await import("@upstash/redis")
      const { limit, windowMs } = WINDOWS[kind]
      upstashLimiters[kind] = new Ratelimit({
        redis: new Redis({ url: process.env.UPSTASH_REDIS_REST_URL, token: process.env.UPSTASH_REDIS_REST_TOKEN }),
        limiter: Ratelimit.slidingWindow(limit, `${Math.round(windowMs / 1000)} s`),
        prefix: `certistage:${kind}`
      })
    }
    const result = await upstashLimiters[kind]!.limit(key)
    return {
      success: result.success,
      remaining: result.remaining,
      retryAfterSeconds: result.success ? 0 : Math.max(1, Math.ceil((result.reset - Date.now()) / 1000))
    }
  } catch (error) {
    console.error("Upstash rate limit error, falling back to memory:", error)
    return null
  }
}

export async function checkRateLimit(kind: RateLimitKind, identifier: string): Promise<RateLimitResult> {
  const key = `${kind}:${identifier}`
  const remote = await upstashLimit(kind, key)
  if (remote) return remote
  const { limit, windowMs } = WINDOWS[kind]
  return memoryLimit(key, limit, windowMs)
}

export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  if (forwarded) return forwarded.split(",")[0].trim()
  const realIP = request.headers.get("x-real-ip")
  if (realIP) return realIP
  return "unknown"
}

export function rateLimitResponse(result: RateLimitResult, message = "Too many attempts. Please try again later."): NextResponse {
  return NextResponse.json(
    { error: message, retryAfterSeconds: result.retryAfterSeconds },
    { status: 429, headers: { "Retry-After": String(result.retryAfterSeconds || 60) } }
  )
}
