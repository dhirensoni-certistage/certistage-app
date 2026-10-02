"use client"

import React, { useEffect, useMemo, useState, Suspense } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import Link from "next/link"
import { signIn } from "next-auth/react"
import { Loader2, Crown, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { usePlanConfig } from "@/hooks/use-plan-config"
import { formatInr } from "@/lib/plan-config"
import { AuthSidePanel, AuthMobileBar, authInputClass, authPrimaryButtonClass, authGoogleButtonClass } from "@/components/landing/auth-side-panel"
import { Reveal } from "@/components/landing/reveal"
import { OtpInput } from "@/components/landing/otp-input"
import { ArrowRight } from "lucide-react"

const RESEND_SECONDS = 30

// Plain text labels: flag emoji render as letters on Windows
const countryCodes = [
  { code: "+91", country: "India" },
  { code: "+1", country: "USA" },
  { code: "+44", country: "UK" },
  { code: "+971", country: "UAE" }
]

const inputClass = authInputClass

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

function SignupForm() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { plans } = usePlanConfig()

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)
  const [code, setCode] = useState("")
  const [codeStatus, setCodeStatus] = useState<"idle" | "error" | "success">("idle")
  const [codeError, setCodeError] = useState<string | null>(null)
  const [isVerifying, setIsVerifying] = useState(false)
  const [countryCode, setCountryCode] = useState("+91")
  const [formData, setFormData] = useState({ name: "", email: "", phone: "", organization: "", plan: "free" })

  // Email carried over from the login page ("no account found")
  useEffect(() => {
    const emailParam = searchParams.get("email")
    if (emailParam) setFormData((prev) => ({ ...prev, email: emailParam }))
  }, [searchParams])

  // Plan chosen on the pricing page, if any
  useEffect(() => {
    const planParam = searchParams.get("plan")
    if (!planParam) return
    const match = plans.find((p) => p.id === planParam && p.enabled !== false)
    if (match) setFormData((prev) => ({ ...prev, plan: match.id }))
  }, [searchParams, plans])

  useEffect(() => {
    if (resendCooldown <= 0) return
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000)
    return () => clearTimeout(t)
  }, [resendCooldown])

  const selectedPlan = useMemo(() => plans.find((p) => p.id === formData.plan) || null, [plans, formData.plan])
  const isPaidPlan = !!selectedPlan && selectedPlan.price > 0

  const handleGoogleSignIn = async () => {
    try {
      localStorage.removeItem("selectedPlan")
      if (isPaidPlan) localStorage.setItem("selectedPlan", formData.plan)
      await signIn("google", { callbackUrl: "/auth/callback", redirect: true })
    } catch {
      toast.error("Could not start Google sign-in. Please try again.")
    }
  }

  const submitSignup = async (): Promise<boolean> => {
    const res = await fetch("/api/client/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: formData.name.trim(),
        email: formData.email.trim(),
        phone: `${countryCode}${formData.phone}`,
        organization: formData.organization.trim(),
        plan: formData.plan
      })
    })
    const data = await res.json().catch(() => ({}))
    if (res.status === 409) {
      toast.error("This email already has an account.", {
        action: { label: "Log in", onClick: () => router.push(`/client/login?email=${encodeURIComponent(formData.email.trim())}`) }
      })
      return false
    }
    if (!res.ok) {
      toast.error(data.error || "Signup failed. Please try again.")
      return false
    }
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim() || !formData.email.trim() || !formData.phone) {
      toast.error("Please fill in your name, email and phone number")
      return
    }
    setIsSubmitting(true)
    try {
      if (await submitSignup()) {
        setIsSubmitted(true)
        setCode("")
        setCodeStatus("idle")
        setCodeError(null)
        setResendCooldown(RESEND_SECONDS)
      }
    } catch {
      toast.error("Something went wrong. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setIsSubmitting(true)
    try {
      if (await submitSignup()) {
        toast.success("A new code is on its way")
        setCode("")
        setCodeStatus("idle")
        setCodeError(null)
        setResendCooldown(RESEND_SECONDS)
      }
    } catch {
      toast.error("Could not resend. Please try again.")
    } finally {
      setIsSubmitting(false)
    }
  }

  const verifyCode = async (value: string) => {
    if (value.length < 6 || isVerifying) return
    setIsVerifying(true)
    setCodeError(null)
    try {
      const res = await fetch("/api/client/auth/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email.trim(), code: value })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setCodeStatus("error")
        setCodeError(data.error || "Incorrect code")
        if (data.expired) setCode("")
        if (res.status === 409) {
          toast.error("This email already has an account.", {
            action: { label: "Log in", onClick: () => router.push(`/client/login?email=${encodeURIComponent(formData.email.trim())}`) }
          })
        }
        setIsVerifying(false)
        return
      }
      setCodeStatus("success")
      localStorage.setItem("clientSession", JSON.stringify({
        loginType: "user",
        userId: data.user.id,
        userName: data.user.name,
        userEmail: data.user.email,
        userPhone: data.user.phone,
        userPlan: data.user.plan,
        pendingPlan: data.pendingPlan || null,
        loggedInAt: new Date().toISOString()
      }))
      if (data.pendingPlan) {
        toast.success("Account created. Complete your payment to activate the plan.")
        router.push("/client/complete-payment")
      } else {
        toast.success(`Welcome to CertiStage, ${data.user.name}!`)
        router.push("/client/events")
      }
    } catch {
      setIsVerifying(false)
      toast.error("Connection failed. Please try again.")
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">
        <AuthSidePanel
          headline="Certificates for your next event, batch or convocation."
          footnote="No credit card required. Free plan includes 50 certificates."
        />
        <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 bg-white overflow-y-auto">
          <Reveal className="w-full max-w-[420px]" y={14}>
            <AuthMobileBar linkLabel="Log in" linkHref="/client/login" />

            <h2 className="text-[26px] font-semibold tracking-tight text-black">Verify your email</h2>
            <p className="text-[13px] text-neutral-600 leading-snug mt-2">
              We sent a 6-digit code to <span className="font-medium text-black">{formData.email.trim()}</span>.{" "}
              <button type="button" onClick={() => setIsSubmitted(false)} className="text-black underline underline-offset-4 hover:text-neutral-600">Edit details</button>
            </p>

            <div className="space-y-2 mt-6">
              <Label className="text-[13px] font-medium text-[#333]">Enter the code</Label>
              <OtpInput
                value={code}
                onChange={(v) => { setCode(v); if (codeStatus === "error") { setCodeStatus("idle"); setCodeError(null) } }}
                onComplete={verifyCode}
                disabled={isVerifying || codeStatus === "success"}
                status={codeStatus}
              />
              <div className="min-h-[18px]">
                {codeError && <p className="text-[12px] text-red-600">{codeError}</p>}
                {codeStatus === "success" && (
                  <p className="text-[12px] text-gold-deep inline-flex items-center gap-1"><Check className="h-3.5 w-3.5" /> Verified, setting up your account</p>
                )}
              </div>
            </div>

            <Button type="button" onClick={() => verifyCode(code)} className={cn(authPrimaryButtonClass, "mt-3", (isVerifying || code.length < 6) && "opacity-70")} disabled={isVerifying || code.length < 6}>
              {isVerifying ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Verify and continue <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>}
            </Button>

            <div className="flex items-center justify-between text-[13px] mt-4">
              <button type="button" onClick={handleResend} disabled={resendCooldown > 0 || isSubmitting || isVerifying}
                className={cn("font-medium underline underline-offset-4", resendCooldown > 0 ? "text-neutral-400 no-underline cursor-default" : "text-neutral-700 hover:text-black")}>
                {isSubmitting ? "Sending..." : resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : "Resend code"}
              </button>
              <span className="text-neutral-500">Not in your inbox? Check spam.</span>
            </div>

            {isPaidPlan && selectedPlan && (
              <p className="mt-6 text-[12px] text-neutral-500">
                Your {selectedPlan.name} plan ({formatInr(selectedPlan.price)}/year) is saved. Payment comes right after verification.
              </p>
            )}
          </Reveal>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">
      <AuthSidePanel
        headline="Certificates for your next event, batch or convocation."
        footnote="No credit card required. Free plan includes 50 certificates."
      />

      <div className="flex-1 flex flex-col justify-center items-center p-6 sm:p-8 bg-white overflow-y-auto">
        <Reveal className="w-full max-w-[420px]" y={14}>
          <AuthMobileBar linkLabel="Log in" linkHref="/client/login" />

          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="space-y-1.5">
              <h2 className="text-[26px] font-semibold tracking-tight text-black">Create your account</h2>
              <p className="text-[14px] text-[#666]">Start free. No credit card needed.</p>
            </div>
            <Link href="/client/login" className="hidden lg:inline-block mt-2 text-[13px] font-medium text-neutral-600 hover:text-black whitespace-nowrap underline underline-offset-4">
              Log in
            </Link>
          </div>

          {isPaidPlan && selectedPlan && (
            <div className="mb-5 rounded-xl border border-neutral-200 bg-white shadow-sm overflow-hidden">
              <div className="h-0.5 bg-gradient-to-r from-gold via-gold-light to-gold" />
              <div className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-neutral-500">Selected plan</span>
                  <Link href="/#pricing" className="text-[12px] font-medium text-neutral-600 hover:text-black underline underline-offset-4">
                    Change
                  </Link>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="h-8 w-8 rounded-full bg-gold-soft border border-gold/30 flex items-center justify-center shrink-0">
                      <Crown className="h-4 w-4 text-gold-deep" />
                    </span>
                    <span className="text-[15px] font-semibold text-black truncate">{selectedPlan.name}</span>
                  </div>
                  <div className="text-right shrink-0 leading-tight">
                    <div><span className="text-[15px] font-semibold text-black">{formatInr(selectedPlan.price)}</span><span className="text-[12px] text-neutral-500"> / year</span></div>
                    <div className="text-[11px] text-neutral-500">billed after verification</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div className="space-y-4">
            <Button type="button" variant="outline" onClick={handleGoogleSignIn} className={authGoogleButtonClass}>
              <GoogleIcon /> Continue with Google
            </Button>

            <div className="flex items-center gap-3 w-full">
              <div className="h-px bg-[#E5E5E5] flex-1" />
              <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">or with email</span>
              <div className="h-px bg-[#E5E5E5] flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5" noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-[13px] font-medium text-[#333]">Full name</Label>
                <Input id="name" name="name" autoComplete="name" className={inputClass} placeholder="Your name" required value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-[13px] font-medium text-[#333]">Email</Label>
                <Input id="email" name="email" type="email" autoComplete="email" inputMode="email" className={inputClass} placeholder="you@example.com" required value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-[13px] font-medium text-[#333]">Phone number</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[128px] shrink-0 !h-11 rounded-lg text-[14px] border-neutral-200 bg-white shadow-none focus:ring-2 focus:ring-gold/30 focus:border-gold" aria-label="Country code">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((c) => (
                        <SelectItem key={c.code} value={c.code} className="text-sm">
                          <span className="font-medium">{c.code}</span> <span className="text-neutral-500">{c.country}</span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input id="phone" name="phone" type="tel" autoComplete="tel-national" inputMode="numeric" className={cn(inputClass, "flex-1")} placeholder="98XXX XXXXX" required value={formData.phone} onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 15) })} />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="organization" className="text-[13px] font-medium text-[#333]">
                  Organization <span className="text-[#999] font-normal">(optional)</span>
                </Label>
                <Input id="organization" name="organization" autoComplete="organization" className={inputClass} placeholder="College, company or event name" value={formData.organization} onChange={(e) => setFormData({ ...formData, organization: e.target.value })} />
              </div>

              <Button type="submit" className={cn(authPrimaryButtonClass, "mt-1", isSubmitting && "opacity-70")} disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <>Create account <ArrowRight className="h-4 w-4 ml-1.5 transition-transform duration-200 group-hover:translate-x-1" /></>}
              </Button>

              <p className="text-[12px] text-center text-[#666] leading-snug pt-1">
                By creating an account you agree to our <Link href="/terms" className="text-black font-medium hover:underline">Terms</Link> and <Link href="/privacy" className="text-black font-medium hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>

        </Reveal>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-300" /></div>}>
      <SignupForm />
    </Suspense>
  )
}
