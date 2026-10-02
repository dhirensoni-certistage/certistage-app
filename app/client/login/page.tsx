"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { signIn } from "next-auth/react"
import Link from "next/link"
import { motion, AnimatePresence } from "framer-motion"
import { Loader2, Eye, EyeOff, ArrowRight, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { AuthSidePanel, AuthMobileBar, authInputClass, authPrimaryButtonClass, authGoogleButtonClass } from "@/components/landing/auth-side-panel"
import { Reveal } from "@/components/landing/reveal"
import { OtpInput } from "@/components/landing/otp-input"

const inputClass = authInputClass
const RESEND_SECONDS = 30

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

type Mode = "otp" | "password"

function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallback(searchParams.get("callbackUrl"))

  const [mode, setMode] = useState<Mode>("otp")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)

  // OTP flow
  const [codeSent, setCodeSent] = useState(false)
  const [noAccount, setNoAccount] = useState<string | null>(null)
  const [code, setCode] = useState("")
  const [codeStatus, setCodeStatus] = useState<"idle" | "error" | "success">("idle")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [resendIn, setResendIn] = useState(0)

  useEffect(() => {
    const prefill = searchParams.get("email")
    if (prefill) setEmail(prefill)
  }, [searchParams])

  useEffect(() => {
    if (resendIn <= 0) return
    const t = setTimeout(() => setResendIn((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendIn])

  const finishLogin = (data: any) => {
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
    router.push(data.user.pendingPlan ? "/client/complete-payment" : callbackUrl || "/client/events")
  }

  const handleGoogleSignIn = async () => {
    try {
      await signIn("google", { callbackUrl: "/auth/callback", redirect: true })
    } catch {
      toast.error("Could not start Google sign-in. Please try again.")
    }
  }

  // ---- OTP ----
  const requestCode = async (): Promise<boolean> => {
    const res = await fetch("/api/client/auth/otp/request", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) {
      if (data.notFound) {
        setNoAccount(email.trim())
        return false
      }
      toast.error(data.error || "Could not send the code. Please try again.")
      return false
    }
    setNoAccount(null)
    return true
  }

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) {
      toast.error("Please enter your email")
      return
    }
    setIsLoading(true)
    try {
      if (await requestCode()) {
        setCodeSent(true)
        setCode("")
        setCodeStatus("idle")
        setCodeError(null)
        setResendIn(RESEND_SECONDS)
      }
    } catch {
      toast.error("Connection failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleResend = async () => {
    if (resendIn > 0 || isLoading) return
    setIsLoading(true)
    try {
      if (await requestCode()) {
        setCode("")
        setCodeStatus("idle")
        setCodeError(null)
        setResendIn(RESEND_SECONDS)
        toast.success("A new code is on its way")
      }
    } finally {
      setIsLoading(false)
    }
  }

  const verifyCode = async (value: string) => {
    if (isLoading || value.length !== 6) return
    setIsLoading(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/client/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), code: value })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCodeStatus("error")
        setCodeError(data.error || "Incorrect code")
        if (data.expired) setResendIn(0)
        setCode("")
        setIsLoading(false)
        return
      }
      setCodeStatus("success")
      await new Promise((r) => setTimeout(r, 650))
      finishLogin(data)
    } catch {
      setIsLoading(false)
      toast.error("Connection failed. Please try again.")
    }
  }

  // ---- Password ----
  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim() || !password) {
      toast.error("Please enter your email and password")
      return
    }
    setIsLoading(true)
    try {
      const res = await fetch("/api/client/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        toast.error(data.error || "Login failed")
        setIsLoading(false)
        return
      }
      finishLogin(data)
    } catch {
      toast.error("Connection failed. Please try again.")
      setIsLoading(false)
    }
  }

  const switchMode = (next: Mode) => {
    setMode(next)
    setCodeSent(false)
    setCode("")
    setCodeStatus("idle")
    setCodeError(null)
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">
      <AuthSidePanel
        headline="Your events, certificates and downloads, in one place."
        footnote="Need help signing in? support@certistage.com"
      />

      <div className="flex-1 flex flex-col justify-start lg:justify-center items-center px-6 pt-10 pb-8 sm:px-8 lg:py-8 bg-white">
        <Reveal className="w-full max-w-[400px]" y={14}>
          <AuthMobileBar prompt="New to CertiStage?" linkLabel="Create account" linkHref="/signup" />

          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="space-y-1.5">
              <h2 className="text-[26px] font-semibold tracking-tight text-black">Sign in</h2>
              <p className="text-[14px] text-[#666]">
                {mode === "otp" ? "We will email you a 6-digit code. No password needed." : "Welcome back. Pick up where you left off."}
              </p>
            </div>
            <Link href="/signup" className="hidden lg:inline-block mt-2 text-[13px] font-medium text-neutral-600 hover:text-black whitespace-nowrap underline underline-offset-4">
              Create account
            </Link>
          </div>

          {/* Mode switch */}
          {!codeSent && (
            <div className="mb-5 grid grid-cols-2 rounded-lg bg-neutral-100 p-1 text-[13px] font-medium">
              {([["otp", "Email code"], ["password", "Password"]] as [Mode, string][]).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => switchMode(value)}
                  aria-pressed={mode === value}
                  className={cn(
                    "h-9 rounded-md transition-all",
                    mode === value ? "bg-white text-black shadow-sm" : "text-neutral-500 hover:text-neutral-800"
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait" initial={false}>
            {mode === "otp" && !codeSent && (
              <motion.form key="otp-email" onSubmit={handleSendCode} className="space-y-4" noValidate
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-[13px] font-medium text-[#333]">Email</Label>
                  <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" autoFocus value={email}
                    onChange={(e) => { setEmail(e.target.value); if (noAccount) setNoAccount(null) }}
                    className={cn(inputClass, noAccount && "border-red-500 focus-visible:border-red-500 focus-visible:ring-red-500/10")}
                    aria-invalid={!!noAccount} aria-describedby={noAccount ? "email-error" : undefined}
                    placeholder="you@example.com" disabled={isLoading} />
                  {noAccount && (
                    <p id="email-error" className="text-[13px] text-red-600 pt-0.5">
                      No account found for this email.{" "}
                      <Link href={`/signup?email=${encodeURIComponent(noAccount)}`} className="text-black underline underline-offset-4 hover:text-neutral-600">Create a free account</Link>
                    </p>
                  )}
                </div>
                <Button type="submit" className={cn(authPrimaryButtonClass, isLoading && "opacity-70")} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Send code <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>}
                </Button>
              </motion.form>
            )}

            {mode === "otp" && codeSent && (
              <motion.div key="otp-code" className="space-y-5"
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <p className="text-[13px] text-neutral-600 leading-snug">
                  We sent a code to <span className="font-medium text-black">{email.trim()}</span>.{" "}
                  <button type="button" onClick={() => switchMode("otp")} className="text-black underline underline-offset-4 hover:text-neutral-600">Change email</button>
                </p>

                <div className="space-y-2">
                  <Label className="text-[13px] font-medium text-[#333]">Enter the 6-digit code</Label>
                  <OtpInput value={code} onChange={(v) => { setCode(v); if (codeStatus === "error") { setCodeStatus("idle"); setCodeError(null) } }} onComplete={verifyCode} disabled={isLoading || codeStatus === "success"} status={codeStatus} />
                  <div className="min-h-[18px]">
                    {codeError && <p className="text-[12px] text-red-600">{codeError}</p>}
                    {codeStatus === "success" && (
                      <p className="text-[12px] text-gold-deep inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Verified, signing you in</p>
                    )}
                  </div>
                </div>

                <Button type="button" onClick={() => verifyCode(code)} className={cn(authPrimaryButtonClass, (isLoading || code.length < 6) && "opacity-70")} disabled={isLoading || code.length < 6}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify and sign in <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>}
                </Button>

                <div className="flex items-center justify-between text-[13px]">
                  <button type="button" onClick={handleResend} disabled={resendIn > 0 || isLoading}
                    className={cn("font-medium underline underline-offset-4", resendIn > 0 ? "text-neutral-400 no-underline cursor-default" : "text-neutral-700 hover:text-black")}>
                    {resendIn > 0 ? `Resend code in ${resendIn}s` : "Resend code"}
                  </button>
                  <button type="button" onClick={() => switchMode("password")} className="text-neutral-500 hover:text-black underline underline-offset-4">
                    Use password instead
                  </button>
                </div>
              </motion.div>
            )}

            {mode === "password" && (
              <motion.form key="password" onSubmit={handlePasswordLogin} className="space-y-4" noValidate
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.2 }}>
                <div className="space-y-1.5">
                  <Label htmlFor="email-pw" className="text-[13px] font-medium text-[#333]">Email</Label>
                  <Input id="email-pw" name="email" type="email" autoComplete="email" inputMode="email" autoFocus value={email}
                    onChange={(e) => setEmail(e.target.value)} className={inputClass} placeholder="you@example.com" disabled={isLoading} />
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-[13px] font-medium text-[#333]">Password</Label>
                    <Link href="/forgot-password" className="text-[12px] text-[#666] hover:text-black transition-colors">Forgot password?</Link>
                  </div>
                  <div className="relative">
                    <Input id="password" name="password" type={showPassword ? "text" : "password"} autoComplete="current-password" value={password}
                      onChange={(e) => setPassword(e.target.value)} className={cn(inputClass, "pr-10")} disabled={isLoading} />
                    <button type="button" onClick={() => setShowPassword((s) => !s)} className="absolute inset-y-0 right-0 px-3.5 text-neutral-400 hover:text-black"
                      aria-label={showPassword ? "Hide password" : "Show password"} tabIndex={-1}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <Button type="submit" className={cn(authPrimaryButtonClass, isLoading && "opacity-70")} disabled={isLoading}>
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Sign in <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>}
                </Button>
              </motion.form>
            )}
          </AnimatePresence>

          <div className="my-5 flex items-center gap-3 w-full">
            <div className="h-px bg-[#E5E5E5] flex-1" />
            <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">or</span>
            <div className="h-px bg-[#E5E5E5] flex-1" />
          </div>

          <Button type="button" variant="outline" onClick={handleGoogleSignIn} className={authGoogleButtonClass}>
            <GoogleIcon /> Continue with Google
          </Button>
        </Reveal>
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
