"use client"

import { ReactNode, useEffect } from "react"
import { usePathname } from "next/navigation"

interface PageTransitionProps {
    children: ReactNode
}

export function PageTransition({ children }: PageTransitionProps) {
    const pathname = usePathname()

    // Scroll to top on route change
    useEffect(() => {
        window.scrollTo({ top: 0, behavior: "smooth" })
    }, [pathname])

    // No animation, just render children directly to avoid blink
    return <>{children}</>
}

// Keep other animation components for future use
export function FadeIn({ children, delay = 0 }: { children: ReactNode; delay?: number }) {
    return <>{children}</>
}

export function SlideIn({ children }: { children: ReactNode; direction?: "left" | "right" }) {
    return <>{children}</>
}

export function ScaleIn({ children }: { children: ReactNode }) {
    return <>{children}</>
}

export function StaggerChildren({ children }: { children: ReactNode }) {
    return <>{children}</>
}

export function StaggerItem({ children }: { children: ReactNode }) {
    return <>{children}</>
}
