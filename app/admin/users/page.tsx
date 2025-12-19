"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { DataTable, Column, Pagination } from "@/components/admin/data-table"
import { SearchFilter, FilterConfig } from "@/components/admin/search-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download, Trash2, Mail } from "lucide-react"
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
      render: (user) => new Date(user.createdAt).toLocaleDateString("en-IN")
    }
  ]

  const handleExport = () => {
    window.open("/api/admin/export/users", "_blank")
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
            <Button variant="outline" onClick={handleExport} className="shrink-0">
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
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
    </>
  )
}