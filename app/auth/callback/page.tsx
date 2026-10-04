"use client"

import { useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AuthCallback() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [processing, setProcessing] = useState(false)

  // Sync NextAuth session to localStorage clientSession
  const syncClientSession = async (pendingPlan?: string) => {
    if (!session?.user) return
    
    // Fetch user profile from API to get accurate plan info
    try {
      const res = await fetch("/api/client/profile")
      if (res.ok) {
        const data = await res.json()
        const clientSession = {
          userId: data.user.id || (session.user as any).id,
          userName: data.user.name || session.user.name,
          userEmail: data.user.email || session.user.email,
          userPlan: data.user.plan || "free",
          pendingPlan: pendingPlan || data.user.pendingPlan || null,
          planExpiresAt: data.user.planExpiresAt,
          loginType: "user",
          loggedInAt: new Date().toISOString()
        }
        localStorage.setItem("clientSession", JSON.stringify(clientSession))
      }
    } catch (error) {
      console.error("Failed to sync session:", error)
      // Fallback: create basic session
      const clientSession = {
        userId: (session.user as any).id,
        userName: session.user.name,
        userEmail: session.user.email,
        userPlan: "free",
        pendingPlan: pendingPlan || null,
        loginType: "user",
        loggedInAt: new Date().toISOString()
      }
      localStorage.setItem("clientSession", JSON.stringify(clientSession))
    }
  }

  useEffect(() => {
    if (status === "loading" || processing) return

    if (status === "authenticated" && session?.user) {
      setProcessing(true)
      // Plan picked on the signup page before going to Google; use it once
      const selectedPlan = localStorage.getItem("selectedPlan")
      localStorage.removeItem("selectedPlan")

      const finish = async () => {
        if (selectedPlan) {
          // The server accepts it only if it's a paid plan that is currently on sale
          // (any plan from Admin > Plans, not a fixed list)
          const res = await fetch("/api/client/profile", {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ pendingPlan: selectedPlan })
          }).catch(() => null)
          if (res?.ok) {
            await syncClientSession(selectedPlan)
            router.push(`/complete-payment?plan=${encodeURIComponent(selectedPlan)}`)
            return
          }
          toast.error("That plan isn't available right now. You can pick a plan from See plans.")
        }
        await syncClientSession()
        toast.success(`Welcome, ${session.user?.name}!`)
        router.push("/client/events")
      }
      finish()
    } else if (status === "unauthenticated") {
      toast.error("Authentication failed. Please try again.")
      router.push("/signup")
    }
  }, [session, status, router, processing])

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Setting up your account...</h2>
        <p className="text-gray-600">Please wait while we complete your registration.</p>
      </div>
    </div>
  )
}