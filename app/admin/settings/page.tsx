"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { 
  CreditCard, 
  Eye, 
  EyeOff, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink,
  Database,
  Server,
  RefreshCw,
  UserCog,
  Plus,
  Trash2,
  IndianRupee,
  Globe,
  AlertTriangle,
  Users,
  Calendar,
  FileText,
  CreditCard as PaymentIcon,
  Loader2, DatabaseBackup, Download, Mail } from "lucide-react"
import { Checkbox } from "@/components/ui/checkbox"
import { toast } from "sonner"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AdminHeader } from "@/components/admin/admin-header"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface AdminUser {
  _id: string
  name: string
  email: string
  role: "super_admin" | "admin"
  isActive?: boolean
  lastLogin?: string
  createdAt: string
}

interface PaymentConfig {
  activeGateway: "razorpay" | "stripe"
  razorpay: {
    keyId: string
    keySecret: string
    isLive: boolean
  }
  stripe: {
    publishableKey: string
    secretKey: string
    isLive: boolean
  }
}

export default function AdminSettingsPage() {
  const [configLoading, setConfigLoading] = useState(true)
  const [configError, setConfigError] = useState(false)
  const [savedConfig, setSavedConfig] = useState("")
  const [adminsLoading, setAdminsLoading] = useState(true)
  const [adminsError, setAdminsError] = useState(false)
  const [showRazorpaySecret, setShowRazorpaySecret] = useState(false)
  const [showStripeSecret, setShowStripeSecret] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<"idle" | "success" | "error">("idle")

  const [config, setConfig] = useState<PaymentConfig>({
    activeGateway: "razorpay",
    razorpay: { keyId: "", keySecret: "", isLive: false },
    stripe: { publishableKey: "", secretKey: "", isLive: false }
  })

  // System health state
  const [systemHealth, setSystemHealth] = useState<{
    database: "checking" | "connected" | "error"
    api: "checking" | "healthy" | "error"
  }>({ database: "checking", api: "checking" })

  // Admin management state
  const [admins, setAdmins] = useState<AdminUser[]>([])
  const [showAddAdmin, setShowAddAdmin] = useState(false)
  const [currentAdmin, setCurrentAdmin] = useState<{ id: string; role: string } | null>(null)
  const [newAdmin, setNewAdmin] = useState({ name: "", email: "", password: "" })
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)

  const isSuperAdmin = currentAdmin?.role === "super_admin"

  const fetchAdmins = async () => {
    setAdminsLoading(true)
    setAdminsError(false)
    try {
      const res = await fetch("/api/admin/admins")
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.admins || [])
        setCurrentAdmin({ id: data.currentAdminId, role: data.currentRole })
      } else setAdminsError(true)
    } catch (error) {
      console.error("Failed to fetch admins:", error)
      setAdminsError(true)
    } finally {
      setAdminsLoading(false)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdmin.name.trim() || !newAdmin.email.trim() || !newAdmin.password) {
      toast.error("Please enter name, email and password")
      return
    }
    if (newAdmin.password.length < 8) {
      toast.error("Password must be at least 8 characters")
      return
    }
    setIsAddingAdmin(true)
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newAdmin)
      })
      if (res.ok) {
        toast.success("Admin added successfully")
        setShowAddAdmin(false)
        setNewAdmin({ name: "", email: "", password: "" })
        fetchAdmins()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to add admin")
      }
    } catch {
      toast.error("Failed to add admin")
    } finally {
      setIsAddingAdmin(false)
    }
  }

  const handleDeleteAdmin = async (adminId: string) => {
    if (!confirm("Are you sure you want to delete this admin?")) return
    try {
      const res = await fetch(`/api/admin/admins?id=${adminId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Admin deleted")
        fetchAdmins()
      } else {
        const data = await res.json()
        toast.error(data.error || "Failed to delete admin")
      }
    } catch {
      toast.error("Failed to delete admin")
    }
  }

  const checkSystemHealth = async () => {
    setSystemHealth({ database: "checking", api: "checking" })
    try {
      const res = await fetch("/api/health")
      if (res.ok) {
        const data = await res.json()
        setSystemHealth({ 
          api: "healthy", 
          database: data.services?.database === "connected" ? "connected" : "error" 
        })
      } else {
        setSystemHealth({ api: "error", database: "error" })
      }
    } catch {
      setSystemHealth({ api: "error", database: "error" })
    }
  }

  // Load payment config from database
  const loadPaymentConfig = async () => {
    setConfigLoading(true)
    setConfigError(false)
    try {
      const res = await fetch("/api/admin/settings?key=payment_config")
      if (!res.ok) throw new Error("Unable to load payment settings")
      const data = await res.json()
      const value: PaymentConfig = { activeGateway: data.value?.activeGateway || "razorpay", razorpay: { keyId: "", keySecret: "", isLive: false, ...data.value?.razorpay }, stripe: { publishableKey: "", secretKey: "", isLive: false, ...data.value?.stripe } }
      setConfig(value)
      setSavedConfig(JSON.stringify(value))
    } catch (error) {
      setConfigError(true)
    } finally {
      setConfigLoading(false)
    }
  }

  const handleSave = async () => {
    const gateway = config.activeGateway
    if (gateway === "razorpay") {
      if (!config.razorpay.keyId || !config.razorpay.keySecret) {
        toast.error("Please enter Razorpay Key ID and Secret")
        return
      }
    } else {
      if (!config.stripe.publishableKey || !config.stripe.secretKey) {
        toast.error("Please enter Stripe Publishable Key and Secret Key")
        return
      }
    }
    setIsSaving(true)
    
    try {
      // Save to database
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: "payment_config", value: config })
      })
      
      if (res.ok) {
        setSavedConfig(JSON.stringify(config))
        toast.success("Payment settings saved!")
      } else {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error || "Failed to save settings")
      }
    } catch (error) {
      console.error("Save error:", error)
      toast.error("Failed to save settings")
    }
    
    setIsSaving(false)
  }

  const handleTestConnection = async () => {
    const gateway = config.activeGateway
    setIsTestingConnection(true)
    setConnectionStatus("idle")
    
    if (gateway === "razorpay") {
      if (config.razorpay.keyId.startsWith(config.razorpay.isLive ? "rzp_live_" : "rzp_test_") && config.razorpay.keySecret.trim()) {
        setConnectionStatus("success")
        toast.success("Key format matches the selected mode. Gateway connectivity has not been tested.")
      } else {
        setConnectionStatus("error")
        toast.error("Enter both keys and match the Key ID to the selected test/live mode")
      }
    } else {
      if (config.stripe.publishableKey.startsWith(config.stripe.isLive ? "pk_live_" : "pk_test_") && config.stripe.secretKey.startsWith(config.stripe.isLive ? "sk_live_" : "sk_test_")) {
        setConnectionStatus("success")
        toast.success("Key format matches the selected mode. Gateway connectivity has not been tested.")
      } else {
        setConnectionStatus("error")
        toast.error("Match both Stripe keys to the selected test/live mode")
      }
    }
    setIsTestingConnection(false)
  }


  const activeConfig = config.activeGateway === "razorpay" ? config.razorpay : config.stripe

  // Data Management State
  const [showClearDataDialog, setShowClearDataDialog] = useState(false)
  const [clearDataOptions, setClearDataOptions] = useState({
    users: false,
    events: false,
    certificates: false,
    recipients: false,
    payments: false
  })
  const [confirmText, setConfirmText] = useState("")
  const [isClearing, setIsClearing] = useState(false)
  const [isEmailingBackup, setIsEmailingBackup] = useState(false)

  const handleEmailBackup = async () => {
    setIsEmailingBackup(true)
    try {
      const res = await fetch("/api/admin/backup", { method: "POST" })
      const data = await res.json()
      if (res.ok) {
        toast.success(`Backup sent to ${data.to}`, { description: `${data.filename} · ${Math.round(data.bytes / 1024)} KB · ${data.counts.recipients} recipients` })
      } else {
        toast.error(data.error || "Backup failed")
      }
    } catch {
      toast.error("Backup failed")
    } finally {
      setIsEmailingBackup(false)
    }
  }
  const [dataCounts, setDataCounts] = useState<Record<string, number>>({})

  const fetchDataCounts = async () => {
    try {
      const res = await fetch("/api/admin/data-counts")
      if (res.ok) {
        const data = await res.json()
        setDataCounts(data)
      }
    } catch (error) {
      console.error("Failed to fetch data counts:", error)
    }
  }

  const handleClearData = async () => {
    if (confirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm")
      return
    }

    const selectedCollections = Object.entries(clearDataOptions)
      .filter(([, selected]) => selected)
      .map(([key]) => key)

    if (selectedCollections.length === 0) {
      toast.error("Please select at least one data type to clear")
      return
    }

    setIsClearing(true)
    try {
      const res = await fetch("/api/admin/clear-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ collections: selectedCollections })
      })

      if (res.ok) {
        const result = await res.json()
        toast.success(`Cleared: ${result.deleted.join(", ")}`)
        setShowClearDataDialog(false)
        setClearDataOptions({ users: false, events: false, certificates: false, recipients: false, payments: false })
        setConfirmText("")
        fetchDataCounts()
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to clear data")
      }
    } catch {
      toast.error("Failed to clear data")
    } finally {
      setIsClearing(false)
    }
  }

  useEffect(() => {
    try { localStorage.removeItem("payment_config") } catch {}
    checkSystemHealth()
    fetchAdmins()
    loadPaymentConfig()
    fetchDataCounts()
  }, [])

  return (
    <>
      <AdminHeader title="Settings" compact />
      <div className="flex-1 overflow-auto bg-slate-50/40 p-4 md:p-6">
        <div className="max-w-[1400px] mx-auto space-y-6">
          <div><h1 className="text-3xl font-semibold tracking-tight">Settings</h1><p className="mt-1 text-sm text-muted-foreground">Manage payment configuration, admin access and platform operations.</p></div>
          <Tabs defaultValue="payments" className="space-y-6">
            <TabsList className="grid h-auto w-full grid-cols-2 gap-1 border bg-white p-1 md:w-fit md:grid-cols-4">
              <TabsTrigger value="payments" className="gap-2 px-4 py-2.5 data-[state=active]:bg-gold-soft data-[state=active]:text-gold-deep"><CreditCard className="h-4 w-4"/>Payments</TabsTrigger>
              <TabsTrigger value="admins" className="gap-2 px-4 py-2.5 data-[state=active]:bg-gold-soft data-[state=active]:text-gold-deep"><UserCog className="h-4 w-4"/>Admin Access</TabsTrigger>
              <TabsTrigger value="system" className="gap-2 px-4 py-2.5 data-[state=active]:bg-gold-soft data-[state=active]:text-gold-deep"><Server className="h-4 w-4"/>System Health</TabsTrigger>
              <TabsTrigger value="data" className="gap-2 px-4 py-2.5 data-[state=active]:bg-gold-soft data-[state=active]:text-gold-deep"><DatabaseBackup className="h-4 w-4"/>Backups & Data</TabsTrigger>
            </TabsList>

      <TabsContent value="system" className="space-y-5">
      {/* System Health */}
      <Card className="rounded-xl border-slate-200 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-neutral-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-neutral-500" />
              </div>
              <div>
                <CardTitle>System Health</CardTitle>
                <CardDescription>Monitor system status</CardDescription>
              </div>
            </div>
            <Button variant="outline" size="sm" onClick={checkSystemHealth}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Database className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">Database</p>
                  <p className="text-xs text-muted-foreground">MongoDB</p>
                </div>
              </div>
              <Badge variant={systemHealth.database === "connected" ? "default" : systemHealth.database === "checking" ? "secondary" : "destructive"}>
                {systemHealth.database === "checking" ? "Checking..." : systemHealth.database === "connected" ? "Connected" : "Error"}
              </Badge>
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg border">
              <div className="flex items-center gap-3">
                <Server className="h-5 w-5 text-muted-foreground" />
                <div>
                  <p className="font-medium text-sm">API Server</p>
                  <p className="text-xs text-muted-foreground">Next.js</p>
                </div>
              </div>
              <Badge variant={systemHealth.api === "healthy" ? "default" : systemHealth.api === "checking" ? "secondary" : "destructive"}>
                {systemHealth.api === "checking" ? "Checking..." : systemHealth.api === "healthy" ? "Healthy" : "Error"}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      </TabsContent><TabsContent value="admins" className="space-y-5">
      {/* Admin Users */}
      <Card className="rounded-xl border-slate-200 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gold-soft flex items-center justify-center">
                <UserCog className="h-5 w-5 text-gold-deep" />
              </div>
              <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage admin accounts</CardDescription>
              </div>
            </div>
            {isSuperAdmin && (
              <Button variant="outline" className="border-gold/35 bg-white text-gold-deep hover:bg-gold-soft" size="sm" onClick={() => setShowAddAdmin(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Admin
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {adminsLoading ? <p className="py-8 text-center text-muted-foreground">Loading admin accounts...</p> : adminsError ? <div className="py-8 text-center"><p className="mb-3">Unable to load admin accounts.</p><Button variant="outline" onClick={fetchAdmins}>Retry</Button></div> : admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No admins found</p>
          ) : (
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {admins.map((admin, index) => {
                const displayName = admin?.name || admin?.email || "Admin"
                const initials = displayName.substring(0, 2).toUpperCase()
                const isYou = admin._id === currentAdmin?.id
                const createdDate = admin?.createdAt 
                  ? new Date(admin.createdAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
                  : "Unknown"
                
                return (
                  <div key={admin._id || index} className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg border">
                    <div className="flex min-w-0 items-center gap-3">
                      <div className="h-10 w-10 shrink-0 rounded-full bg-gold-soft flex items-center justify-center">
                        <span className="text-sm font-semibold text-gold-deep">{initials}</span>
                      </div>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-medium">{displayName}</p>
                          {admin.role === "super_admin" ? (
                            <Badge variant="outline" className="border-gold/20 bg-gold-soft text-gold-deep text-[10px] h-5">Super Admin</Badge>
                          ) : (
                            <Badge variant="secondary" className="text-[10px] h-5">Admin</Badge>
                          )}
                          {admin.isActive === false && (
                            <Badge variant="outline" className="text-[10px] h-5">Inactive</Badge>
                          )}
                        </div>
                        <p className="break-all text-xs text-muted-foreground">{admin.email} · Added {createdDate}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {isSuperAdmin && !isYou && admin.role !== "super_admin" && (
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDeleteAdmin(admin._id)}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      )}
                      {isYou && (
                        <Badge variant="outline" className="text-xs">You</Badge>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>They sign in at /admin/login with this email and password, and can change the password from their Profile.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label htmlFor="new-admin-name">Name</Label>
              <Input id="new-admin-name" value={newAdmin.name} onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })} placeholder="Full name" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="new-admin-email">Email</Label>
              <Input id="new-admin-email" type="email" autoComplete="off" value={newAdmin.email} onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })} placeholder="name@company.com" className="mt-1" />
            </div>
            <div>
              <Label htmlFor="new-admin-password">Password</Label>
              <Input id="new-admin-password" type="password" autoComplete="new-password" value={newAdmin.password} onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })} placeholder="At least 8 characters" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
            <Button variant="outline" className="border-gold/35 bg-white text-gold-deep hover:bg-gold-soft" onClick={handleAddAdmin} disabled={isAddingAdmin}>{isAddingAdmin ? "Adding..." : "Add Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      </TabsContent><TabsContent value="payments" className="space-y-5">
      {/* Payment Gateway Configuration */}
      <Card className="rounded-xl border-slate-200 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-gold-soft flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-gold-deep" />
              </div>
              <div>
                <CardTitle>Payment Gateway</CardTitle>
                <CardDescription>Configure payment processing</CardDescription>
              </div>
            </div>
            <Badge variant="outline" className="h-7 border-gold/20 bg-gold-soft text-gold-deep">
              {activeConfig.isLive ? "Live" : "Test"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">{configError && <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-sm"><p className="mb-2">Unable to load payment configuration.</p><Button variant="outline" onClick={loadPaymentConfig}>Retry</Button></div>}{configLoading && <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin"/>Loading payment settings...</p>}<fieldset disabled={configLoading || configError || isSaving} className="min-w-0 space-y-6">
          {/* Gateway Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-muted/50 rounded-lg border">
            <div className="flex items-center gap-3">
              <CreditCard className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="font-medium text-sm">Active Payment Gateway</p>
                <p className="text-xs text-muted-foreground">Select which gateway to use for payments</p>
              </div>
            </div>
            <Select
              value={config.activeGateway}
              onValueChange={(value: "razorpay" | "stripe") => setConfig(prev => ({ ...prev, activeGateway: value }))}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="razorpay">
                  <div className="flex items-center gap-2">
                    <IndianRupee className="h-4 w-4" /> Razorpay
                  </div>
                </SelectItem>
                <SelectItem value="stripe">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4" /> Stripe
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Razorpay Configuration */}
          {config.activeGateway === "razorpay" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Razorpay Configuration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Production Mode</span>
                  <Switch
                    className="data-[state=checked]:bg-gold" checked={config.razorpay.isLive}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, razorpay: { ...prev.razorpay, isLive: checked } }))}
                  />
                </div>
              </div>
              
              {config.razorpay.isLive && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">Use live gateway keys to process real payments.</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Key ID <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder={config.razorpay.isLive ? "rzp_live_xxxxxx" : "rzp_test_xxxxxx"}
                    value={config.razorpay.keyId}
                    onChange={(e) => setConfig(prev => ({ ...prev, razorpay: { ...prev.razorpay, keyId: e.target.value } }))}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Key Secret <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showRazorpaySecret ? "text" : "password"}
                      placeholder="Enter secret key"
                      value={config.razorpay.keySecret}
                      onChange={(e) => setConfig(prev => ({ ...prev, razorpay: { ...prev.razorpay, keySecret: e.target.value } }))}
                      className="pr-10 font-mono text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowRazorpaySecret(!showRazorpaySecret)}>
                      {showRazorpaySecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" asChild>
                <a href="https://dashboard.razorpay.com/app/keys" target="_blank" rel="noopener noreferrer">
                  Open Razorpay Dashboard <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
            </div>
          )}

          {/* Stripe Configuration */}
          {config.activeGateway === "stripe" && (
            <div className="space-y-4 p-4 border rounded-lg">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <h3 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Stripe Configuration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Production Mode</span>
                  <Switch
                    className="data-[state=checked]:bg-gold" checked={config.stripe.isLive}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, stripe: { ...prev.stripe, isLive: checked } }))}
                  />
                </div>
              </div>
              
              {config.stripe.isLive && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">Use live gateway keys to process real payments.</p>
                </div>
              )}

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Publishable Key <span className="text-destructive">*</span></Label>
                  <Input
                    placeholder={config.stripe.isLive ? "pk_live_xxxxxx" : "pk_test_xxxxxx"}
                    value={config.stripe.publishableKey}
                    onChange={(e) => setConfig(prev => ({ ...prev, stripe: { ...prev.stripe, publishableKey: e.target.value } }))}
                    className="font-mono text-sm"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Secret Key <span className="text-destructive">*</span></Label>
                  <div className="relative">
                    <Input
                      type={showStripeSecret ? "text" : "password"}
                      placeholder={config.stripe.isLive ? "sk_live_xxxxxx" : "sk_test_xxxxxx"}
                      value={config.stripe.secretKey}
                      onChange={(e) => setConfig(prev => ({ ...prev, stripe: { ...prev.stripe, secretKey: e.target.value } }))}
                      className="pr-10 font-mono text-sm"
                    />
                    <Button type="button" variant="ghost" size="icon" className="absolute right-0 top-0 h-full px-3 hover:bg-transparent" onClick={() => setShowStripeSecret(!showStripeSecret)}>
                      {showStripeSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>
                </div>
              </div>
              
              <Button variant="outline" size="sm" asChild>
                <a href="https://dashboard.stripe.com/apikeys" target="_blank" rel="noopener noreferrer">
                  Open Stripe Dashboard <ExternalLink className="h-3.5 w-3.5 ml-2" />
                </a>
              </Button>
            </div>
          )}

          <p className="text-xs text-muted-foreground">{savedConfig !== JSON.stringify(config) ? "Unsaved changes" : "Configuration saved"}. Save changes to update the gateway settings.</p>
          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${connectionStatus === "success" ? "bg-neutral-500/10 border border-neutral-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              {connectionStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-neutral-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className={`text-sm font-medium ${connectionStatus === "success" ? "text-neutral-600 dark:text-neutral-400" : "text-destructive"}`}>
                {connectionStatus === "success" ? "Key format matches the selected mode. Connectivity has not been tested." : "Keys are missing or do not match the selected mode."}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-wrap items-center gap-3 pt-2">
            <Button variant="outline" onClick={handleSave} disabled={isSaving || configLoading || configError || savedConfig === JSON.stringify(config)} className="min-w-[120px] border-gold/35 bg-white text-gold-deep hover:bg-gold-soft">
              {isSaving ? "Saving..." : <><Save className="h-4 w-4 mr-2" />Save changes</>}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={isTestingConnection || configLoading || configError} className="min-w-[140px]">
              {isTestingConnection ? "Testing..." : "Check key format"}
            </Button>
          </div>
          </fieldset>
        </CardContent>
      </Card>

      </TabsContent><TabsContent value="data" className="space-y-5">
      {/* Backups */}
      <Card className="rounded-xl border-slate-200 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-lg bg-gold-soft flex items-center justify-center">
              <DatabaseBackup className="h-5 w-5 text-gold-deep" />
            </div>
            <div>
              <CardTitle>Backups</CardTitle>
              <CardDescription>A compressed backup of core platform records for recovery.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3 text-sm">
            <div className="p-3 rounded-lg border bg-background">
              <p className="font-medium">Weekly schedule</p>
              <p className="text-xs text-muted-foreground mt-1">Configured for Sunday at 2:00 AM IST on the deployed cron scheduler. Backups use BACKUP_EMAIL, falling back to ADMIN_EMAIL.</p>
            </div>
            <div className="p-3 rounded-lg border bg-background">
              <p className="font-medium">What is inside</p>
              <p className="text-xs text-muted-foreground mt-1">Users, admins, events, certificate types, recipients, payments, settings and Recently deleted. Template images stay on Cloudinary. No password hashes.</p>
            </div>
            <div className="p-3 rounded-lg border bg-background">
              <p className="font-medium">Restore</p>
              <p className="text-xs text-muted-foreground mt-1 font-mono break-all">node scripts/restore-backup.mjs &lt;file&gt; --uri &lt;MONGODB_URI&gt;</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" className="border-gold/35 bg-white text-gold-deep hover:bg-gold-soft" asChild>
              <a href="/api/admin/backup"><Download className="h-4 w-4 mr-2" />Download backup</a>
            </Button>
            <Button variant="outline" onClick={handleEmailBackup} disabled={isEmailingBackup}>
              {isEmailingBackup ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Mail className="h-4 w-4 mr-2" />}
              Email backup now
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Data Management - Danger Zone */}
      <Card className="rounded-xl border-destructive/25 shadow-none">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-destructive/10 flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                <CardDescription>Permanently remove selected platform records</CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="p-4 bg-destructive/5 border border-destructive/20 rounded-lg space-y-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-destructive">Warning: This action is irreversible</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Clearing data will permanently delete selected records from the database. 
                  This clears all records in the selected categories, including live customer data.
                </p>
              </div>
            </div>

            {/* Data Counts */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="p-3 bg-background rounded-lg border text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{dataCounts.users ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Users</p>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <Calendar className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{dataCounts.events ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Events</p>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <FileText className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{dataCounts.certificates ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Cert Types</p>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <Users className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{dataCounts.recipients ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Recipients</p>
              </div>
              <div className="p-3 bg-background rounded-lg border text-center">
                <PaymentIcon className="h-4 w-4 mx-auto text-muted-foreground mb-1" />
                <p className="text-lg font-bold">{dataCounts.payments ?? "?"}</p>
                <p className="text-xs text-muted-foreground">Payments</p>
              </div>
            </div>

            <Button 
              variant="destructive" 
              onClick={() => { setShowClearDataDialog(true); fetchDataCounts() }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear platform data
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Clear Data Dialog */}
      <Dialog open={showClearDataDialog} onOpenChange={setShowClearDataDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Clear platform data
            </DialogTitle>
            <DialogDescription>
              Select which data to clear. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {/* Checkboxes */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="clear-users" 
                    checked={clearDataOptions.users}
                    onCheckedChange={(checked) => setClearDataOptions(prev => ({ ...prev, users: !!checked }))}
                  />
                  <label htmlFor="clear-users" className="text-sm font-medium cursor-pointer">
                    Users ({dataCounts.users ?? "?"})
                  </label>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="clear-events" 
                    checked={clearDataOptions.events}
                    onCheckedChange={(checked) => setClearDataOptions(prev => ({ ...prev, events: !!checked }))}
                  />
                  <label htmlFor="clear-events" className="text-sm font-medium cursor-pointer">
                    Events ({dataCounts.events ?? "?"})
                  </label>
                </div>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="clear-certificates" 
                    checked={clearDataOptions.certificates}
                    onCheckedChange={(checked) => setClearDataOptions(prev => ({ ...prev, certificates: !!checked }))}
                  />
                  <label htmlFor="clear-certificates" className="text-sm font-medium cursor-pointer">
                    Certificate Types ({dataCounts.certificates ?? "?"})
                  </label>
                </div>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="clear-recipients" 
                    checked={clearDataOptions.recipients}
                    onCheckedChange={(checked) => setClearDataOptions(prev => ({ ...prev, recipients: !!checked }))}
                  />
                  <label htmlFor="clear-recipients" className="text-sm font-medium cursor-pointer">
                    Recipients ({dataCounts.recipients ?? "?"})
                  </label>
                </div>
                <Users className="h-4 w-4 text-muted-foreground" />
              </div>

              <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Checkbox 
                    id="clear-payments" 
                    checked={clearDataOptions.payments}
                    onCheckedChange={(checked) => setClearDataOptions(prev => ({ ...prev, payments: !!checked }))}
                  />
                  <label htmlFor="clear-payments" className="text-sm font-medium cursor-pointer">
                    Payments ({dataCounts.payments ?? "?"})
                  </label>
                </div>
                <PaymentIcon className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="space-y-2">
              <Label className="text-destructive">Type DELETE to confirm</Label>
              <Input 
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
                placeholder="DELETE"
                className="font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClearDataDialog(false)}>
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleClearData}
              disabled={isClearing || confirmText !== "DELETE" || !Object.values(clearDataOptions).some(Boolean)}
            >
              {isClearing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Clearing...
                </>
              ) : (
                <>
                  <Trash2 className="h-4 w-4 mr-2" />
                  Clear Selected Data
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
          </TabsContent></Tabs>
        </div>
      </div>
    </>
  )
}

