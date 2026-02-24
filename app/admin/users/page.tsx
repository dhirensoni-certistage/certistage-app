"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { DataTable, Column, Pagination } from "@/components/admin/data-table"
import { SearchFilter, FilterConfig } from "@/components/admin/search-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
import { Download, Trash2, Mail, UserPlus, Loader2, Eye, EyeOff } from "lucide-react"
import { toast } from "sonner"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"

interface User {
  _id: string
  name: string
  email: string
  plan: string
  isActive: boolean
  eventsCount: number
  createdAt: string
}

const planFilters: FilterConfig[] = [
  {
    key: "plan",
    label: "Plan",
    options: [
      { value: "free", label: "Free" },
      { value: "professional", label: "Professional" },
      { value: "enterprise", label: "Enterprise" },
      { value: "premium", label: "Premium" },
    ]
  }
]

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-800",
  professional: "bg-blue-100 text-blue-800",
  enterprise: "bg-purple-100 text-purple-800",
  premium: "bg-amber-100 text-amber-800",
}

export default function UsersPage() {
  const router = useRouter()
  const [users, setUsers] = useState<User[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  
  // Create user dialog
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [newUser, setNewUser] = useState({
    name: "",
    email: "",
    phone: "",
    organization: "",
    password: "",
    plan: "free",
    planDuration: 12
  })

  useEffect(() => {
    fetchUsers()
  }, [pagination.page, search, filters])

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...filters
      })
      const res = await fetch(`/api/admin/users?${params}`)
      if (res.ok) {
        const data = await res.json()
        setUsers(data.users)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch users:", error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<User>[] = [
    { key: "name", header: "Name" },
    { key: "email", header: "Email" },
    {
      key: "plan",
      header: "Plan",
      render: (user) => {
        const plan = user.plan || "free"
        return (
          <Badge className={planColors[plan] || "bg-gray-100"}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)}
          </Badge>
        )
      }
    },
    {
      key: "isActive",
      header: "Status",
      render: (user) => (
        <Badge variant={user.isActive ? "default" : "secondary"}>
          {user.isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
    { key: "eventsCount", header: "Events" },
    {
      key: "createdAt",
      header: "Joined",
      render: (user) => {
        if (!user.createdAt) return "-"
        const date = new Date(user.createdAt)
        if (isNaN(date.getTime())) return "-"
        return date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      }
    }
  ]

  const handleExport = () => {
    window.open("/api/admin/export/users", "_blank")
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$"
    let password = ""
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    setNewUser(prev => ({ ...prev, password }))
  }

  const handleCreateUser = async () => {
    if (!newUser.name || !newUser.email || !newUser.phone || !newUser.password) {
      toast.error("Please fill all required fields")
      return
    }

    setCreating(true)
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newUser)
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error || "Failed to create user")
        return
      }

      toast.success("User created successfully!")
      setCreateDialogOpen(false)
      setNewUser({
        name: "",
        email: "",
        phone: "",
        organization: "",
        password: "",
        plan: "free",
        planDuration: 12
      })
      fetchUsers()
    } catch (error) {
      toast.error("Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  const bulkActions = [
    {
      label: "Export Selected",
      icon: <Download className="h-4 w-4 mr-2" />,
      onClick: (ids: string[]) => {
        toast.success(`Exporting ${ids.length} users...`)
        // Implement export selected
      }
    },
    {
      label: "Send Email",
      icon: <Mail className="h-4 w-4 mr-2" />,
      onClick: (ids: string[]) => {
        toast.info(`Email feature coming soon for ${ids.length} users`)
      }
    }
  ]

  return (
    <>
      <AdminHeader title="Users" description="Manage all registered users" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <Breadcrumbs />
          <div className="flex items-center justify-between gap-4">
            <SearchFilter
              searchPlaceholder="Search by name, email, or organization..."
              filters={planFilters}
              onSearch={setSearch}
              onFilter={setFilters}
              className="flex-1"
            />
            <div className="flex items-center gap-2 shrink-0">
              <Button onClick={() => setCreateDialogOpen(true)}>
                <UserPlus className="h-4 w-4 mr-2" />
                Create User
              </Button>
              <Button variant="outline" onClick={handleExport}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <DataTable
            columns={columns}
            data={users}
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            onRowClick={(user) => router.push(`/admin/users/${user._id}`)}
            loading={loading}
            rowKey={(user) => user._id}
            emptyMessage="No users found"
            selectable
            bulkActions={bulkActions}
          />
        </div>
      </div>

      {/* Create User Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Create New User
            </DialogTitle>
            <DialogDescription>
              Create a new user account with any plan. User will receive a welcome email.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                placeholder="Full name"
                value={newUser.name}
                onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={newUser.email}
                onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                placeholder="10-digit mobile number"
                value={newUser.phone}
                onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="organization">Organization</Label>
              <Input
                id="organization"
                placeholder="Company/Organization name"
                value={newUser.organization}
                onChange={(e) => setNewUser(prev => ({ ...prev, organization: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="password">Password *</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Password"
                    value={newUser.password}
                    onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="absolute right-0 top-0 h-full"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
                <Button type="button" variant="outline" onClick={generatePassword}>
                  Generate
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Plan</Label>
                <Select
                  value={newUser.plan}
                  onValueChange={(value) => setNewUser(prev => ({ ...prev, plan: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="professional">Professional (₹2,999)</SelectItem>
                    <SelectItem value="enterprise">Enterprise (₹6,999)</SelectItem>
                    <SelectItem value="premium">Premium (₹11,999)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              {newUser.plan !== "free" && (
                <div className="space-y-2">
                  <Label>Duration</Label>
                  <Select
                    value={newUser.planDuration.toString()}
                    onValueChange={(value) => setNewUser(prev => ({ ...prev, planDuration: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">1 Month</SelectItem>
                      <SelectItem value="3">3 Months</SelectItem>
                      <SelectItem value="6">6 Months</SelectItem>
                      <SelectItem value="12">12 Months</SelectItem>
                      <SelectItem value="24">24 Months</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            
            {newUser.plan !== "free" && (
              <div className="p-3 bg-neutral-50 dark:bg-neutral-950/30 rounded-lg text-sm">
                <p className="text-neutral-700 dark:text-neutral-300">
                  Plan will be active for {newUser.planDuration} month(s) from today.
                  No payment required - admin assigned plan.
                </p>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Create User
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

