"use client"

import { useEffect, useMemo, useState } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import { mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"
import { Check, Plus, Pencil, Trash2, Sparkles, Layers, Tag } from "lucide-react"

const ACCENT_PALETTE = ["#f97316", "#3b82f6", "#22c55e", "#e11d48", "#f59e0b", "#14b8a6"]

const formatLimit = (value: number) => {
  if (value === -1) return "Unlimited"
  return value.toLocaleString("en-IN")
}

const formatPrice = (amountInPaise: number, currency: string) => {
  const amount = amountInPaise / 100
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: amount % 1 === 0 ? 0 : 2,
    }).format(amount)
  } catch {
    return `${currency} ${amount.toLocaleString("en-IN")}`
  }
}

const makeEmptyPlan = (index: number): PlanConfig => ({
  id: "",
  enabled: true,
  name: "",
  price: 0,
  currency: "INR",
  billingPeriod: "year",
  badge: "",
  highlight: false,
  accent: ACCENT_PALETTE[index % ACCENT_PALETTE.length],
  sortOrder: index + 1,
  description: "",
  features: [],
  limits: {
    maxEvents: 0,
    maxCertificateTypes: 0,
    maxCertificates: 0,
    canCreateEvent: true,
    canImportData: false,
    canExportReport: false,
    downloadLimit: 0,
    canUpgrade: true,
  },
})

export default function AdminPlansPage() {
  const [plans, setPlans] = useState<PlanConfig[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [draft, setDraft] = useState<PlanConfig | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)

  const sortedPlans = useMemo(() => mergePlanConfigWithDefaults(plans), [plans])

  const handleDialogChange = (open: boolean) => {
    setDialogOpen(open)
    if (!open) {
      setDraft(null)
      setEditingId(null)
    }
  }

  const fetchPlans = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/plans")
      if (res.ok) {
        const data = await res.json()
        setPlans(mergePlanConfigWithDefaults(data.plans))
      } else {
        toast.error("Failed to load plans")
      }
    } catch (error) {
      console.error("Failed to load plans:", error)
      toast.error("Failed to load plans")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlans()
  }, [])

  const persistPlans = async (nextPlans: PlanConfig[]) => {
    setSaving(true)
    try {
      const res = await fetch("/api/admin/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plans: nextPlans }),
      })
      if (res.ok) {
        const data = await res.json()
        setPlans(mergePlanConfigWithDefaults(data.plans))
        toast.success("Plans saved")
      } else {
        toast.error("Failed to save plans")
      }
    } catch (error) {
      console.error("Save plans error:", error)
      toast.error("Failed to save plans")
    } finally {
      setSaving(false)
    }
  }

  const openAdd = () => {
    setEditingId(null)
    setDraft(makeEmptyPlan(sortedPlans.length))
    setDialogOpen(true)
  }

  const openEdit = (plan: PlanConfig) => {
    setEditingId(plan.id)
    setDraft(JSON.parse(JSON.stringify(plan)) as PlanConfig)
    setDialogOpen(true)
  }

  const handleToggleEnabled = async (planId: string, enabled: boolean) => {
    const nextPlans = sortedPlans.map((plan) =>
      plan.id === planId ? { ...plan, enabled } : plan
    )
    setPlans(nextPlans)
    await persistPlans(nextPlans)
  }

  const handleDelete = async (planId: string) => {
    if (planId === "free") {
      toast.error("Free plan cannot be deleted")
      return
    }
    if (!confirm("Delete this plan? This will remove it from pricing.")) return
    const nextPlans = sortedPlans.filter((plan) => plan.id !== planId)
    setPlans(nextPlans)
    await persistPlans(nextPlans)
  }

  const handleSaveDraft = async () => {
    if (!draft) return
    const id = draft.id.trim()
    const name = draft.name.trim()
    if (!id) {
      toast.error("Plan ID is required")
      return
    }
    if (!editingId && sortedPlans.some((plan) => plan.id === id)) {
      toast.error("Plan ID already exists")
      return
    }
    if (!name) {
      toast.error("Plan name is required")
      return
    }

    const normalized: PlanConfig = {
      ...draft,
      id,
      name,
      badge: draft.badge?.trim() || undefined,
      description: draft.description?.trim() || undefined,
      currency: draft.currency?.trim() || "INR",
      billingPeriod: draft.billingPeriod?.trim() || "year",
      features: draft.features.map((f) => f.trim()).filter(Boolean),
      limits: {
        ...draft.limits,
        maxEvents: Number(draft.limits.maxEvents || 0),
        maxCertificateTypes: Number(draft.limits.maxCertificateTypes || 0),
        maxCertificates: Number(draft.limits.maxCertificates || 0),
        downloadLimit: Number(draft.limits.downloadLimit || 0),
      },
    }

    const nextPlans = editingId
      ? sortedPlans.map((plan) => (plan.id === editingId ? normalized : plan))
      : [...sortedPlans, normalized]

    setDialogOpen(false)
    setDraft(null)
    setEditingId(null)
    setPlans(nextPlans)
    await persistPlans(nextPlans)
  }

  return (
    <>
      <AdminHeader title="Plans" description="Create and manage pricing plans" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Breadcrumbs />

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-semibold">Pricing Plans</h2>
              <p className="text-sm text-muted-foreground">Manage plan visibility, pricing, and limits</p>
            </div>
            <Button onClick={openAdd} disabled={saving}>
              <Plus className="h-4 w-4 mr-2" />
              Add Plan
            </Button>
          </div>

          {loading ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">Loading plans...</CardContent>
            </Card>
          ) : sortedPlans.length === 0 ? (
            <Card>
              <CardContent className="py-10 text-center text-muted-foreground">
                No plans yet. Add your first plan.
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {sortedPlans.map((plan) => {
                const accent = plan.accent || ACCENT_PALETTE[0]
                const features = plan.features || []
                const preview = features.slice(0, 4)
                const extraCount = Math.max(0, features.length - preview.length)
                const billingSuffix =
                  plan.price > 0 && plan.billingPeriod ? `/${plan.billingPeriod}` : ""

                return (
                  <Card
                    key={plan.id}
                    className={cn(
                      "relative overflow-hidden border",
                      plan.highlight ? "border-primary/60 shadow-lg" : "border-border"
                    )}
                  >
                    <div className="h-1 w-full" style={{ backgroundColor: accent }} />
                    <CardHeader className="space-y-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex items-center gap-2">
                            <CardTitle className="text-lg">{plan.name}</CardTitle>
                            {plan.badge && <Badge variant="secondary">{plan.badge}</Badge>}
                            {plan.highlight && (
                              <Badge variant="default" className="gap-1">
                                <Sparkles className="h-3 w-3" />
                                Featured
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="mt-1">
                            {plan.description || "No description added yet"}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => openEdit(plan)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="text-destructive hover:text-destructive"
                            onClick={() => handleDelete(plan.id)}
                            disabled={plan.id === "free"}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-3xl font-semibold">
                            {formatPrice(plan.price, plan.currency || "INR")}
                            <span className="text-sm text-muted-foreground">{billingSuffix}</span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-1">
                            ID: <span className="font-mono">{plan.id}</span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 rounded-full border bg-muted/40 px-2.5 py-1">
                          <span className={cn("text-xs font-medium", plan.enabled ? "text-foreground" : "text-muted-foreground")}>
                            {plan.enabled ? "Active" : "Disabled"}
                          </span>
                          <Switch
                            checked={plan.enabled}
                            onCheckedChange={(value) => handleToggleEnabled(plan.id, value)}
                            className="shrink-0 data-[state=checked]:bg-emerald-500"
                          />
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge variant="outline">
                          <Layers className="h-3 w-3 mr-1" />
                          Events: {formatLimit(plan.limits.maxEvents)}
                        </Badge>
                        <Badge variant="outline">
                          <Tag className="h-3 w-3 mr-1" />
                          Cert Types: {formatLimit(plan.limits.maxCertificateTypes)}
                        </Badge>
                        <Badge variant="outline">
                          <Check className="h-3 w-3 mr-1" />
                          Certificates: {formatLimit(plan.limits.maxCertificates)}
                        </Badge>
                      </div>
                      <div className="space-y-2">
                        {preview.length === 0 ? (
                          <p className="text-sm text-muted-foreground">No features listed</p>
                        ) : (
                          <ul className="space-y-1 text-sm text-muted-foreground">
                            {preview.map((feature, idx) => (
                              <li key={`${plan.id}-feature-${idx}`} className="flex items-start gap-2">
                                <Check className="h-4 w-4 mt-0.5 text-emerald-500" />
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {extraCount > 0 && (
                          <p className="text-xs text-muted-foreground">+{extraCount} more features</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={handleDialogChange}>
        <DialogContent className="w-[min(94vw,960px)] max-w-4xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Plan" : "Add New Plan"}</DialogTitle>
            <DialogDescription>Configure pricing, limits, and features for this plan.</DialogDescription>
          </DialogHeader>

          {draft && (
            <div className="space-y-6 py-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Plan ID</Label>
                  <Input
                    value={draft.id}
                    onChange={(e) => setDraft({ ...draft, id: e.target.value })}
                    placeholder="professional"
                    disabled={!!editingId}
                  />
                  {editingId && (
                    <p className="text-xs text-muted-foreground">Plan ID cannot be changed.</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Display Name</Label>
                  <Input
                    value={draft.name}
                    onChange={(e) => setDraft({ ...draft, name: e.target.value })}
                    placeholder="Professional"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Price ({draft.currency || "INR"})</Label>
                  <Input
                    type="number"
                    min="0"
                    value={String(draft.price / 100)}
                    onChange={(e) => {
                      const rupees = Number(e.target.value || 0)
                      setDraft({ ...draft, price: Math.max(0, Math.round(rupees * 100)) })
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Currency</Label>
                  <Input
                    value={draft.currency || "INR"}
                    onChange={(e) => setDraft({ ...draft, currency: e.target.value.toUpperCase() })}
                    placeholder="INR"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Billing Period</Label>
                  <Select
                    value={draft.billingPeriod || "year"}
                    onValueChange={(value) => setDraft({ ...draft, billingPeriod: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="month">Monthly</SelectItem>
                      <SelectItem value="year">Yearly</SelectItem>
                      <SelectItem value="one-time">One-time</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    min="0"
                    value={String(draft.sortOrder ?? 0)}
                    onChange={(e) => setDraft({ ...draft, sortOrder: Number(e.target.value || 0) })}
                  />
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label>Badge</Label>
                  <Input
                    value={draft.badge || ""}
                    onChange={(e) => setDraft({ ...draft, badge: e.target.value })}
                    placeholder="Most Popular"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      value={draft.accent || ""}
                      onChange={(e) => setDraft({ ...draft, accent: e.target.value })}
                      placeholder="#3b82f6"
                    />
                    <div className="h-9 w-9 rounded-md border" style={{ backgroundColor: draft.accent || "#e2e8f0" }} />
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Highlight Plan</p>
                    <p className="text-xs text-muted-foreground">Show as featured</p>
                  </div>
                  <Switch
                    checked={draft.highlight || false}
                    onCheckedChange={(value) => setDraft({ ...draft, highlight: value })}
                    className="shrink-0 data-[state=checked]:bg-emerald-500"
                  />
                </div>
                <div className="flex items-center justify-between gap-3 rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">Enable Plan</p>
                    <p className="text-xs text-muted-foreground">Show in checkout</p>
                  </div>
                  <Switch
                    checked={draft.enabled}
                    onCheckedChange={(value) => setDraft({ ...draft, enabled: value })}
                    className="shrink-0 data-[state=checked]:bg-emerald-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={draft.description || ""}
                  onChange={(e) => setDraft({ ...draft, description: e.target.value })}
                  placeholder="Short description for the plan"
                />
              </div>

              <div className="space-y-2">
                <Label>Usage Limits</Label>
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  <Input
                    type="number"
                    min="-1"
                    placeholder="Max Events"
                    value={String(draft.limits.maxEvents)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        limits: { ...draft.limits, maxEvents: Number(e.target.value || 0) },
                      })
                    }
                  />
                  <Input
                    type="number"
                    min="-1"
                    placeholder="Max Cert Types"
                    value={String(draft.limits.maxCertificateTypes)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        limits: { ...draft.limits, maxCertificateTypes: Number(e.target.value || 0) },
                      })
                    }
                  />
                  <Input
                    type="number"
                    min="-1"
                    placeholder="Max Certificates"
                    value={String(draft.limits.maxCertificates)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        limits: { ...draft.limits, maxCertificates: Number(e.target.value || 0) },
                      })
                    }
                  />
                  <Input
                    type="number"
                    min="-1"
                    placeholder="Download Limit"
                    value={String(draft.limits.downloadLimit)}
                    onChange={(e) =>
                      setDraft({
                        ...draft,
                        limits: { ...draft.limits, downloadLimit: Number(e.target.value || 0) },
                      })
                    }
                  />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Create Events</span>
                    <Switch
                      checked={draft.limits.canCreateEvent}
                      onCheckedChange={(value) =>
                        setDraft({ ...draft, limits: { ...draft.limits, canCreateEvent: value } })
                      }
                      className="shrink-0 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Import Data</span>
                    <Switch
                      checked={draft.limits.canImportData}
                      onCheckedChange={(value) =>
                        setDraft({ ...draft, limits: { ...draft.limits, canImportData: value } })
                      }
                      className="shrink-0 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Export Reports</span>
                    <Switch
                      checked={draft.limits.canExportReport}
                      onCheckedChange={(value) =>
                        setDraft({ ...draft, limits: { ...draft.limits, canExportReport: value } })
                      }
                      className="shrink-0 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                  <div className="flex items-center justify-between rounded-lg border p-3">
                    <span className="text-sm">Allow Upgrade</span>
                    <Switch
                      checked={draft.limits.canUpgrade}
                      onCheckedChange={(value) =>
                        setDraft({ ...draft, limits: { ...draft.limits, canUpgrade: value } })
                      }
                      className="shrink-0 data-[state=checked]:bg-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Features (one per line)</Label>
                <Textarea
                  rows={5}
                  value={draft.features.join("\n")}
                  onChange={(e) =>
                    setDraft({
                      ...draft,
                      features: e.target.value
                        .split("\n")
                        .map((line) => line.trim())
                        .filter(Boolean),
                    })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveDraft} disabled={saving}>
              {saving ? "Saving..." : "Save Plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
