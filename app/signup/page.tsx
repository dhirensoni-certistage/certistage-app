"use client"

import React, { useState, Suspense } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { signIn } from "next-auth/react"
import { Loader2, Mail, Crown, Zap, Building2, Star } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

function SignupForm() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    plan: "free" // Initialize with default, update in useEffect
  })

  // Update plan from URL params after hydration
  React.useEffect(() => {
    const planParam = searchParams.get("plan")
    if (planParam && ["free", "professional", "enterprise", "premium"].includes(planParam)) {
      setFormData(prev => ({ ...prev, plan: planParam }))
    }

    // Check for OAuth errors
    const error = searchParams.get("error")
    if (error) {
      if (error === "AccessDenied") {
        toast.error("Google sign-in was cancelled. Please try again.")
      } else {
        toast.error(`Authentication error: ${error}`)
      }
    }
  }, [searchParams])

  const getPlanDisplayName = (plan: string) => {
    switch (plan) {
      case "professional": return "Professional Plan"
      case "enterprise": return "Enterprise Plan"
      case "premium": return "Premium Plan"
      default: return "Free Plan"
    }
  }

  const getPlanIcon = (plan: string) => {
    switch (plan) {
      case "professional": return <Crown className="h-4 w-4" />
      case "enterprise": return <Building2 className="h-4 w-4" />
      case "premium": return <Star className="h-4 w-4" />
      default: return <Zap className="h-4 w-4" />
    }
  }

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case "professional": return "from-blue-500 to-indigo-600"
      case "enterprise": return "from-purple-500 to-purple-700"
      case "premium": return "from-amber-500 to-orange-600"
      default: return "from-green-500 to-emerald-600"
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      // Store plan in localStorage temporarily for after OAuth
      if (formData.plan !== "free") {
        localStorage.setItem("selectedPlan", formData.plan)
      }
      
      // Redirect to Google OAuth
      await signIn("google", {
        callbackUrl: "/auth/callback",
        redirect: true
      })
    } catch (error) {
      console.error("Google sign-in error:", error)
      toast.error("Failed to sign in with Google. Please try again.")
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
      const signupRes = await fetch("/api/client/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
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

      toast.success("Verification email sent! Check your inbox.")
      setIsSubmitted(true)
      setIsSubmitting(false)
    } catch (error) {
      console.error("Signup error:", error)
      toast.error("Something went wrong. Please try again.")
      setIsSubmitting(false)
    }
  }

  if (isSubmitted) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="flex items-center justify-center px-4 py-12">
          <Card className="w-full max-w-md">
            <CardContent className="p-6 text-center">
              <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Mail className="h-6 w-6 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Check your email</h2>
              <p className="text-gray-600 mb-6">
                We sent a verification link to <strong>{formData.email}</strong>
              </p>
              
              <div className="space-y-3">
                <Button asChild className="w-full">
                  <Link href="/client/login">Go to Login</Link>
                </Button>
                <Button variant="outline" asChild className="w-full">
                  <Link href="/">Back to Home</Link>
                </Button>
              </div>
              
              <p className="text-sm text-gray-500 mt-6">
                Didn't receive the email?{' '}
                <button 
                  onClick={() => setIsSubmitted(false)} 
                  className="text-blue-600 hover:underline"
                >
                  Try again
                </button>
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="flex items-center justify-center px-4 py-12">
        <Card className="w-full max-w-md">
          <CardContent className="p-6">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-gray-900 mb-2">Create your account</h1>
              <p className="text-gray-600">Get started with CertiStage today</p>
              {formData.plan !== "free" && (
                <div className={`mt-4 relative overflow-hidden rounded-lg bg-gradient-to-r ${getPlanColor(formData.plan)} p-[2px]`}>
                  <div className="bg-white rounded-lg px-4 py-3">
                    <div className="flex items-center justify-center gap-2">
                      <div className={`bg-gradient-to-r ${getPlanColor(formData.plan)} p-1.5 rounded-md text-white`}>
                        {getPlanIcon(formData.plan)}
                      </div>
                      <span className="font-semibold text-gray-900">
                        {getPlanDisplayName(formData.plan)}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      You'll be enrolled in this plan after signup
                    </p>
                  </div>
                </div>
              )}
            </div>

            <Button
              type="button"
              variant="outline"
              className="w-full mb-4 hover:bg-gray-50 transition-colors"
              onClick={handleGoogleSignIn}
            >
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </Button>
            
            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" suppressHydrationWarning>
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  autoComplete="name"
                  placeholder="Enter your full name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  suppressHydrationWarning
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="Enter your phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organization">Organization (Optional)</Label>
                <Input
                  id="organization"
                  name="organization"
                  autoComplete="organization"
                  placeholder="Enter your organization"
                  value={formData.organization}
                  onChange={(e) => setFormData({ ...formData, organization: e.target.value })}
                  suppressHydrationWarning
                />
              </div>

              <Button 
                type="submit" 
                className="w-full" 
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-600 mt-4">
              Already have an account?{' '}
              <Link href="/client/login" className="text-blue-600 hover:underline">
                Sign in
              </Link>
            </p>

            <p className="text-center text-xs text-gray-500 mt-4">
              By creating an account, you agree to our{' '}
              <Link href="/terms" className="text-blue-600 hover:underline">Terms</Link>
              {' '}and{' '}
              <Link href="/privacy" className="text-blue-600 hover:underline">Privacy Policy</Link>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

function Header() {
  return (
    <header className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Image src="/Certistage_icon.svg" alt="CertiStage" width={24} height={24} />
          <span className="font-semibold text-lg text-gray-900">
            CertiStage
          </span>
        </Link>
        <Link href="/" className="text-sm text-gray-600 hover:text-gray-900">
          Back to Home
        </Link>
      </div>
    </header>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-600" />
      </div>
    }>
      <SignupForm />
    </Suspense>
  )
}