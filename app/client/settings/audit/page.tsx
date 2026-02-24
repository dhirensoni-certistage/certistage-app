"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Loader2, ShieldAlert, CheckCircle2, AlertTriangle, XCircle } from "lucide-react"
import { format } from "date-fns"

interface LogEntry {
    _id: string
    action: string
    details?: any
    status: "SUCCESS" | "FAILURE" | "WARNING"
    ipAddress?: string
    createdAt: string
}

export default function AuditLogPage() {
    const [logs, setLogs] = useState<LogEntry[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        const fetchLogs = async () => {
            try {
                const res = await fetch("/api/client/settings/audit")
                if (res.ok) {
                    const data = await res.json()
                    setLogs(data.logs || [])
                }
            } catch (error) {
                console.error("Failed to load logs", error)
            }
            setIsLoading(false)
        }

        fetchLogs()
    }, [])

    if (isLoading) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Audit Logs</h1>
                <p className="text-muted-foreground">
                    View security events and actions taken within your account.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <ShieldAlert className="h-5 w-5 text-primary" />
                        <CardTitle>Security Events</CardTitle>
                    </div>
                    <CardDescription>
                        A comprehensive log of sensitive actions.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Action</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Details</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {logs.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="h-24 text-center">
                                            No logs found.
                                        </TableCell>
                                    </TableRow>
                                ) : (
                                    logs.map((log) => (
                                        <TableRow key={log._id}>
                                            <TableCell>
                                                {log.status === "SUCCESS" && <CheckCircle2 className="h-4 w-4 text-neutral-500" />}
                                                {log.status === "WARNING" && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                                                {log.status === "FAILURE" && <XCircle className="h-4 w-4 text-red-500" />}
                                            </TableCell>
                                            <TableCell className="font-medium">{log.action}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm font-mono">{log.ipAddress || "â€”"}</TableCell>
                                            <TableCell className="text-muted-foreground text-sm">
                                                {format(new Date(log.createdAt), "MMM d, yyyy HH:mm:ss")}
                                            </TableCell>
                                            <TableCell className="text-muted-foreground text-xs font-mono max-w-[200px] truncate">
                                                {log.details ? JSON.stringify(log.details) : "â€”"}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}

