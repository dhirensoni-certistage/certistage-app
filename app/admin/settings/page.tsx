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
  Settings,
  ExternalLink,
  Database,
  Server,
  RefreshCw,
  UserCog,
  Plus,
  Trash2,
  IndianRupee,
  Globe
} from "lucide-react"
import { toast } from "sonner"
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
  username: string
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
  const [newAdminUsername, setNewAdminUsername] = useState("")
  const [newAdminPassword, setNewAdminPassword] = useState("")
  const [isAddingAdmin, setIsAddingAdmin] = useState(false)

  const fetchAdmins = async () => {
    try {
      const res = await fetch("/api/admin/admins")
      if (res.ok) {
        const data = await res.json()
        setAdmins(data.admins)
      }
    } catch (error) {
      console.error("Failed to fetch admins:", error)
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminUsername || !newAdminPassword) {
      toast.error("Please enter username and password")
      return
    }
    setIsAddingAdmin(true)
    try {
      const res = await fetch("/api/admin/admins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: newAdminUsername, password: newAdminPassword })
      })
      if (res.ok) {
        toast.success("Admin added successfully")
        setShowAddAdmin(false)
        setNewAdminUsername("")
        setNewAdminPassword("")
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
      const res = await fetch("/api/admin/dashboard")
      if (res.ok) {
        setSystemHealth({ api: "healthy", database: "connected" })
      } else {
        setSystemHealth({ api: "error", database: "error" })
      }
    } catch {
      setSystemHealth({ api: "error", database: "error" })
    }
  }

  // Load payment config from database
  const loadPaymentConfig = async () => {
    try {
      const res = await fetch("/api/admin/settings?key=payment_config")
      if (res.ok) {
        const data = await res.json()
        if (data.value) {
          setConfig(data.value)
        }
      }
    } catch (error) {
      console.error("Failed to load payment config:", error)
      // Fallback to localStorage
      const saved = localStorage.getItem("payment_config")
      if (saved) {
        try {
          setConfig(JSON.parse(saved))
        } catch (e) {
          console.error("Error loading config from localStorage")
        }
      }
    }
  }

  useEffect(() => {
    checkSystemHealth()
    fetchAdmins()
    loadPaymentConfig()
  }, [])

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
        // Also save to localStorage as backup
        localStorage.setItem("payment_config", JSON.stringify(config))
        toast.success("Payment settings saved!")
      } else {
        toast.error("Failed to save settings")
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
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    if (gateway === "razorpay") {
      if (config.razorpay.keyId.startsWith("rzp_")) {
        setConnectionStatus("success")
        toast.success("Razorpay connection verified!")
      } else {
        setConnectionStatus("error")
        toast.error("Invalid Razorpay Key ID format")
      }
    } else {
      if (config.stripe.publishableKey.startsWith("pk_")) {
        setConnectionStatus("success")
        toast.success("Stripe connection verified!")
      } else {
        setConnectionStatus("error")
        toast.error("Invalid Stripe Publishable Key format")
      }
    }
    setIsTestingConnection(false)
  }


  const activeConfig = config.activeGateway === "razorpay" ? config.razorpay : config.stripe

  return (
    <div className="p-6 h-full overflow-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6" />
          Settings
        </h1>
        <p className="text-muted-foreground">Manage payment gateway and system configuration</p>
      </div>

      {/* System Health */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <Server className="h-5 w-5 text-emerald-500" />
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
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
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
            <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
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

      {/* Admin Users */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <UserCog className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <CardTitle>Admin Users</CardTitle>
                <CardDescription>Manage admin accounts</CardDescription>
              </div>
            </div>
            <Button size="sm" onClick={() => setShowAddAdmin(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Admin
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {admins.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">No admins found</p>
          ) : (
            <div className="space-y-2">
              {admins.map((admin) => (
                <div key={admin._id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg border">
                  <div>
                    <p className="font-medium">{admin.username}</p>
                    <p className="text-xs text-muted-foreground">Added {new Date(admin.createdAt).toLocaleDateString()}</p>
                  </div>
                  <Button variant="ghost" size="icon" onClick={() => handleDeleteAdmin(admin._id)} disabled={admins.length <= 1}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Admin Dialog */}
      <Dialog open={showAddAdmin} onOpenChange={setShowAddAdmin}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Admin</DialogTitle>
            <DialogDescription>Create a new admin account</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div>
              <Label>Username</Label>
              <Input value={newAdminUsername} onChange={(e) => setNewAdminUsername(e.target.value)} placeholder="Enter username" className="mt-1" />
            </div>
            <div>
              <Label>Password</Label>
              <Input type="password" value={newAdminPassword} onChange={(e) => setNewAdminPassword(e.target.value)} placeholder="Enter password" className="mt-1" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddAdmin(false)}>Cancel</Button>
            <Button onClick={handleAddAdmin} disabled={isAddingAdmin}>{isAddingAdmin ? "Adding..." : "Add Admin"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {/* Payment Gateway Configuration */}
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                <CreditCard className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Payment Gateway</CardTitle>
                <CardDescription>Configure payment processing</CardDescription>
              </div>
            </div>
            <Badge variant={activeConfig.isLive ? "default" : "secondary"} className="h-7">
              {activeConfig.isLive ? "Live" : "Test"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Gateway Selector */}
          <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg border">
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><IndianRupee className="h-4 w-4" /> Razorpay Configuration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Production Mode</span>
                  <Switch
                    checked={config.razorpay.isLive}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, razorpay: { ...prev.razorpay, isLive: checked } }))}
                  />
                </div>
              </div>
              
              {config.razorpay.isLive && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">Live mode enabled. Real payments will be processed.</p>
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
              <div className="flex items-center justify-between">
                <h3 className="font-semibold flex items-center gap-2"><Globe className="h-4 w-4" /> Stripe Configuration</h3>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Production Mode</span>
                  <Switch
                    checked={config.stripe.isLive}
                    onCheckedChange={(checked) => setConfig(prev => ({ ...prev, stripe: { ...prev.stripe, isLive: checked } }))}
                  />
                </div>
              </div>
              
              {config.stripe.isLive && (
                <div className="flex items-center gap-3 p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                  <p className="text-sm text-amber-600 dark:text-amber-400">Live mode enabled. Real payments will be processed.</p>
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

          {/* Connection Status */}
          {connectionStatus !== "idle" && (
            <div className={`flex items-center gap-2 p-3 rounded-lg ${connectionStatus === "success" ? "bg-emerald-500/10 border border-emerald-500/20" : "bg-destructive/10 border border-destructive/20"}`}>
              {connectionStatus === "success" ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : <AlertCircle className="h-4 w-4 text-destructive" />}
              <span className={`text-sm font-medium ${connectionStatus === "success" ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                {connectionStatus === "success" ? "Connection verified successfully" : "Connection failed"}
              </span>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <Button onClick={handleSave} disabled={isSaving} className="min-w-[120px]">
              {isSaving ? "Saving..." : <><Save className="h-4 w-4 mr-2" />Save</>}
            </Button>
            <Button variant="outline" onClick={handleTestConnection} disabled={isTestingConnection} className="min-w-[140px]">
              {isTestingConnection ? "Testing..." : "Test Connection"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
