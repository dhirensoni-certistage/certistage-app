import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

// Create Redis instance (fallback to in-memory for development)
const redis = process.env.UPSTASH_REDIS_REST_URL 
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : undefined

// Rate limiters for different endpoints
export const authRateLimit = new Ratelimit({
  redis: redis || new Map(), // Fallback to in-memory for development
  limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
  analytics: true,
})

export const apiRateLimit = new Ratelimit({
  redis: redis || new Map(),
  limiter: Ratelimit.slidingWindow(100, "1 h"), // 100 requests per hour
  analytics: true,
})

export const paymentRateLimit = new Ratelimit({
  redis: redis || new Map(),
  limiter: Ratelimit.slidingWindow(3, "1 h"), // 3 payment attempts per hour
  analytics: true,
})

// Helper function to get client IP
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")
  const realIP = request.headers.get("x-real-ip")
  
  if (forwarded) {
    return forwarded.split(",")[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  return "127.0.0.1" // Fallback for development
}

// Rate limit middleware
export async function checkRateLimit(
  rateLimit: Ratelimit,
  identifier: string
): Promise<{ success: boolean; limit: number; remaining: number; reset: Date }> {
  const { success, limit, remaining, reset } = await rateLimit.limit(identifier)
  
  return {
    success,
    limit,
    remaining,
    reset: new Date(reset)
  }
}