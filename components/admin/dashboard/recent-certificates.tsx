"use client"

import Link from "next/link"
import { Award, CheckCircle2, MailX, Mail } from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { DashboardCard } from "@/components/admin/dashboard/dashboard-card"
import { cn } from "@/lib/utils"

export interface RecentCertificate {
  id: string
  name: string
  email: string
  eventId: string | null
  eventName: string
  certificateTypeName: string
  templateImage: string
  downloaded: boolean
  emailStatus: "sent" | "failed" | null
  createdAt: string
}

interface RecentCertificatesProps {
  certificates: RecentCertificate[]
  loading?: boolean
}

function StatusPill({ tone, children }: { tone: "success" | "warning"; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium",
        tone === "success" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"
      )}
    >
      <span className={cn("h-1.5 w-1.5 rounded-full", tone === "success" ? "bg-emerald-500" : "bg-amber-500")} />
      {children}
    </span>
  )
}

function EmailPill({ status }: { status: RecentCertificate["emailStatus"] }) {
  if (status === "sent") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
        <CheckCircle2 className="h-3.5 w-3.5" />
        Sent
      </span>
    )
  }
  if (status === "failed") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-medium text-red-700">
        <MailX className="h-3.5 w-3.5" />
        Failed
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-neutral-200 bg-neutral-50 px-2.5 py-1 text-xs font-medium text-neutral-600">
      <Mail className="h-3.5 w-3.5" />
      Not sent
    </span>
  )
}

export function RecentCertificates({ certificates, loading }: RecentCertificatesProps) {
  return (
    <DashboardCard title="Recent Certificates" description="Latest certificates issued on your platform" contentClassName="px-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm min-w-[820px]">
          <thead>
            <tr className="bg-neutral-50 text-[11px] font-medium uppercase tracking-wide text-neutral-500">
              <th className="text-left font-medium px-5 py-2.5">Certificate</th>
              <th className="text-left font-medium px-3 py-2.5">Recipient</th>
              <th className="text-left font-medium px-3 py-2.5">Event</th>
              <th className="text-left font-medium px-3 py-2.5">Issued on</th>
              <th className="text-left font-medium px-3 py-2.5">Download</th>
              <th className="text-left font-medium px-5 py-2.5">Email</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {loading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  <td className="px-5 py-3" colSpan={6}><Skeleton className="h-10 w-full" /></td>
                </tr>
              ))
            ) : certificates.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-neutral-500">No certificates issued yet</td>
              </tr>
            ) : (
              certificates.map((cert) => {
                const issuedAt = new Date(cert.createdAt)
                return (
                  <tr key={cert.id} className="hover:bg-neutral-50/60 transition-colors">
                    <td className="px-5 py-3">
                      <div
                        className="h-10 w-14 rounded-md border border-gold/30 bg-[#FFFDF8] overflow-hidden flex items-center justify-center"
                        title={cert.certificateTypeName || undefined}
                      >
                        {cert.templateImage ? (
                          <img src={cert.templateImage} alt={cert.certificateTypeName || "Certificate"} loading="lazy" className="h-full w-full object-cover" />
                        ) : (
                          <Award className="h-4 w-4 text-gold" strokeWidth={1.75} />
                        )}
                      </div>
                    </td>
                    <td className="px-3 py-3 max-w-[220px]">
                      <p className="font-medium text-[13px] text-neutral-900 truncate">{cert.name}</p>
                      {cert.email && <p className="text-xs text-neutral-500 truncate">{cert.email}</p>}
                    </td>
                    <td className="px-3 py-3 max-w-[220px] text-[13px] text-neutral-800">
                      {cert.eventId ? (
                        <Link href={`/admin/events/${cert.eventId}`} className="block truncate hover:underline underline-offset-4">{cert.eventName}</Link>
                      ) : (
                        <span className="block truncate text-neutral-500">{cert.eventName}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 whitespace-nowrap">
                      <p className="text-[13px] text-neutral-900">{issuedAt.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</p>
                      <p className="text-xs text-neutral-500">{issuedAt.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}</p>
                    </td>
                    <td className="px-3 py-3">
                      {cert.downloaded
                        ? <StatusPill tone="success">Downloaded</StatusPill>
                        : <StatusPill tone="warning">Not downloaded</StatusPill>}
                    </td>
                    <td className="px-5 py-3">
                      <EmailPill status={cert.emailStatus} />
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </DashboardCard>
  )
}
