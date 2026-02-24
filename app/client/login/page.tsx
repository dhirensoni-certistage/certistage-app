"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import Image from "next/image"
import { motion } from "framer-motion"
import { Loader2, ArrowRight, CheckCircle2, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

export default function ClientLoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", {
        callbackUrl: "/auth/callback",
        redirect: true
      })
    } catch (error) {
      console.error("Google sign-in error:", error)
      toast.error("Failed to sign in with Google")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password.trim()) {
      toast.error("Please enter email and password")
      return
    }

    setIsLoading(true)

    try {
      // Simulate network latency feel for smoother transition
      const start = Date.now()

      const res = await fetch("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      })

      const data = await res.json()

      // Ensure minimum display time for loading state to prevent flash
      const elapsed = Date.now() - start
      if (elapsed < 500) await new Promise(r => setTimeout(r, 500 - elapsed))

      if (!res.ok) {
        toast.error(data.error || "Login failed")
        setIsLoading(false)
        return
      }

      const session = {
        userId: data.user.id,
        userName: data.user.name,
        userEmail: data.user.email,
        userPhone: data.user.phone,
        userPlan: data.user.plan,
        pendingPlan: data.user.pendingPlan || null,
        planStartDate: data.user.planStartDate,
        planExpiresAt: data.user.planExpiresAt,
        loginType: "user",
        loggedInAt: new Date().toISOString()
      }
      localStorage.setItem("clientSession", JSON.stringify(session))

      if (data.user.planStatus === "expired") {
        toast.warning("Plan expired. Downgraded to Free.")
      }

      toast.success("Welcome back")

      if (data.user.pendingPlan) {
        router.push("/client/complete-payment")
      } else {
        router.push("/client/events")
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("Connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">

      {/* Left Panel - Clean & Professional Product Showcase */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between overflow-hidden bg-[#F5F5F7] border-r border-[#E5E5E5] p-16">

        {/* Subtle Grid Background for that "Technical Tool" feel */}
        <div className="absolute inset-0 z-0 opacity-[0.4]"
          style={{ backgroundImage: 'radial-gradient(#D4D4D4 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        </div>

        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} className="w-9 h-9" />
            <span className="font-semibold tracking-tight text-xl text-black">CertiStage</span>
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-center mb-10"
          >
            <h1 className="text-[32px] font-semibold tracking-tight leading-tight text-black mb-3">
              Professional credentialing <br /> for modern organizations.
            </h1>
            <p className="text-[15px] text-[#666] font-medium">Auto-generate, secure, and deliver certificates in seconds.</p>
          </motion.div>

          {/* Realistic Paper Certificate Preview */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            transition={{ duration: 0.8, type: "spring", bounce: 0.2 }}
            className="relative w-full aspect-[1.414/1] bg-white rounded-sm shadow-[0_20px_40px_-12px_rgba(0,0,0,0.12),0_1px_5px_-1px_rgba(0,0,0,0.05)] border border-[#EBEBEB] p-8 overflow-hidden mx-auto max-w-[480px]"
          >
            {/* Decorative Border inside the certificate */}
            <div className="absolute inset-4 border border-[#1a1a1a] opacity-10 pointer-events-none" />
            <div className="absolute inset-5 border border-[#1a1a1a] opacity-5 pointer-events-none" />

            {/* Certificate Content - Serif fonts for realism */}
            <div className="h-full flex flex-col items-center justify-center text-center relative z-10">
              <div className="mb-6">
                <div className="text-[10px] uppercase tracking-[0.2em] font-bold text-[#555] mb-2">Certificate of Completion</div>
                <div className="w-12 h-[1px] bg-black/20 mx-auto" />
              </div>

              <div className="font-serif text-3xl text-black mb-4 italic leading-none">
                Attendee Name
              </div>

              <p className="text-[10px] text-[#555] max-w-[280px] leading-relaxed mb-8">
                For successfully completing the Advanced Software Architecture Compliance Workshop held on January 29, 2026.
              </p>

              <div className="w-full flex justify-between items-end px-4 mt-auto">
                <div className="text-left">
                  <div className="w-24 h-[1px] bg-black mb-2" />
                  <div className="text-[8px] uppercase font-bold tracking-wider text-[#333]">Director</div>
                </div>

                {/* Gold Seal Effect */}
                <div className="w-12 h-12 rounded-full border-2 border-amber-600/30 bg-amber-50 flex items-center justify-center shadow-inner">
                  <div className="w-10 h-10 rounded-full border border-amber-600/40 border-dashed" />
                </div>

                <div className="text-right">
                  <div className="w-24 h-[1px] bg-black mb-2" />
                  <div className="text-[8px] uppercase font-bold tracking-wider text-[#333]">Instructor</div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>

        <div className="relative z-10 text-center">
          <p className="text-[11px] font-medium text-[#888] uppercase tracking-widest">Trusted by 2,000+ teams</p>
        </div>
      </div>

      {/* Right Panel - Minimalist Login Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white">
        <div className="w-full max-w-[360px] space-y-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Welcome back
            </h2>
            <p className="text-[14px] text-[#666]">
              Please enter your details to sign in.
            </p>
          </div>

          <div className="space-y-5">
            <Button
              type="button"
              variant="outline"
              onClick={handleGoogleSignIn}
              className="w-full h-10 bg-white border-[#E5E5E5] text-[#333] hover:bg-[#FAFAFA] hover:text-black font-medium text-[13px] shadow-sm transition-all"
            >
              <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Sign in with Google
            </Button>

            <div className="flex items-center gap-3 w-full">
              <div className="h-px bg-[#E5E5E5] flex-1" />
              <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">or</span>
              <div className="h-px bg-[#E5E5E5] flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#333]">Email</Label>
                  <Input
                    autoFocus
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                    placeholder="name@work-email.com"
                    disabled={isLoading}
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label className="text-[13px] font-medium text-[#333]">Password</Label>
                    <Link
                      href="/forgot-password"
                      className="text-[12px] text-[#666] hover:text-black transition-colors"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                    disabled={isLoading}
                  />
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-10 mt-2 bg-black text-white hover:bg-[#222] transition-all font-medium text-[13px] shadow-sm flex items-center justify-center gap-2",
                  isLoading && "opacity-70"
                )}
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="text-center text-[13px] text-[#666]">
            Don't have an account?{" "}
            <Link href="/signup" className="text-black font-medium hover:underline underline-offset-4">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
