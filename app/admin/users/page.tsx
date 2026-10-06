"use client"

import { useState, useEffect, useRef } from "react"
import { AdminHeader } from "@/components/admin/admin-header"
import type { Pagination } from "@/components/admin/data-table"
import { UsersTable, type DirectoryUser, type UserSort } from "@/components/admin/users/users-table"
import { UsersMetrics, type UsersStats } from "@/components/admin/users/users-metrics"
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
import { Download, UserPlus, Loader2, Eye, EyeOff, Search, RotateCcw, CalendarDays, Plus, AlertCircle } from "lucide-react"
import { toast } from "sonner"
import { formatInr, mergePlanConfigWithDefaults, type PlanConfig } from "@/lib/plan-config"

const planOptionLabel = (plan: PlanConfig) =>
  plan.price > 0 ? `${plan.name} (${formatInr(plan.price)})` : plan.name

export default function UsersPage() {
  const [users, setUsers] = useState<DirectoryUser[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})
  const [sort, setSort] = useState<UserSort>("createdAt")
  const [direction, setDirection] = useState<"asc" | "desc">("desc")
  const [selected, setSelected] = useState<string[]>([])
  const [error, setError] = useState("")
  const [stats, setStats] = useState<UsersStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const [refresh, setRefresh] = useState(0)
  const requestSequence = useRef(0)
  const [plans, setPlans] = useState<PlanConfig[]>(() => mergePlanConfigWithDefaults([]))
  
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
    const controller = new AbortController()
    fetchUsers(controller.signal)
    return () => controller.abort()
  }, [pagination.page, pagination.limit, search, filters, sort, direction, refresh])

  useEffect(() => {
    const timeout = setTimeout(() => {
      setSearch(searchInput.trim())
      setPagination(previous => ({ ...previous, page: 1 }))
    }, 300)
    return () => clearTimeout(timeout)
  }, [searchInput])

  useEffect(() => {
    const controller = new AbortController()
    const loadStats = async () => {
      setStatsLoading(true)
      try {
        const res = await fetch("/api/admin/users/stats", { signal: controller.signal, cache: "no-store" })
        if (!res.ok) throw new Error("Failed to load statistics")
        setStats(await res.json())
      } catch {
        if (!controller.signal.aborted) toast.error("User statistics could not be loaded")
      } finally {
        if (!controller.signal.aborted) setStatsLoading(false)
      }
    }
    loadStats()
    return () => controller.abort()
  }, [refresh])

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const res = await fetch("/api/admin/plans")
        if (!res.ok) return
        const data = await res.json()
        if (Array.isArray(data?.plans)) setPlans(mergePlanConfigWithDefaults(data.plans))
      } catch (error) {
        console.error("Failed to fetch plans:", error)
      }
    }
    fetchPlans()
  }, [])

  const fetchUsers = async (signal?: AbortSignal) => {
    const sequence = ++requestSequence.current
    setLoading(true)
    setError("")
    setSelected([])
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        sort,
        direction,
        ...(search && { search }),
        ...filters
      })
      const res = await fetch(`/api/admin/users?${params}`, { signal, cache: "no-store" })
      if (!res.ok) throw new Error("Users could not be loaded. Please try again.")
      const data = await res.json()
      if (sequence !== requestSequence.current || signal?.aborted) return
      setUsers(data.users)
      setPagination(data.pagination)
    } catch (error) {
      if (!signal?.aborted && sequence === requestSequence.current) setError(error instanceof Error ? error.message : "Failed to load users")
    } finally {
      if (!signal?.aborted && sequence === requestSequence.current) setLoading(false)
    }
  }

  const handleFilter = (key: string, value: string) => {
    setFilters(previous => ({ ...previous, [key]: value }))
    setPagination(previous => ({ ...previous, page: 1 }))
  }

  const resetFilters = () => {
    setSearchInput("")
    setSearch("")
    setFilters({})
    setSort("createdAt")
    setDirection("desc")
    setPagination(previous => ({ ...previous, page: 1 }))
  }

  const handleSort = (key: UserSort) => {
    setDirection(sort === key && direction === "asc" ? "desc" : "asc")
    setSort(key)
    setPagination(previous => ({ ...previous, page: 1 }))
  }

  const handleExport = async (ids?: string[]) => {
    try {
      const params = new URLSearchParams({ ...(search && { search }), ...filters })
      if (ids?.length) params.set("ids", ids.join(","))
      const res = await fetch(`/api/admin/export/users?${params}`)
      if (!res.ok) throw new Error("Export failed")
      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `certistage-users-${new Date().toISOString().slice(0, 10)}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      setTimeout(() => URL.revokeObjectURL(url), 1000)
      toast.success(ids?.length ? `${ids.length} user(s) exported` : "Users exported")
    } catch { toast.error("Failed to export users. Please try again.") }
  }

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789@#$"
    let password = ""
    for (let i = 0; i < 10; i++) {
      password += chars.charAt(crypto.getRandomValues(new Uint32Array(1))[0] % chars.length)
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
      setRefresh(previous => previous + 1)
    } catch (error) {
      toast.error("Failed to create user")
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      <AdminHeader title="Users" compact />
      <div className="flex-1 px-4 pb-8 pt-1 sm:px-6">
        <div className="mx-auto max-w-[1600px] space-y-6">
          <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
            <div><h1 className="text-[28px] font-semibold tracking-tight text-neutral-950">Users</h1><p className="mt-1 text-[13px] leading-relaxed text-neutral-500">Manage all registered users. View, search and manage user accounts, plans and activity.</p></div>
            <div className="flex items-center gap-3 shrink-0">
              <Button variant="outline" className="h-10 rounded-lg border-gold/35 bg-white px-4 text-gold-deep shadow-xs hover:border-gold/60 hover:bg-gold-soft/60 hover:text-gold-deep" onClick={() => setCreateDialogOpen(true)}>
                <Plus className="h-4 w-4" />
                Create User
              </Button>
              <Button variant="outline" className="h-10 rounded-lg border-neutral-200 bg-white px-4" onClick={() => handleExport()}>
                <Download className="h-4 w-4 mr-2" />
                Export CSV
              </Button>
            </div>
          </div>
          <UsersMetrics stats={stats} loading={statsLoading} />
          <div className="grid grid-cols-2 gap-3 lg:flex lg:items-center">
            <div className="relative col-span-2 lg:flex-1"><Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><Input aria-label="Search users" placeholder="Search by name, email, or organization..." value={searchInput} onChange={event => setSearchInput(event.target.value)} className="h-10 rounded-lg border-neutral-200 bg-white pl-10 text-[13px] shadow-xs" /></div>
            <Select value={filters.plan || "all"} onValueChange={value => handleFilter("plan", value)}><SelectTrigger aria-label="Filter by plan" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-[13px] lg:w-[145px]"><SelectValue placeholder="All Plan" /></SelectTrigger><SelectContent><SelectItem value="all">All Plan</SelectItem>{plans.map(plan => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent></Select>
            <Select value={filters.status || "all"} onValueChange={value => handleFilter("status", value)}><SelectTrigger aria-label="Filter by status" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-[13px] lg:w-[155px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All Status</SelectItem><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent></Select>
            <Select value={filters.joined || "all"} onValueChange={value => handleFilter("joined", value)}><SelectTrigger aria-label="Filter by joined date" className="h-10 w-full rounded-lg border-neutral-200 bg-white text-[13px] lg:w-[180px]"><span className="flex items-center gap-2"><CalendarDays className="h-4 w-4" /><SelectValue /></span></SelectTrigger><SelectContent><SelectItem value="all">Joined Date</SelectItem><SelectItem value="today">Today</SelectItem><SelectItem value="7days">Last 7 days</SelectItem><SelectItem value="30days">Last 30 days</SelectItem><SelectItem value="thisMonth">This month</SelectItem><SelectItem value="lastMonth">Last month</SelectItem></SelectContent></Select>
            <Button variant="outline" className="h-10 rounded-lg border-neutral-200 bg-white px-5 text-[13px] lg:w-[120px]" onClick={resetFilters}><RotateCcw className="h-3.5 w-3.5" />Reset</Button>
          </div>
          {error ? <div role="alert" className="flex flex-wrap items-center gap-3 rounded-lg border border-red-200 bg-red-50 p-5 text-sm text-red-700"><AlertCircle className="h-5 w-5" /><span className="flex-1">{error}</span><Button variant="outline" size="sm" onClick={() => setRefresh(previous => previous + 1)}>Retry</Button></div> : <UsersTable
            users={users}
            plans={plans}
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            loading={loading}
            sort={sort}
            direction={direction}
            onSort={handleSort}
            selected={selected}
            onSelectionChange={setSelected}
            onExport={handleExport}
            onReset={resetFilters}
          />}
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
                    {plans.map((plan) => (
                      <SelectItem key={plan.id} value={plan.id}>
                        {planOptionLabel(plan)}
                      </SelectItem>
                    ))}
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
            <Button variant="outline" className="border-gold/35 bg-white text-gold-deep hover:border-gold/60 hover:bg-gold-soft/60 hover:text-gold-deep" onClick={handleCreateUser} disabled={creating}>
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

