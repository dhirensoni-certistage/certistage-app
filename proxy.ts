import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'
import { jwtVerify } from 'jose'

// Next.js 16 proxy (formerly middleware).
// - /client pages need an organiser session (NextAuth token or clientSession cookie).
// - /admin pages and every /api/admin route need a valid admin_token cookie,
//   except the few routes used to obtain one.
const protectedRoutes = ['/client']
const publicRoutes = ['/client/login', '/client/register']

const adminPublicApi = ['/api/admin/login', '/api/admin/setup', '/api/admin/logout', '/api/admin/verify']
const adminPublicPages = ['/admin/login']

// Same secret and algorithm the admin login route signs with (jsonwebtoken, HS256)
// (no fallback: without JWT_SECRET every admin session is refused)
async function hasValidAdminSession(request: NextRequest): Promise<boolean> {
    const token = request.cookies.get('admin_token')?.value
    const secret = process.env.JWT_SECRET
    if (!token || !secret) return false
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(secret), { algorithms: ['HS256'] })
        return payload.type === 'admin' && typeof payload.id === 'string'
    } catch {
        return false
    }
}

function withSecurityHeaders(response: NextResponse): NextResponse {
    response.headers.set('X-Frame-Options', 'DENY')
    response.headers.set('X-Content-Type-Options', 'nosniff')
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
    response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')
    // Dashboards and admin never belong in search results, even if someone links to them
    response.headers.set('X-Robots-Tag', 'noindex, nofollow')
    return response
}

export async function proxy(request: NextRequest) {
    const path = request.nextUrl.pathname

    // Admin API: refuse without a valid admin session
    if (path.startsWith('/api/admin')) {
        if (adminPublicApi.some(route => path === route || path.startsWith(route + '/'))) {
            return NextResponse.next()
        }
        if (!(await hasValidAdminSession(request))) {
            return NextResponse.json({ error: 'Admin authentication required' }, { status: 401 })
        }
        return withSecurityHeaders(NextResponse.next())
    }

    // Admin pages: send to the admin login without a valid session
    if (path.startsWith('/admin')) {
        if (adminPublicPages.some(route => path === route || path.startsWith(route + '/'))) {
            return withSecurityHeaders(NextResponse.next())
        }
        if (!(await hasValidAdminSession(request))) {
            return NextResponse.redirect(new URL('/admin/login', request.url))
        }
        return withSecurityHeaders(NextResponse.next())
    }

    // Check if it's a protected route
    const isProtectedRoute = protectedRoutes.some(route => path.startsWith(route))
    const isPublicRoute = publicRoutes.some(route => path.startsWith(route))

    if (isProtectedRoute && !isPublicRoute) {
        // Check for auth token
        const token = await getToken({
            req: request,
            secret: process.env.NEXTAUTH_SECRET
        })

        // Also check for client session cookie as fallback/secondary check
        const clientSession = request.cookies.get('clientSession')

        // If no token and no client session, redirect to login
        if (!token && !clientSession) {
            const url = new URL('/client/login', request.url)
            url.searchParams.set('callbackUrl', path)
            return NextResponse.redirect(url)
        }

        return withSecurityHeaders(NextResponse.next())
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/client/:path*',
        '/admin/:path*',
        '/api/admin/:path*',
    ],
}

export default proxy
