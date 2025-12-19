"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { CheckCircle, AlertCircle, Loader2, Eye, EyeOff, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { toast } from "sonner"

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')
  
  const [isVerifying, setIsVerifying] = useState(true)
  const [verificationStatus, setVerificationStatus] = useState<'loading' | 'success' | 'error' | 'expired'>('loading')
  const [userData, setUserData] = useState<any>(null)
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [isSettingPassword, setIsSettingPassword] = useState(false)

  useEffect(() => {
    if (!token) {
      setVerificationStatus('error')
      setIsVerifying(false)
      return
    }

    verifyToken()
  }, [token])

  const verifyToken = async () => {
    try {
      const res = await fetch('/api/client/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })

      const data = await res.json()

      if (res.ok) {
        setVerificationStatus('success')
        setUserData(data.userData)
      } else {
        setVerificationStatus(data.error === 'Token expired' ? 'expired' : 'error')
      }
    } catch (error) {
      console.error('Verification error:', error)
      setVerificationStatus('error')
    }
    
    setIsVerifying(false)
  }

  const handleSetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!password || !confirmPassword) {
      toast.error("Please fill in both password fields")
      return
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters")
      return
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match")
      return
    }

    setIsSettingPassword(true)

    try {
      const res = await fetch('/api/client/auth/complete-signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })

      const data = await res.json()

      if (res.ok && data.user) {
        // Auto-login: Create session immediately after signup
        const session = {
          loginType: "user",
          userId: data.user.id,
          userName: data.user.name,
          userEmail: data.user.email,
          userPhone: data.user.phone,
          userPlan: data.user.plan,
          pendingPlan: data.pendingPlan || null,
          loggedInAt: new Date().toISOString()
        }
        localStorage.setItem("clientSession", JSON.stringify(session))
        
        // Redirect based on plan type
        if (data.pendingPlan) {
          // Paid plan selected - go to payment page
          toast.success("Account created! Complete your payment to activate your plan.")
          router.push('/client/complete-payment')
        } else {
          // Free plan - go directly to events/dashboard
          toast.success(`Welcome to CertiStage, ${data.user.name}! 🎉`)
          router.push('/client/events')
        }
      } else {
        toast.error(data.error || "Failed to create account")
      }
    } catch (error) {
      console.error('Password setup error:', error)
      toast.error("Something went wrong. Please try again.")
    }

    setIsSettingPassword(false)
  }

  if (isVerifying) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
            <h2 className="text-xl font-semibold mb-2">Verifying Email...</h2>
            <p className="text-muted-foreground">Please wait while we verify your email address.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {verificationStatus === 'success' ? (
            <>
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl">Email Verified!</CardTitle>
              <CardDescription>
                Now set your password to complete your registration
              </CardDescription>
            </>
          ) : (
            <>
              <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
              <CardTitle className="text-2xl">
                {verificationStatus === 'expired' ? 'Link Expired' : 'Verification Failed'}
              </CardTitle>
              <CardDescription>
                {verificationStatus === 'expired' 
                  ? 'Your verification link has expired. Please request a new one.'
                  : 'The verification link is invalid or has already been used.'
                }
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {verificationStatus === 'success' && userData ? (
            <div>
              {/* User Info Display */}
              <div className="bg-muted/50 p-4 rounded-lg mb-6">
                <h3 className="font-medium mb-2">Account Details:</h3>
                <p className="text-sm text-muted-foreground">Name: {userData.name}</p>
                <p className="text-sm text-muted-foreground">Email: {userData.email}</p>
                <p className="text-sm text-muted-foreground">Phone: {userData.phone}</p>
                {userData.organization && (
                  <p className="text-sm text-muted-foreground">Organization: {userData.organization}</p>
                )}
              </div>

              {/* Password Setup Form */}
              <form onSubmit={handleSetPassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Create Password</Label>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Enter your password (min 6 characters)"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      disabled={isSettingPassword}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full hover:bg-transparent"
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Confirm Password</Label>
                  <Input
                    id="confirmPassword"
                    type={showPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    disabled={isSettingPassword}
                  />
                </div>

                <Button type="submit" className="w-full" disabled={isSettingPassword}>
                  {isSettingPassword ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <Lock className="h-4 w-4 mr-2" />
                      Complete Registration
                    </>
                  )}
                </Button>
              </form>
            </div>
          ) : (
            <div className="text-center space-y-4">
              <Button asChild>
                <Link href="/signup">Try Signing Up Again</Link>
              </Button>
              <p className="text-sm text-muted-foreground">
                Already have an account?{' '}
                <Link href="/client/login" className="text-primary hover:underline">
                  Sign in
                </Link>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}