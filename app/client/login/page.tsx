"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { Loader2, Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AuthSidePanel, AuthMobileBar } from "@/components/landing/auth-side-panel"

const inputClass = "h-10 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-gold focus-visible:border-gold transition-all placeholder:text-[#BBB]"

// Only ever send people back inside the app, never to an external URL
const safeCallback = (value: string | null): string | null =>
  value && value.startsWith("/") && !value.startsWith("//") ? value : null

function GoogleIcon() {
  return (
    <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
    </svg>
  )
}

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"))

  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // Prefill from the signup page's "already registered" prompt
  useEffect(() => {
    const prefill = searchParams.get("email")
    if (prefill) setEmail(prefill)
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl: "/auth/callback", redirect: true })
    } catch {
      toast.error("Could not start Google sign-in. Please try again.")
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password")
      return
    }

    setIsLoading(true)
    try {
      const start = Date.now()
      const res = await fetch("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json().catch(() => ({}))

      const elapsed = Date.now() - start
      if (elapsed < 400) await new Promise((r) => setTimeout(r, 400 - elapsed))

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
        toast.warning("Your plan has expired. The account is on the Free plan now.")
      }

      if (data.user.pendingPlan) {
        router.push("/client/complete-payment")
      } else {
        router.push(callbackUrl || "/client/events")
      }
    } catch {
      toast.error("Connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">
      <AuthSidePanel
        headline="Your events, certificates and downloads, in one place."
        footnote="Need help signing in? support@certistage.com"
      />

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 bg-white">
        <div className="w-full max-w-[380px] py-6">
          <AuthMobileBar linkLabel="Create account" linkHref="/signup" />

          <div className="space-y-2 mb-7">
            <h2 className="text-2xl font-semibold tracking-tight text-black">Sign in to CertiStage</h2>
            <p className="text-[14px] text-[#666]">Welcome back. Pick up where you left off.</p>
          </div>

          <div className="space-y-5">
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} className="w-full h-10 bg-white border-[#E5E5E5] text-[#333] hover:bg-[#FAFAFA] hover:text-black font-medium text-[13px] shadow-sm">
              <GoogleIcon /> Continue with Google
            </Button>

            <div className="flex items-center gap-3 w-full">
              <div className="h-px bg-[#E5E5E5] flex-1" />
              <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">or</span>
              <div className="h-px bg-[#E5E5E5] flex-1" />
            </div>

            <form onSubmit={handleLogin} className="space-y-4" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-[#333]">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  inputMode="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                  placeholder="you@example.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-[13px] font-medium text-[#333]">Password</Label>
                  <Link href="/forgot-password" className="text-[12px] text-[#666] hover:text-black transition-colors">Forgot password?</Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={cn(inputClass, "pr-10")}
                    disabled={isLoading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 px-3 text-[#999] hover:text-black"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" className={cn("w-full h-10 mt-1 bg-black text-white hover:bg-[#222] font-medium text-[13px] shadow-sm", isLoading && "opacity-70")} disabled={isLoading}>
                {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Sign in"}
              </Button>
            </form>
          </div>

          <p className="hidden lg:block text-center text-[13px] text-[#666] mt-8">
            New to CertiStage?{" "}
            <Link href="/signup" className="text-black font-medium hover:underline underline-offset-4">Create an account</Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ClientLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-300" /></div>}>
      <LoginForm />
    </Suspense>
  )
}
