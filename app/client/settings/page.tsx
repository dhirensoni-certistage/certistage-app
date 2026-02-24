"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  User, Lock, Loader2, Eye, EyeOff, Save, LogOut, Crown,
  Mail, Phone, Building2, Shield, ChevronRight, Check
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

import { toast } from "sonner"
import { PLAN_FEATURES } from "@/lib/auth"

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  organization?: string
  plan: string
  planExpiresAt?: string
  createdAt?: string
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [isSavingPassword, setIsSavingPassword] = useState(false)
  const [showPasswords, setShowPasswords] = useState(false)
  const [activeTab, setActiveTab] = useState("profile")
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", organization: "" })
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" })

  useEffect(() => {
    const loadProfile = async () => {
      const sessionStr = localStorage.getItem("clientSession")
      if (!sessionStr) { router.push("/client/login"); return }
      const session = JSON.parse(sessionStr)
      if (!session.userId) { router.push("/client/login"); return }

      try {
        const res = await fetch(`/api/client/profile?userId=${session.userId}`)
        const data = await res.json()
        if (res.ok && data.user) {
          setProfile(data.user)
          setProfileForm({ name: data.user.name || "", phone: data.user.phone || "", organization: data.user.organization || "" })
        }
      } catch (error) { toast.error("Failed to load profile") }
      setIsLoading(false)
    }
    loadProfile()
  }, [router])

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile || !profileForm.name.trim() || !profileForm.phone.trim()) { toast.error("Name and phone are required"); return }
    setIsSavingProfile(true)
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, ...profileForm })
      })
      const data = await res.json()
      if (res.ok) {
        setProfile({ ...profile, ...data.user })
        const sessionStr = localStorage.getItem("clientSession")
        if (sessionStr) { const s = JSON.parse(sessionStr); s.userName = data.user.name; localStorage.setItem("clientSession", JSON.stringify(s)) }
        toast.success("Profile updated successfully")
      } else { toast.error(data.error || "Failed to update profile") }
    } catch { toast.error("Something went wrong") }
    setIsSavingProfile(false)
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!profile) return
    if (!passwordForm.currentPassword || !passwordForm.newPassword || !passwordForm.confirmPassword) { toast.error("Please fill all fields"); return }
    if (passwordForm.newPassword.length < 6) { toast.error("Password must be at least 6 characters"); return }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) { toast.error("Passwords do not match"); return }
    setIsSavingPassword(true)
    try {
      const res = await fetch("/api/client/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: profile.id, currentPassword: passwordForm.currentPassword, newPassword: passwordForm.newPassword })
      })
      const data = await res.json()
      if (res.ok) { setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); toast.success("Password changed successfully") }
      else { toast.error(data.error || "Failed to change password") }
    } catch { toast.error("Something went wrong") }
    setIsSavingPassword(false)
  }

  const handleLogout = () => { localStorage.removeItem("clientSession"); toast.success("Logged out"); router.push("/client/login") }

  if (isLoading) return <div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
  if (!profile) return null

  const planFeatures = PLAN_FEATURES[profile.plan as keyof typeof PLAN_FEATURES] || PLAN_FEATURES.free
  const initials = profile.name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2)
  const daysLeft = profile.planExpiresAt ? Math.max(0, Math.ceil((new Date(profile.planExpiresAt).getTime() - Date.now()) / 86400000)) : null

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto pl-8 md:pl-12">
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[11px] font-semibold text-[#888] uppercase tracking-[0.15em]">Account</span>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-6">
          <Avatar className="h-16 w-16 border border-[#E5E5E5]">
            <AvatarFallback className="bg-neutral-900 text-white text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <h1 className="text-[24px] font-semibold text-black tracking-tight leading-none">{profile.name}</h1>
            <p className="text-sm text-[#666] mt-1">{profile.email}</p>
            <div className="flex items-center gap-3 mt-2">
              <Badge className="bg-neutral-900 text-white border-0 text-xs">{planFeatures.displayName}</Badge>
              {profile.createdAt && <span className="text-xs text-[#999]">Member since {new Date(profile.createdAt).toLocaleDateString("en-US", { month: "short", year: "numeric" })}</span>}
            </div>
          </div>
          {profile.plan !== "premium" && <Button asChild className="gap-2 h-9 px-4 bg-black text-white hover:bg-[#222]"><Link href="/client/upgrade"><Crown className="h-4 w-4" />Upgrade</Link></Button>}
        </div>
      </div>

      {profile.plan !== "free" && daysLeft !== null && (
        <Card className="mb-6">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-neutral-900 flex items-center justify-center"><Crown className="h-5 w-5 text-white" /></div>
              <div>
                <p className="font-medium">{planFeatures.displayName}</p>
                <p className="text-sm text-muted-foreground">{daysLeft > 0 ? `${daysLeft} days left` : "Expired"}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Expires</p>
              <p className="font-medium">{new Date(profile.planExpiresAt!).toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-grid bg-neutral-100/70 dark:bg-neutral-900/60 p-1 rounded-lg">
          <TabsTrigger value="profile" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md"><User className="h-4 w-4" /><span className="hidden sm:inline">Profile</span></TabsTrigger>
          <TabsTrigger value="security" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md"><Shield className="h-4 w-4" /><span className="hidden sm:inline">Security</span></TabsTrigger>
          <TabsTrigger value="plan" className="gap-2 data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:shadow-sm rounded-md"><Crown className="h-4 w-4" /><span className="hidden sm:inline">Plan</span></TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card><CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Personal Information</h3>
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2"><Label className="flex items-center gap-2"><User className="h-4 w-4 text-muted-foreground" />Full Name</Label><Input value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} /></div>
                <div className="space-y-2"><Label className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />Phone</Label><Input value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />Email</Label><Input value={profile.email} disabled className="bg-muted/50" /><p className="text-xs text-muted-foreground">Cannot be changed</p></div>
              <div className="space-y-2"><Label className="flex items-center gap-2"><Building2 className="h-4 w-4 text-muted-foreground" />Organization</Label><Input value={profileForm.organization} onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })} /></div>
              <div className="flex justify-end"><Button type="submit" disabled={isSavingProfile} className="gap-2">{isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}Save Changes</Button></div>
            </form>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-6">
          <Card><CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Change Password</h3>
            <form onSubmit={handleChangePassword} className="space-y-5">
              <div className="space-y-2">
                <Label>Current Password</Label>
                <div className="relative">
                  <Input
                    type={showPasswords ? "text" : "password"}
                    value={passwordForm.currentPassword}
                    onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                    className="pr-10"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full hover:bg-transparent"
                    onClick={() => setShowPasswords(!showPasswords)}
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                      placeholder="Min 6 characters"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full hover:bg-transparent"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Confirm Password</Label>
                  <div className="relative">
                    <Input
                      type={showPasswords ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="absolute right-0 top-0 h-full hover:bg-transparent"
                      onClick={() => setShowPasswords(!showPasswords)}
                    >
                      {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              <div className="flex justify-end"><Button type="submit" disabled={isSavingPassword} className="gap-2">{isSavingPassword ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}Update Password</Button></div>
            </form>
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="plan">
          <Card><CardContent className="p-6">
            <h3 className="text-lg font-semibold mb-4">Current Plan</h3>
            <div className="p-4 rounded-lg bg-neutral-900 text-white mb-6 flex items-center justify-between">
              <div><p className="text-white/80 text-sm">You're on</p><p className="text-2xl font-bold">{planFeatures.displayName}</p></div>
              <Crown className="h-10 w-10 text-white/80" />
            </div>
            <h4 className="font-medium mb-3">Plan Features</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { label: "Events", value: planFeatures.maxEvents },
                { label: "Certificate Types", value: planFeatures.maxCertificateTypes },
                { label: "Certificates", value: planFeatures.maxCertificates },
                { label: "Bulk Import", value: planFeatures.canImportData },
                { label: "Export Reports", value: planFeatures.canExportReport },
              ].map((f, i) => (
                <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                  <span className="text-sm">{f.label}</span>
                  {typeof f.value === "boolean" ? (f.value ? <Check className="h-4 w-4 text-black" /> : <span className="text-xs text-muted-foreground">—</span>) : <span className="font-medium">{f.value === -1 ? "Unlimited" : f.value.toLocaleString()}</span>}
                </div>
              ))}
            </div>
            {profile.plan !== "premium" && (
              <div className="mt-6 p-4 rounded-lg border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between">
                <div><p className="font-medium">Need more?</p><p className="text-sm text-muted-foreground">Upgrade for more features</p></div>
                <Button asChild variant="outline" className="gap-2"><Link href="/client/upgrade">View Plans<ChevronRight className="h-4 w-4" /></Link></Button>
              </div>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
