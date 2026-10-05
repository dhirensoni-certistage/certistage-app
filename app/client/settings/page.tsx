"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Loader2, Check, Download, Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"

import { toast } from "sonner"
import { getPlanFeaturesMap } from "@/lib/auth"
import { fetchClientProfile, invalidateClientProfile } from "@/lib/client-profile"
import { BillingPanel } from "@/components/client/billing-panel"

interface UserProfile {
  id: string
  name: string
  email: string
  phone: string
  organization?: string
  plan: string
  planExpiresAt?: string
  createdAt?: string
  hidePoweredBy?: boolean
  canHidePoweredBy?: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const [isSavingProfile, setIsSavingProfile] = useState(false)
  const [activeTab, setActiveTab] = useState(() => {
    if (typeof window === "undefined") return "profile"
    const tab = new URLSearchParams(window.location.search).get("tab")
    return tab && ["profile", "security", "plan", "billing"].includes(tab) ? tab : "profile"
  })
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [profileForm, setProfileForm] = useState({ name: "", phone: "", organization: "" })
  const [usage, setUsage] = useState<{ events: number; certificateTypes: number; certificates: number } | null>(null)
  const [isSavingBranding, setIsSavingBranding] = useState(false)

  useEffect(() => {
    const loadProfile = async () => {
      const sessionStr = localStorage.getItem("clientSession")
      if (!sessionStr) { router.push("/client/login"); return }
      const session = JSON.parse(sessionStr)
      if (!session.userId) { router.push("/client/login"); return }

      fetch("/api/client/usage").then(async (r) => { if (r.ok) { const d = await r.json(); if (d.usage) setUsage(d.usage) } }).catch(() => {})
      try {
        const result = await fetchClientProfile()
        if (result.ok && result.user) {
          setProfile(result.user as UserProfile)
          setProfileForm({ name: result.user.name || "", phone: result.user.phone || "", organization: result.user.organization || "" })
        } else {
          toast.error("Failed to load profile")
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
        invalidateClientProfile()
        setProfile({ ...profile, ...data.user })
        const sessionStr = localStorage.getItem("clientSession")
        if (sessionStr) { const s = JSON.parse(sessionStr); s.userName = data.user.name; localStorage.setItem("clientSession", JSON.stringify(s)) }
        toast.success("Profile updated successfully")
      } else { toast.error(data.error || "Failed to update profile") }
    } catch { toast.error("Something went wrong") }
    setIsSavingProfile(false)
  }

  // "Powered by CertiStage" on download pages: off only on an active paid plan (server enforces it)
  const handlePoweredByToggle = async (show: boolean) => {
    if (!profile) return
    setIsSavingBranding(true)
    try {
      const res = await fetch("/api/client/profile", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hidePoweredBy: !show })
      })
      const data = await res.json().catch(() => ({}))
      if (res.ok) {
        invalidateClientProfile()
        setProfile({ ...profile, ...data.user })
        toast.success(show ? "\"Powered by CertiStage\" is back on your download pages" : "\"Powered by CertiStage\" hidden on your download pages")
      } else {
        toast.error(data.error || "Could not save")
      }
    } catch { toast.error("Something went wrong") }
    setIsSavingBranding(false)
  }

  const handleLogout = () => { localStorage.removeItem("clientSession"); toast.success("Logged out"); router.push("/client/login") }

  if (isLoading) {
    return (
      <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-4">
        <div className="h-16 rounded-xl bg-neutral-100 animate-pulse" />
        <div className="h-[320px] rounded-xl border border-neutral-200 bg-white animate-pulse" />
      </div>
    )
  }
  if (!profile) return null

  const planFeaturesMap = getPlanFeaturesMap()
  const planFeatures = planFeaturesMap[profile.plan] || planFeaturesMap.free
  const initials = profile.name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2)
  const daysLeft = profile.planExpiresAt ? Math.max(0, Math.ceil((new Date(profile.planExpiresAt).getTime() - Date.now()) / 86400000)) : null
  const isPaid = profile.plan !== "free"
  const fmtDate = (d: string) => new Date(d).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
  const tabs: Array<[string, string]> = [["profile", "Profile"], ["security", "Sign-in"], ["plan", "Plan"], ["billing", "Billing"]]
  const inputClass = "h-10 border-neutral-200 bg-white focus-visible:ring-1 focus-visible:ring-neutral-900 focus-visible:border-neutral-900"
  const limit = (v: number) => (v === -1 ? "Unlimited" : v.toLocaleString("en-IN"))

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Account header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="h-14 w-14 rounded-full bg-neutral-900 text-white flex items-center justify-center text-[18px] font-semibold shrink-0">{initials}</div>
        <div className="min-w-0 flex-1">
          <h1 className="text-[22px] font-semibold text-neutral-900 tracking-tight leading-tight truncate">{profile.name}</h1>
          <p className="text-[13px] text-neutral-500 truncate">{profile.email}</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-white px-2.5 py-1 text-[12px] font-medium text-neutral-900 shrink-0">
          <span className={cn("h-1.5 w-1.5 rounded-full", isPaid ? "bg-gold" : "bg-neutral-400")} />
          {planFeatures.displayName}
        </span>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-neutral-200 mb-6">
        {tabs.map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setActiveTab(value)}
            className={cn(
              "px-3 h-10 -mb-px text-[13.5px] border-b-2 transition-colors",
              activeTab === value ? "border-neutral-900 text-neutral-900 font-medium" : "border-transparent text-neutral-500 hover:text-neutral-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === "profile" && (
        <form onSubmit={handleSaveProfile} className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6 space-y-5">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Profile</h2>
            <p className="text-[13px] text-neutral-500 mt-0.5">Shown on receipts and used when we contact you.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-[13px] font-medium text-neutral-700">Full name</Label>
              <Input id="name" className={inputClass} value={profileForm.name} onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-[13px] font-medium text-neutral-700">Phone</Label>
              <Input id="phone" className={inputClass} value={profileForm.phone} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-[13px] font-medium text-neutral-700">Email</Label>
            <Input id="email" value={profile.email} readOnly className={cn(inputClass, "bg-neutral-50 text-neutral-500")} />
            <p className="text-[12px] text-neutral-500">Your sign-in email. Write to support if it needs to change.</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="organization" className="text-[13px] font-medium text-neutral-700">Organization <span className="text-neutral-400 font-normal">(optional)</span></Label>
            <Input id="organization" className={inputClass} placeholder="College, company or event name" value={profileForm.organization} onChange={(e) => setProfileForm({ ...profileForm, organization: e.target.value })} />
          </div>
          <div className="flex justify-end pt-1">
            <Button type="submit" disabled={isSavingProfile} className="h-9 px-4 bg-neutral-900 text-white hover:bg-black text-[13px]">
              {isSavingProfile ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save changes"}
            </Button>
          </div>
        </form>
      )}

      {activeTab === "profile" && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 md:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="min-w-0">
              <h2 className="text-[15px] font-semibold text-neutral-900">Download page branding</h2>
              <p className="text-[13px] text-neutral-500 mt-0.5">
                Your organisation name is always the hero on download pages. The small &quot;Powered by CertiStage&quot; line in the footer can be switched off on an annual plan.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <Label htmlFor="powered-by" className="text-[13px] font-medium text-neutral-700 whitespace-nowrap">
                Show &quot;Powered by CertiStage&quot;
              </Label>
              <Switch
                id="powered-by"
                checked={!(profile.hidePoweredBy && profile.canHidePoweredBy)}
                disabled={isSavingBranding || !profile.canHidePoweredBy}
                onCheckedChange={(checked) => handlePoweredByToggle(checked)}
              />
            </div>
          </div>
          {!profile.canHidePoweredBy && (
            <div className="mt-4 flex items-center justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3.5 py-2.5 text-[12.5px] text-neutral-600">
              <span className="flex items-center gap-2"><Lock className="h-3.5 w-3.5 text-neutral-400" /> Removing the line is included with every annual plan (Professional and up).</span>
              <Link href="/client/upgrade" className="font-medium text-neutral-900 hover:underline underline-offset-4 whitespace-nowrap">See plans</Link>
            </div>
          )}
        </div>
      )}

      {activeTab === "profile" && (
        <div className="mt-4 rounded-xl border border-neutral-200 bg-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-[15px] font-semibold text-neutral-900">Your data</h2>
            <p className="text-[13px] text-neutral-500 mt-0.5">Every event, certificate and recipient in this account as one Excel file. Keep a copy before big changes.</p>
          </div>
          <Button asChild variant="outline" className="h-9 px-4 border-neutral-200 hover:bg-neutral-50 text-[13px] w-fit shrink-0">
            <a href="/api/client/export"><Download className="h-4 w-4 mr-2" />Download Excel</a>
          </Button>
        </div>
      )}

      {activeTab === "security" && (
        <div className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6">
          <h2 className="text-[15px] font-semibold text-neutral-900">How you sign in</h2>
          <p className="text-[13px] text-neutral-500 mt-0.5 mb-5">CertiStage does not use passwords. Each sign-in is confirmed with a one-time code sent to your email, or through Google.</p>
          <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200">
            <div className="px-4 py-3.5">
              <dt className="text-[13.5px] font-medium text-neutral-900">Email code</dt>
              <dd className="text-[13px] text-neutral-500 mt-0.5">A 6-digit code goes to <span className="font-medium text-neutral-900">{profile.email}</span>. It expires in 10 minutes and works once.</dd>
            </div>
            <div className="px-4 py-3.5">
              <dt className="text-[13.5px] font-medium text-neutral-900">Keep your inbox secure</dt>
              <dd className="text-[13px] text-neutral-500 mt-0.5">Anyone with access to this inbox can sign in to your account. Use a strong password and two-step verification on your email provider.</dd>
            </div>
          </dl>
        </div>
      )}

      {activeTab === "billing" && <BillingPanel />}

      {activeTab === "plan" && (
        <div className="space-y-4">
          <div className="rounded-xl border border-neutral-200 bg-white p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <p className="text-[13px] text-neutral-500">Current plan</p>
              <p className="text-[20px] font-semibold text-neutral-900 tracking-tight inline-flex items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full", isPaid ? "bg-gold" : "bg-neutral-400")} />{planFeatures.displayName}
              </p>
              {isPaid && profile.planExpiresAt && (
                <p className="text-[13px] text-neutral-500 mt-0.5">Active until {fmtDate(profile.planExpiresAt)}{daysLeft !== null && daysLeft > 0 ? ` (${daysLeft} days left)` : daysLeft === 0 ? " (expired)" : ""}</p>
              )}
            </div>
            {profile.plan !== "premium" && (
              <Button asChild variant="outline" className="h-9 px-4 border-neutral-200 hover:bg-neutral-50 text-[13px] w-fit"><Link href="/client/upgrade">{isPaid ? "Change plan" : "See plans"}</Link></Button>
            )}
          </div>
          <div className="rounded-xl border border-neutral-200 bg-white overflow-hidden">
            <div className="px-5 py-4 border-b border-neutral-100">
              <h2 className="text-[15px] font-semibold text-neutral-900">Usage and limits</h2>
              <p className="text-[12.5px] text-neutral-500 mt-0.5">Limits apply across all your events. Issued certificates count for the plan period even if you delete the recipient later.</p>
            </div>
            <dl className="divide-y divide-neutral-100">
              {([
                ["Events", planFeatures.maxEvents, usage?.events],
                ["Certificate types", planFeatures.maxCertificateTypes, usage?.certificateTypes],
                [isPaid ? "Certificates issued this plan period" : "Certificates issued", planFeatures.maxCertificates, usage?.certificates]
              ] as Array<[string, number, number | undefined]>).map(([label, max, used]) => (
                <div key={label} className="px-5 py-3 text-[13.5px]">
                  <div className="flex items-center justify-between gap-4">
                    <dt className="text-neutral-600">{label}</dt>
                    <dd className="font-medium text-neutral-900">
                      {used === undefined ? limit(max) : max === -1 ? `${used.toLocaleString("en-IN")} used · Unlimited` : `${used.toLocaleString("en-IN")} of ${max.toLocaleString("en-IN")}`}
                    </dd>
                  </div>
                  {used !== undefined && max > 0 && (
                    <div className="h-1 w-full bg-neutral-100 rounded-full overflow-hidden mt-2">
                      <div className={cn("h-full rounded-full", used / max >= 0.9 ? "bg-red-500" : "bg-neutral-900")} style={{ width: `${Math.min(100, Math.round((used / max) * 100))}%` }} />
                    </div>
                  )}
                </div>
              ))}
              {([
                ["Excel import", planFeatures.canImportData],
                ["Report exports", planFeatures.canExportReport]
              ] as Array<[string, boolean]>).map(([label, value]) => (
                <div key={label} className="flex items-center justify-between px-5 py-3 text-[13.5px]">
                  <dt className="text-neutral-600">{label}</dt>
                  <dd className="font-medium text-neutral-900">
                    {value ? <Check className="h-4 w-4 text-gold-deep" /> : <span className="text-neutral-400 font-normal">Not included</span>}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      )}
    </div>
  )
}
