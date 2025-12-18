"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { DataTable, Column, Pagination } from "@/components/admin/data-table"
import { SearchFilter, FilterConfig } from "@/components/admin/search-filter"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Download } from "lucide-react"

interface Event {
  _id: string
  name: string
  owner: { _id: string; name: string; email: string }
  certificateTypesCount: number
  recipientsCount: number
  isActive: boolean
  createdAt: string
}

const statusFilters: FilterConfig[] = [
  {
    key: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "inactive", label: "Inactive" },
    ]
  }
]

export default function EventsPage() {
  const router = useRouter()
  const [events, setEvents] = useState<Event[]>([])
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 10, total: 0, totalPages: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [filters, setFilters] = useState<Record<string, string>>({})

  useEffect(() => {
    fetchEvents()
  }, [pagination.page, search, filters])

  const fetchEvents = async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(search && { search }),
        ...filters
      })
      const res = await fetch(`/api/admin/events?${params}`)
      if (res.ok) {
        const data = await res.json()
        setEvents(data.events)
        setPagination(data.pagination)
      }
    } catch (error) {
      console.error("Failed to fetch events:", error)
    } finally {
      setLoading(false)
    }
  }

  const columns: Column<Event>[] = [
    { key: "name", header: "Event Name" },
    {
      key: "owner",
      header: "Owner",
      render: (event) => (
        <div>
          <p className="font-medium">{event.owner?.name || "Unknown"}</p>
          <p className="text-xs text-muted-foreground">{event.owner?.email}</p>
        </div>
      )
    },
    { key: "certificateTypesCount", header: "Cert Types" },
    { key: "recipientsCount", header: "Recipients" },
    {
      key: "isActive",
      header: "Status",
      render: (event) => (
        <Badge variant={event.isActive ? "default" : "secondary"}>
          {event.isActive ? "Active" : "Inactive"}
        </Badge>
      )
    },
    {
      key: "createdAt",
      header: "Created",
      render: (event) => new Date(event.createdAt).toLocaleDateString("en-IN")
    }
  ]

  const handleExport = () => {
    window.open("/api/admin/export/events", "_blank")
  }

  return (
    <>
      <AdminHeader title="Events" description="Manage all events across all users" />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          <div className="flex items-center justify-between gap-4">
            <SearchFilter
              searchPlaceholder="Search by event name or owner email..."
              filters={statusFilters}
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
            data={events}
            pagination={pagination}
            onPageChange={(page) => setPagination((p) => ({ ...p, page }))}
            onRowClick={(event) => router.push(`/admin/events/${event._id}`)}
            loading={loading}
            rowKey={(event) => event._id}
            emptyMessage="No events found"
          />
        </div>
      </div>
    </>
  )
}