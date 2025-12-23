"use client"

import { useState, useEffect, use } from "react"
import { useRouter } from "next/navigation"
import { AdminHeader } from "@/components/admin/admin-header"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { UserStatusToggle } from "@/components/admin/users/user-status-toggle"
import { Breadcrumbs } from "@/components/admin/breadcrumbs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Mail, Phone, Building, Calendar, CreditCard, ExternalLink, Users, FileText, Trash2, AlertTriangle } from "lucide-react"
import { toast } from "sonner"

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

const planColors: Record<string, string> = {
  free: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  professional: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  enterprise: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  premium: "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200",
}

export default function UserDetailsPage({ params }: { params: Promise<{ userId: string }> }) {
  const { userId } = use(params)
  const router = useRouter()
  const [data, setData] = useState<UserDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState(false)

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

  const handlePlanChange = async (newPlan: string) => {
    if (!data) return
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: newPlan })
      })
      if (res.ok) {
        setData({ ...data, user: { ...data.user, plan: newPlan } })
        toast.success(`Plan updated to ${newPlan}`)
      } else {
        toast.error("Failed to update plan")
      }
    } catch (error) {
      toast.error("Failed to update plan")
    }
  }

  const handleDeleteUser = async () => {
    setDeleting(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE"
      })
      if (res.ok) {
        const result = await res.json()
        toast.success(`User deleted successfully. Removed ${result.deletedEvents} events, ${result.deletedCertTypes} certificate types, ${result.deletedRecipients} recipients.`)
        router.push("/admin/users")
      } else {
        const error = await res.json()
        toast.error(error.error || "Failed to delete user")
      }
    } catch (error) {
      toast.error("Failed to delete user")
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="User Details" description="Loading..." />
        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-4xl mx-auto space-y-6">
            <Skeleton className="h-48 w-full" />
            <div className="grid grid-cols-3 gap-4">
              {[1,2,3].map(i => <Skeleton key={i} className="h-24" />)}
            </div>
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
          <Breadcrumbs items={[
            { label: "Users", href: "/admin/users" },
            { label: user.name }
          ]} />

          {/* User Profile Card */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">
                    {user.name.substring(0, 2).toUpperCase()}
                  </span>
                </div>
                <div>
                  <CardTitle className="text-xl">{user.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">{user.email}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Select value={user.plan} onValueChange={handlePlanChange}>
                      <SelectTrigger className="w-[140px] h-7">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="free">Free</SelectItem>
                        <SelectItem value="professional">Professional</SelectItem>
                        <SelectItem value="enterprise">Enterprise</SelectItem>
                        <SelectItem value="premium">Premium</SelectItem>
                      </SelectContent>
                    </Select>
                    <Badge variant={user.isActive ? "default" : "destructive"}>
                      {user.isActive ? "Active" : "Blocked"}
                    </Badge>
                  </div>
                </div>
              </div>
              <UserStatusToggle userId={user._id} isActive={user.isActive} onStatusChange={handleStatusChange} />
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Mail className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{user.email}</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">{user.phone || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Building className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm truncate">{user.organization || "Not provided"}</span>
                </div>
                <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <span className="text-sm">
                    {new Date(user.createdAt).toLocaleDateString("en-IN", { 
                      day: "numeric", month: "short", year: "numeric" 
                    })}
                  </span>
                </div>
              </div>

              {/* Delete User Section */}
              <div className="mt-6 pt-6 border-t">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-destructive">Danger Zone</p>
                    <p className="text-sm text-muted-foreground">
                      Delete this user and all their data permanently
                    </p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" size="sm">
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete User
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                          <AlertTriangle className="h-5 w-5 text-destructive" />
                          Delete User Account
                        </AlertDialogTitle>
                        <AlertDialogDescription className="space-y-2">
                          <p>Are you sure you want to delete <strong>{user.name}</strong>?</p>
                          <p>This will permanently delete:</p>
                          <ul className="list-disc list-inside text-sm space-y-1 mt-2">
                            <li>User account and profile</li>
                            <li>{stats.totalEvents} event(s)</li>
                            <li>{stats.totalCertificates} certificate type(s)</li>
                            <li>{stats.totalRecipients} recipient(s)</li>
                            <li>{payments.length} payment record(s)</li>
                          </ul>
                          <p className="text-destructive font-medium mt-3">This action cannot be undone!</p>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeleteUser}
                          disabled={deleting}
                          className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                        >
                          {deleting ? "Deleting..." : "Delete Permanently"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-4">
            <Card className="bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Calendar className="h-8 w-8 text-blue-600" />
                  <div>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalEvents}</p>
                    <p className="text-xs text-blue-600/70">Events</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <FileText className="h-8 w-8 text-purple-600" />
                  <div>
                    <p className="text-2xl font-bold text-purple-600">{stats.totalCertificates}</p>
                    <p className="text-xs text-purple-600/70">Certificate Types</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <Users className="h-8 w-8 text-green-600" />
                  <div>
                    <p className="text-2xl font-bold text-green-600">{stats.totalRecipients}</p>
                    <p className="text-xs text-green-600/70">Recipients</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Events */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Events</CardTitle>
                <Badge variant="secondary">{events.length} events</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No events created yet</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                  {events.map((event) => (
                    <div 
                      key={event._id} 
                      className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border cursor-pointer hover:bg-muted/70 transition-colors"
                      onClick={() => router.push(`/admin/events/${event._id}`)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Calendar className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{event.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {event.certificateTypesCount} types • {event.recipientsCount} recipients
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={event.isActive ? "default" : "secondary"}>
                          {event.isActive ? "Active" : "Inactive"}
                        </Badge>
                        <ExternalLink className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Payments */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Payment History</CardTitle>
                <Badge variant="secondary">{payments.length} payments</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No payment history</p>
              ) : (
                <div className="max-h-[300px] overflow-y-auto space-y-3 pr-2">
                  {payments.map((payment) => (
                    <div key={payment._id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border">
                      <div className="flex items-center gap-3">
                        <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${
                          payment.status === "success" ? "bg-green-500/10" : "bg-yellow-500/10"
                        }`}>
                          <CreditCard className={`h-5 w-5 ${
                            payment.status === "success" ? "text-green-600" : "text-yellow-600"
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium capitalize">{payment.plan} Plan</p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(payment.createdAt).toLocaleDateString("en-IN", {
                              day: "numeric", month: "short", year: "numeric"
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="font-bold text-lg">₹{(payment.amount / 100).toLocaleString()}</p>
                        <Badge variant={payment.status === "success" ? "default" : payment.status === "pending" ? "secondary" : "destructive"}>
                          {payment.status}
                        </Badge>
                      </div>
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
