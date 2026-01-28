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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

// All countries with their codes and flags
const countryCodes = [
  { code: "+93", country: "AF", name: "Afghanistan", flag: "🇦🇫" },
  { code: "+355", country: "AL", name: "Albania", flag: "🇦🇱" },
  { code: "+213", country: "DZ", name: "Algeria", flag: "🇩🇿" },
  { code: "+376", country: "AD", name: "Andorra", flag: "🇦🇩" },
  { code: "+244", country: "AO", name: "Angola", flag: "🇦🇴" },
  { code: "+54", country: "AR", name: "Argentina", flag: "🇦🇷" },
  { code: "+374", country: "AM", name: "Armenia", flag: "🇦🇲" },
  { code: "+61", country: "AU", name: "Australia", flag: "🇦🇺" },
  { code: "+43", country: "AT", name: "Austria", flag: "🇦🇹" },
  { code: "+994", country: "AZ", name: "Azerbaijan", flag: "🇦🇿" },
  { code: "+973", country: "BH", name: "Bahrain", flag: "🇧🇭" },
  { code: "+880", country: "BD", name: "Bangladesh", flag: "🇧🇩" },
  { code: "+375", country: "BY", name: "Belarus", flag: "🇧🇾" },
  { code: "+32", country: "BE", name: "Belgium", flag: "🇧🇪" },
  { code: "+501", country: "BZ", name: "Belize", flag: "🇧🇿" },
  { code: "+229", country: "BJ", name: "Benin", flag: "🇧🇯" },
  { code: "+975", country: "BT", name: "Bhutan", flag: "🇧🇹" },
  { code: "+591", country: "BO", name: "Bolivia", flag: "🇧🇴" },
  { code: "+387", country: "BA", name: "Bosnia", flag: "🇧🇦" },
  { code: "+267", country: "BW", name: "Botswana", flag: "🇧🇼" },
  { code: "+55", country: "BR", name: "Brazil", flag: "🇧🇷" },
  { code: "+673", country: "BN", name: "Brunei", flag: "🇧🇳" },
  { code: "+359", country: "BG", name: "Bulgaria", flag: "🇧🇬" },
  { code: "+226", country: "BF", name: "Burkina Faso", flag: "🇧🇫" },
  { code: "+257", country: "BI", name: "Burundi", flag: "🇧🇮" },
  { code: "+855", country: "KH", name: "Cambodia", flag: "🇰🇭" },
  { code: "+237", country: "CM", name: "Cameroon", flag: "🇨🇲" },
  { code: "+238", country: "CV", name: "Cape Verde", flag: "🇨🇻" },
  { code: "+236", country: "CF", name: "Central African Republic", flag: "🇨🇫" },
  { code: "+235", country: "TD", name: "Chad", flag: "🇹🇩" },
  { code: "+56", country: "CL", name: "Chile", flag: "🇨🇱" },
  { code: "+86", country: "CN", name: "China", flag: "🇨🇳" },
  { code: "+57", country: "CO", name: "Colombia", flag: "🇨🇴" },
  { code: "+269", country: "KM", name: "Comoros", flag: "🇰🇲" },
  { code: "+242", country: "CG", name: "Congo", flag: "🇨🇬" },
  { code: "+506", country: "CR", name: "Costa Rica", flag: "🇨🇷" },
  { code: "+385", country: "HR", name: "Croatia", flag: "🇭🇷" },
  { code: "+53", country: "CU", name: "Cuba", flag: "🇨🇺" },
  { code: "+357", country: "CY", name: "Cyprus", flag: "🇨🇾" },
  { code: "+420", country: "CZ", name: "Czech Republic", flag: "🇨🇿" },
  { code: "+45", country: "DK", name: "Denmark", flag: "🇩🇰" },
  { code: "+253", country: "DJ", name: "Djibouti", flag: "🇩🇯" },
  { code: "+593", country: "EC", name: "Ecuador", flag: "🇪🇨" },
  { code: "+20", country: "EG", name: "Egypt", flag: "🇪🇬" },
  { code: "+503", country: "SV", name: "El Salvador", flag: "🇸🇻" },
  { code: "+240", country: "GQ", name: "Equatorial Guinea", flag: "🇬🇶" },
  { code: "+291", country: "ER", name: "Eritrea", flag: "🇪🇷" },
  { code: "+372", country: "EE", name: "Estonia", flag: "🇪🇪" },
  { code: "+251", country: "ET", name: "Ethiopia", flag: "🇪🇹" },
  { code: "+679", country: "FJ", name: "Fiji", flag: "🇫🇯" },
  { code: "+358", country: "FI", name: "Finland", flag: "🇫🇮" },
  { code: "+33", country: "FR", name: "France", flag: "🇫🇷" },
  { code: "+241", country: "GA", name: "Gabon", flag: "🇬🇦" },
  { code: "+220", country: "GM", name: "Gambia", flag: "🇬🇲" },
  { code: "+995", country: "GE", name: "Georgia", flag: "🇬🇪" },
  { code: "+49", country: "DE", name: "Germany", flag: "🇩🇪" },
  { code: "+233", country: "GH", name: "Ghana", flag: "🇬🇭" },
  { code: "+30", country: "GR", name: "Greece", flag: "🇬🇷" },
  { code: "+502", country: "GT", name: "Guatemala", flag: "🇬🇹" },
  { code: "+224", country: "GN", name: "Guinea", flag: "🇬🇳" },
  { code: "+245", country: "GW", name: "Guinea-Bissau", flag: "🇬🇼" },
  { code: "+592", country: "GY", name: "Guyana", flag: "🇬🇾" },
  { code: "+509", country: "HT", name: "Haiti", flag: "🇭🇹" },
  { code: "+504", country: "HN", name: "Honduras", flag: "🇭🇳" },
  { code: "+852", country: "HK", name: "Hong Kong", flag: "🇭🇰" },
  { code: "+36", country: "HU", name: "Hungary", flag: "🇭🇺" },
  { code: "+354", country: "IS", name: "Iceland", flag: "🇮🇸" },
  { code: "+91", country: "IN", name: "India", flag: "🇮🇳" },
  { code: "+62", country: "ID", name: "Indonesia", flag: "🇮🇩" },
  { code: "+98", country: "IR", name: "Iran", flag: "🇮🇷" },
  { code: "+964", country: "IQ", name: "Iraq", flag: "🇮🇶" },
  { code: "+353", country: "IE", name: "Ireland", flag: "🇮🇪" },
  { code: "+972", country: "IL", name: "Israel", flag: "🇮🇱" },
  { code: "+39", country: "IT", name: "Italy", flag: "🇮🇹" },
  { code: "+225", country: "CI", name: "Ivory Coast", flag: "🇨🇮" },
  { code: "+81", country: "JP", name: "Japan", flag: "🇯🇵" },
  { code: "+962", country: "JO", name: "Jordan", flag: "🇯🇴" },
  { code: "+7", country: "KZ", name: "Kazakhstan/Russia", flag: "🇰🇿" },
  { code: "+254", country: "KE", name: "Kenya", flag: "🇰🇪" },
  { code: "+965", country: "KW", name: "Kuwait", flag: "🇰🇼" },
  { code: "+996", country: "KG", name: "Kyrgyzstan", flag: "🇰🇬" },
  { code: "+856", country: "LA", name: "Laos", flag: "🇱🇦" },
  { code: "+371", country: "LV", name: "Latvia", flag: "🇱🇻" },
  { code: "+961", country: "LB", name: "Lebanon", flag: "🇱🇧" },
  { code: "+266", country: "LS", name: "Lesotho", flag: "🇱🇸" },
  { code: "+231", country: "LR", name: "Liberia", flag: "🇱🇷" },
  { code: "+218", country: "LY", name: "Libya", flag: "🇱🇾" },
  { code: "+423", country: "LI", name: "Liechtenstein", flag: "🇱🇮" },
  { code: "+370", country: "LT", name: "Lithuania", flag: "🇱🇹" },
  { code: "+352", country: "LU", name: "Luxembourg", flag: "🇱🇺" },
  { code: "+853", country: "MO", name: "Macau", flag: "🇲🇴" },
  { code: "+389", country: "MK", name: "Macedonia", flag: "🇲🇰" },
  { code: "+261", country: "MG", name: "Madagascar", flag: "🇲🇬" },
  { code: "+265", country: "MW", name: "Malawi", flag: "🇲🇼" },
  { code: "+60", country: "MY", name: "Malaysia", flag: "🇲🇾" },
  { code: "+960", country: "MV", name: "Maldives", flag: "🇲🇻" },
  { code: "+223", country: "ML", name: "Mali", flag: "🇲🇱" },
  { code: "+356", country: "MT", name: "Malta", flag: "🇲🇹" },
  { code: "+222", country: "MR", name: "Mauritania", flag: "🇲🇷" },
  { code: "+230", country: "MU", name: "Mauritius", flag: "🇲🇺" },
  { code: "+52", country: "MX", name: "Mexico", flag: "🇲🇽" },
  { code: "+373", country: "MD", name: "Moldova", flag: "🇲🇩" },
  { code: "+377", country: "MC", name: "Monaco", flag: "🇲🇨" },
  { code: "+976", country: "MN", name: "Mongolia", flag: "🇲🇳" },
  { code: "+382", country: "ME", name: "Montenegro", flag: "🇲🇪" },
  { code: "+212", country: "MA", name: "Morocco", flag: "🇲🇦" },
  { code: "+258", country: "MZ", name: "Mozambique", flag: "🇲🇿" },
  { code: "+95", country: "MM", name: "Myanmar", flag: "🇲🇲" },
  { code: "+264", country: "NA", name: "Namibia", flag: "🇳🇦" },
  { code: "+977", country: "NP", name: "Nepal", flag: "🇳🇵" },
  { code: "+31", country: "NL", name: "Netherlands", flag: "🇳🇱" },
  { code: "+64", country: "NZ", name: "New Zealand", flag: "🇳🇿" },
  { code: "+505", country: "NI", name: "Nicaragua", flag: "🇳🇮" },
  { code: "+227", country: "NE", name: "Niger", flag: "🇳🇪" },
  { code: "+234", country: "NG", name: "Nigeria", flag: "🇳🇬" },
  { code: "+850", country: "KP", name: "North Korea", flag: "🇰🇵" },
  { code: "+47", country: "NO", name: "Norway", flag: "🇳🇴" },
  { code: "+968", country: "OM", name: "Oman", flag: "🇴🇲" },
  { code: "+92", country: "PK", name: "Pakistan", flag: "🇵🇰" },
  { code: "+970", country: "PS", name: "Palestine", flag: "🇵🇸" },
  { code: "+507", country: "PA", name: "Panama", flag: "🇵🇦" },
  { code: "+675", country: "PG", name: "Papua New Guinea", flag: "🇵🇬" },
  { code: "+595", country: "PY", name: "Paraguay", flag: "🇵🇾" },
  { code: "+51", country: "PE", name: "Peru", flag: "🇵🇪" },
  { code: "+63", country: "PH", name: "Philippines", flag: "🇵🇭" },
  { code: "+48", country: "PL", name: "Poland", flag: "🇵🇱" },
  { code: "+351", country: "PT", name: "Portugal", flag: "🇵🇹" },
  { code: "+974", country: "QA", name: "Qatar", flag: "🇶🇦" },
  { code: "+40", country: "RO", name: "Romania", flag: "🇷🇴" },
  { code: "+250", country: "RW", name: "Rwanda", flag: "🇷🇼" },
  { code: "+966", country: "SA", name: "Saudi Arabia", flag: "🇸🇦" },
  { code: "+221", country: "SN", name: "Senegal", flag: "🇸🇳" },
  { code: "+381", country: "RS", name: "Serbia", flag: "🇷🇸" },
  { code: "+248", country: "SC", name: "Seychelles", flag: "🇸🇨" },
  { code: "+232", country: "SL", name: "Sierra Leone", flag: "🇸🇱" },
  { code: "+65", country: "SG", name: "Singapore", flag: "🇸🇬" },
  { code: "+421", country: "SK", name: "Slovakia", flag: "🇸🇰" },
  { code: "+386", country: "SI", name: "Slovenia", flag: "🇸🇮" },
  { code: "+252", country: "SO", name: "Somalia", flag: "🇸🇴" },
  { code: "+27", country: "ZA", name: "South Africa", flag: "🇿🇦" },
  { code: "+82", country: "KR", name: "South Korea", flag: "🇰🇷" },
  { code: "+211", country: "SS", name: "South Sudan", flag: "🇸🇸" },
  { code: "+34", country: "ES", name: "Spain", flag: "🇪🇸" },
  { code: "+94", country: "LK", name: "Sri Lanka", flag: "🇱🇰" },
  { code: "+249", country: "SD", name: "Sudan", flag: "🇸🇩" },
  { code: "+597", country: "SR", name: "Suriname", flag: "🇸🇷" },
  { code: "+268", country: "SZ", name: "Swaziland", flag: "🇸🇿" },
  { code: "+46", country: "SE", name: "Sweden", flag: "🇸🇪" },
  { code: "+41", country: "CH", name: "Switzerland", flag: "🇨🇭" },
  { code: "+963", country: "SY", name: "Syria", flag: "🇸🇾" },
  { code: "+886", country: "TW", name: "Taiwan", flag: "🇹🇼" },
  { code: "+992", country: "TJ", name: "Tajikistan", flag: "🇹🇯" },
  { code: "+255", country: "TZ", name: "Tanzania", flag: "🇹🇿" },
  { code: "+66", country: "TH", name: "Thailand", flag: "🇹🇭" },
  { code: "+228", country: "TG", name: "Togo", flag: "🇹🇬" },
  { code: "+216", country: "TN", name: "Tunisia", flag: "🇹🇳" },
  { code: "+90", country: "TR", name: "Turkey", flag: "🇹🇷" },
  { code: "+993", country: "TM", name: "Turkmenistan", flag: "🇹🇲" },
  { code: "+256", country: "UG", name: "Uganda", flag: "🇺🇬" },
  { code: "+380", country: "UA", name: "Ukraine", flag: "🇺🇦" },
  { code: "+971", country: "AE", name: "UAE", flag: "🇦🇪" },
  { code: "+44", country: "GB", name: "United Kingdom", flag: "🇬🇧" },
  { code: "+1", country: "US", name: "USA/Canada", flag: "🇺�" }, 
  { code: "+598", country: "UY", name: "Uruguay", flag: "🇺🇾" },
  { code: "+998", country: "UZ", name: "Uzbekistan", flag: "🇺🇿" },
  { code: "+678", country: "VU", name: "Vanuatu", flag: "🇻🇺" },
  { code: "+58", country: "VE", name: "Venezuela", flag: "🇻🇪" },
  { code: "+84", country: "VN", name: "Vietnam", flag: "🇻🇳" },
  { code: "+967", country: "YE", name: "Yemen", flag: "🇾🇪" },
  { code: "+260", country: "ZM", name: "Zambia", flag: "🇿🇲" },
  { code: "+263", country: "ZW", name: "Zimbabwe", flag: "🇿🇼" },
]

function SignupForm() {
  const searchParams = useSearchParams()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [verificationLink, setVerificationLink] = useState<string | null>(null)
  const [countryCode, setCountryCode] = useState("+91") // Default to India
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    plan: "free" // Initialize with default, update in useEffect
  })

  // Auto-detect country code based on timezone/locale
  React.useEffect(() => {
    try {
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone
      if (timezone.includes("Asia/Kolkata") || timezone.includes("Asia/Calcutta")) {
        setCountryCode("+91")
      } else if (timezone.includes("America")) {
        setCountryCode("+1")
      } else if (timezone.includes("Europe/London")) {
        setCountryCode("+44")
      } else if (timezone.includes("Asia/Dubai")) {
        setCountryCode("+971")
      } else if (timezone.includes("Asia/Singapore")) {
        setCountryCode("+65")
      }
    } catch (error) {
      // Keep default +91
    }
  }, [])

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
      // Clear any previous plan selection first
      localStorage.removeItem("selectedPlan")
      
      // Store plan in localStorage temporarily for after OAuth (only for paid plans)
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

    // Validate phone number (basic validation)
    const phoneRegex = /^[0-9]{7,15}$/
    if (!phoneRegex.test(formData.phone)) {
      toast.error("Please enter a valid phone number (7-15 digits)")
      return
    }

    // Combine country code with phone number
    const fullPhone = `${countryCode}${formData.phone}`

    setIsSubmitting(true)
    
    try {
      const signupRes = await fetch("/api/client/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: fullPhone, // Send with country code
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
      if (signupData.verificationLink) {
        setVerificationLink(signupData.verificationLink)
      }
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
              
              {verificationLink && (
                <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <p className="text-sm text-yellow-800 mb-2">
                    Email not received? Click below to verify directly:
                  </p>
                  <Button asChild variant="outline" size="sm" className="w-full">
                    <a href={verificationLink}>Verify Email Now</a>
                  </Button>
                </div>
              )}
              
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
                <Label htmlFor="name">Full Name *</Label>
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
                <Label htmlFor="email">Email *</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="your.email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                  suppressHydrationWarning
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone Number *</Label>
                <div className="flex gap-2">
                  <Select value={countryCode} onValueChange={setCountryCode}>
                    <SelectTrigger className="w-[140px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {countryCodes.map((country, index) => (
                        <SelectItem key={`${country.code}-${country.country}-${index}`} value={country.code}>
                          <span className="flex items-center gap-2">
                            <span className="text-lg">{country.flag}</span>
                            {country.code}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    id="phone"
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    placeholder="9876543210"
                    value={formData.phone}
                    onChange={(e) => {
                      // Only allow numbers
                      const value = e.target.value.replace(/\D/g, '')
                      setFormData({ ...formData, phone: value })
                    }}
                    maxLength={15}
                    required
                    suppressHydrationWarning
                    className="flex-1"
                  />
                </div>
                <p className="text-xs text-gray-500">
                  Enter your phone number without country code
                </p>
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