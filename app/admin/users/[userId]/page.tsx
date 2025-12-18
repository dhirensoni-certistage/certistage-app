"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserStatusToggle } from "@/components/admin/users/user-status-toggle"
import { ArrowLeft, Mail, Phone, Building, Calendar, CreditCard } from "lucide-react"

interface UserDetails {
  user: {
    _id: string
    name: string
    email: string
    phone: string
    organization?: string
    plan: string
    isActive: boolean
    createdAt: string
  }
  events: Array<{
    _id: string
    name: string
    isActive: boolean
    createdAt: string
    certificateTypesCount: number
    recipientsCount: number
  }>
  payments: Array<{
    _id: string
    plan: string
    amount: number
    status: string
    createdAt: string
  }>
  stats: {
    totalEvents: number
    totalCertificates: number
    totalRecipients: number
  }
}

export default function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchUserDetails()
  }, [userId])

  const fetchUserDetails = async () => {
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      if (res.ok) {
        setData(await res.json())
      }
    } catch (error) {
      console.error("Failed to fetch user:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusChange = (isActive: boolean) => {
    if (data) {
      setData({ ...data, user: { ...data.user, isActive } })
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="User Details" description="Loading..." />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </div>
      </>
    )
  }

  if (!data) {
    return (
      <>
        <AdminHeader title="User Not Found" description="" />
        <div className="flex-1 p-6 text-center">
          <p className="text-muted-foreground">User not found</p>
          <Button onClick={() => router.back()} className="mt-4">Go Back</Button>
        </div>
      </>
    )
  }

  const { user, events, payments, stats } = data

  return (
    <>
      <AdminHeader title={user.name} description={user.email} />
      <div className="flex-1 overflow-auto p-6">
        <div className="max-w-4xl mx-auto space-y-6">
          <Button variant="ghost" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Users
          </Button>

          {/* User Info Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Profile Information</CardTitle>
              <UserStatusToggle userId={user._id} isActive={user.isActive} onStatusChange={handleStatusChange} />
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2"><Mail className="h-4 w-4 text-muted-foreground" />{user.email}</div>
              <div className="flex items-center gap-2"><Phone className="h-4 w-4 text-muted-foreground" />{user.phone}</div>
              {user.organization && <div className="flex items-center gap-2"><Building className="h-4 w-4 text-muted-foreground" />{user.organization}</div>}
              <div className="flex items-center gap-2"><Calendar className="h-4 w-4 text-muted-foreground" />Joined {new Date(user.createdAt).toLocaleDateString()}</div>
              <div><Badge>{user.plan}</Badge></div>
            </CardContent>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.totalEvents}</p><p className="text-sm text-muted-foreground">Events</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.totalCertificates}</p><p className="text-sm text-muted-foreground">Certificate Types</p></CardContent></Card>
            <Card><CardContent className="pt-6 text-center"><p className="text-3xl font-bold">{stats.totalRecipients}</p><p className="text-sm text-muted-foreground">Recipients</p></CardContent></Card>
          </div>

          {/* Events */}
          <Card>
            <CardHeader><CardTitle>Events ({events.length})</CardTitle></CardHeader>
            <CardContent>
              {events.length === 0 ? <p className="text-muted-foreground">No events created</p> : (
                <div className="space-y-2">
                  {events.map((event) => (
                    <div key={event._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <p className="font-medium">{event.name}</p>
                        <p className="text-sm text-muted-foreground">{event.certificateTypesCount} types • {event.recipientsCount} recipients</p>
                      </div>
                      <Badge variant={event.isActive ? "default" : "secondary"}>{event.isActive ? "Active" : "Inactive"}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader><CardTitle>Payment History ({payments.length})</CardTitle></CardHeader>
            <CardContent>
              {payments.length === 0 ? <p className="text-muted-foreground">No payments</p> : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-2"><CreditCard className="h-4 w-4" /><span>{payment.plan}</span></div>
                      <div className="text-right">
                        <p className="font-medium">₹{payment.amount}</p>
                        <p className="text-xs text-muted-foreground">{new Date(payment.createdAt).toLocaleDateString()}</p>
                      </div>
                      <Badge variant={payment.status === "success" ? "default" : "secondary"}>{payment.status}</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  )
}