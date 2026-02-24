import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

// Protected routes pattern
const protectedRoutes = ['/client']
const publicRoutes = ['/client/login', '/client/register', '/client/forgot-password']

export async function middleware(request: NextRequest) {
    const path = request.nextUrl.pathname

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

        // Enterprise Security: Add security headers
        const response = NextResponse.next()
        response.headers.set('X-Frame-Options', 'DENY')
        response.headers.set('X-Content-Type-Options', 'nosniff')
        response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
        response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()')

        return response
    }

    return NextResponse.next()
}

export const config = {
    matcher: [
        '/client/:path*',
    ],
}
