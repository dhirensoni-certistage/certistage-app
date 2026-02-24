"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { Loader2, Mail, Crown, Zap, Building2, Star, CheckCircle2, ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const countryCodes = [
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+1", country: "US", name: "USA/Canada", flag: "🇺🇸" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [verificationLink, setVerificationLink] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState("+91")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    plan: "free"
  })

  React.useEffect(() => {
    const planParam = searchParams.get("plan")
    if (planParam && ["free", "professional", "enterprise", "premium"].includes(planParam)) {
      setFormData(prev => ({ ...prev, plan: planParam }))
    }
  }, [searchParams])

  const getPlanDetails = (plan: string) => {
    switch (plan) {
      case "professional":
        return { name: "Professional Plan", icon: Crown, color: "text-blue-500", desc: "For small events & workshops" }
      case "enterprise":
        return { name: "Enterprise Plan", icon: Building2, color: "text-purple-500", desc: "For growing organizations" }
      case "premium":
        return { name: "Premium", icon: Star, color: "text-amber-500", desc: "For large scale operations" }
      default:
        return { name: "Free Plan", icon: Zap, color: "text-neutral-500", desc: "Perfect for testing" }
    }
  }

  const selectedPlanInfo = getPlanDetails(formData.plan)
  const isPaidPlan = formData.plan !== "free"

  const handleGoogleSignIn = async () => {
    try {
      localStorage.removeItem("selectedPlan")
      if (formData.plan !== "free") {
        localStorage.setItem("selectedPlan", formData.plan)
      }
      await signIn("google", { callbackUrl: "/auth/callback", redirect: true })
    } catch (error) {
      toast.error("Failed to sign in with Google.")
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name || !formData.email || !formData.phone) {
      toast.error("Please fill all required fields")
      return
    }

    setIsSubmitting(true)
    try {
      const fullPhone = `${countryCode}${formData.phone}`
      const signupRes = await fetch("/api/client/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: fullPhone,
          organization: formData.organization,
          plan: formData.plan
        })
      })

      const signupData = await signupRes.json()
      if (!signupRes.ok) {
        toast.error(signupData.error || "Signup failed")
        setIsSubmitting(false)
        return
      }

      setVerificationLink(signupData.verificationLink)
      setIsSubmitted(true)
    } catch (error) {
      toast.error("Something went wrong.")
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-[#FDFDFD] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-12 px-6 rounded-sm border border-[#E5E5E5] text-center shadow-lg shadow-neutral-100/50">
            <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-neutral-50 mb-6 border border-neutral-100">
              <Mail className="h-8 w-8 text-neutral-600" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight text-black mb-2">Check your inbox</h2>
            <p className="text-[#666] mb-8 leading-relaxed text-sm">
              We've sent a verification link to<br /><strong className="text-black font-medium">{formData.email}</strong>
            </p>
            <Button asChild className="w-full h-10 bg-black text-white hover:bg-[#222]">
              <Link href="/client/login">Go to Login</Link>
            </Button>
            {verificationLink && (
              <div className="mt-8 p-4 bg-neutral-50 rounded-sm border border-neutral-200 text-xs text-left">
                <p className="mb-2 text-neutral-500 font-medium font-mono">DEV MODE:</p>
                <a href={verificationLink} className="text-blue-600 hover:underline break-all font-mono">{verificationLink}</a>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen w-full flex bg-[#FDFDFD] text-[hsl(240,4%,16%)]">

      {/* Left Panel - Visual & Brand (Matches Login) */}
      <div className="hidden lg:flex w-[55%] relative flex-col justify-between overflow-hidden bg-[#F5F5F7] border-r border-[#E5E5E5] p-16">

        {/* Subtle Grid Background */}
        <div className="absolute inset-0 z-0 opacity-[0.4]"
          style={{ backgroundImage: 'radial-gradient(#D4D4D4 1px, transparent 1px)', backgroundSize: '24px 24px' }}>
        </div>

        <div className="absolute top-8 left-8 z-20">
          <Link href="/" className="inline-flex items-center gap-2.5 hover:opacity-80 transition-opacity">
            <Image src="/Certistage_icon.svg" alt="CertiStage" width={36} height={36} className="w-9 h-9" />
            <span className="font-semibold tracking-tight text-xl text-black">CertiStage</span>
          </Link>
        </div>

        <div className="relative z-10 w-full max-w-xl mx-auto mt-12">
          {/* Animated Headline */}
          <div className="text-center mb-10">
            <h1 className="text-[32px] font-semibold tracking-tight leading-tight text-black mb-3">
              Start issuing verifiable <br /> digital credentials today.
            </h1>
            <p className="text-[15px] text-[#666] font-medium">Join 2,000+ organizations on the modern standard.</p>
          </div>

          {/* Simple Feature Grid Visual instead of Certificate (for variety) */}
          <div className="grid grid-cols-2 gap-4 max-w-[480px] mx-auto">
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E5] shadow-sm flex flex-col gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center text-blue-600 border border-blue-100">
                <Zap className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-black">Instant Issue</h3>
                <p className="text-xs text-[#666] mt-1 leading-relaxed">Generate thousands of certificates in seconds.</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-sm border border-[#E5E5E5] shadow-sm flex flex-col gap-3">
              <div className="w-8 h-8 rounded-full bg-neutral-50 flex items-center justify-center text-neutral-600 border border-neutral-100">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-semibold text-sm text-black">Bank-Grade</h3>
                <p className="text-xs text-[#666] mt-1 leading-relaxed">256-bit encryption and tamper-proof records.</p>
              </div>
            </div>
            <div className="col-span-2 bg-white p-6 rounded-sm border border-[#E5E5E5] shadow-sm flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-white bg-neutral-100 flex items-center justify-center text-[10px] text-neutral-500 font-medium">
                    U{i}
                  </div>
                ))}
              </div>
              <div className="text-xs text-[#666] font-medium">Trusted by leading teams worldwide.</div>
            </div>
          </div>
        </div>

        <div className="relative z-10 text-center">
          <p className="text-[11px] font-medium text-[#888] uppercase tracking-widest">No credit card required</p>
        </div>
      </div>

      {/* Right Panel - Auth Form */}
      <div className="flex-1 flex flex-col justify-center items-center p-8 bg-white overflow-y-auto">
        <div className="w-full max-w-[400px] space-y-8 py-8">
          <div className="text-center lg:text-left space-y-2">
            <h2 className="text-2xl font-semibold tracking-tight text-black">
              Create your account
            </h2>
            <p className="text-[14px] text-[#666]">
              Get started with CertiStage for free.
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
              Sign up with Google
            </Button>

            <div className="flex items-center gap-3 w-full">
              <div className="h-px bg-[#E5E5E5] flex-1" />
              <span className="text-[11px] font-medium text-[#999] uppercase tracking-wider">or email</span>
              <div className="h-px bg-[#E5E5E5] flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#333]">Full Name</Label>
                    <Input
                      className="h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                      placeholder="John Doe"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[13px] font-medium text-[#333]">Organization</Label>
                    <Input
                      className="h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                      placeholder="Acme Inc."
                      value={formData.organization}
                      onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#333]">Work Email</Label>
                  <Input
                    type="email"
                    className="h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                    placeholder="name@company.com"
                    required
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-[13px] font-medium text-[#333]">Phone Number</Label>
                  <div className="flex gap-2">
                    <Select value={countryCode} onValueChange={setCountryCode}>
                      <SelectTrigger className="w-[85px] h-9 text-[13px] border-[#E5E5E5] bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {countryCodes.map(c => (
                          <SelectItem key={c.code} value={c.code} className="text-sm">{c.flag} {c.code}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Input
                      className="flex-1 h-9 px-3 text-[14px] bg-white border-[#E5E5E5] focus-visible:ring-1 focus-visible:ring-black focus-visible:border-black transition-all placeholder:text-[#BBB]"
                      type="tel"
                      placeholder="9876543210"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    />
                  </div>
                </div>
              </div>

              <Button
                type="submit"
                className={cn(
                  "w-full h-10 mt-2 bg-black text-white hover:bg-[#222] transition-all font-medium text-[13px] shadow-sm flex items-center justify-center gap-2 group",
                  isSubmitting && "opacity-70"
                )}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Account"}
              </Button>

              <p className="text-[12px] text-center text-[#666] mt-4 leading-relaxed font-normal">
                By joining, you agree to our <Link href="/terms" className="text-black font-medium hover:underline">Terms</Link> and <Link href="/privacy" className="text-black font-medium hover:underline">Privacy Policy</Link>.
              </p>
            </form>
          </div>

          <p className="text-center text-[13px] text-[#666]">
            Already have an account?{" "}
            <Link href="/client/login" className="text-black font-medium hover:underline underline-offset-4">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-neutral-300" /></div>}>
      <SignupForm />
    </Suspense>
  )
}

