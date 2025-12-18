"use client"

import { useEffect } from "react"
import { useSession } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

export default function AuthCallback() {
  const { data: session, status } = useSession()
  const router = useRouter()

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
        }).then(() => {
          localStorage.removeItem("selectedPlan")
          toast.success(`Welcome! You've been enrolled in the ${selectedPlan} plan.`)
          router.push("/client/events")
        }).catch(() => {
          toast.error("Failed to update plan. Please contact support.")
          router.push("/client/events")
        })
      } else {
        toast.success(`Welcome back, ${session.user.name}!`)
        router.push("/client/events")
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