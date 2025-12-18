"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AuthCallback() {
  const { data: session, status } = useSession()
  const router = useRouter()

  // Sync NextAuth session to localStorage clientSession
  const syncClientSession = async (plan?: string) => {
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
          userPlan: plan || data.user.plan || "free",
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
        userPlan: plan || "free",
        loginType: "user",
        loggedInAt: new Date().toISOString()
      }
      localStorage.setItem("clientSession", JSON.stringify(clientSession))
    }
  }

  useEffect(() => {
    if (status === "loading") return

    if (status === "authenticated" && session?.user) {
      // Check if there was a selected plan
      const selectedPlan = localStorage.getItem("selectedPlan")
      
      if (selectedPlan && selectedPlan !== "free") {
        // Update user plan
        fetch("/api/client/profile", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: selectedPlan })
        }).then(async () => {
          localStorage.removeItem("selectedPlan")
          await syncClientSession(selectedPlan)
          toast.success(`Welcome! You've been enrolled in the ${selectedPlan} plan.`)
          router.push("/client/events")
        }).catch(() => {
          toast.error("Failed to update plan. Please contact support.")
          router.push("/client/events")
        })
      } else {
        // Sync session and redirect
        syncClientSession().then(() => {
          toast.success(`Welcome back, ${session.user?.name}!`)
          router.push("/client/events")
        })
      }
    } else if (status === "unauthenticated") {
      toast.error("Authentication failed. Please try again.")
      router.push("/signup")
    }
  }, [session, status, router])

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