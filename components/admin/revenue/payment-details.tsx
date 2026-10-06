"use client"

import Link from "next/link"
import { Copy, ExternalLink, ReceiptText } from "lucide-react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { formatMoney, paymentStatusLabels, type RevenuePayment } from "@/lib/admin-revenue"
import { toast } from "sonner"

export function PaymentDetails({ payment, onClose }: { payment: RevenuePayment | null; onClose: () => void }) {
  const copy = async (value: string) => { try { await navigator.clipboard.writeText(value); toast.success("Copied") } catch { toast.error("Unable to copy") } }
  return <Dialog open={Boolean(payment)} onOpenChange={open => { if (!open) onClose() }}><DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
    <DialogHeader><DialogTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-gold-deep" />Transaction details</DialogTitle><DialogDescription>Customer, collection and payment reference information.</DialogDescription></DialogHeader>
    {payment && <div className="space-y-5"><div className="rounded-lg border border-neutral-200 bg-neutral-50 p-4"><p className="text-[28px] font-semibold tracking-tight">{formatMoney(payment.amountPaise, payment.currency)}</p><p className="mt-1 text-xs text-neutral-500">{paymentStatusLabels[payment.status]} · {payment.itemName}</p>{payment.refundPaise > 0 && <p className="mt-2 text-xs text-amber-700">{formatMoney(payment.refundPaise, payment.currency)} refunded · {formatMoney(payment.amountPaise - payment.refundPaise, payment.currency)} retained</p>}</div>
      <div><p className="text-sm font-medium">{payment.user.name}</p><p className="mt-1 text-xs text-neutral-500">{payment.user.email || "Customer account no longer available"}</p>{payment.user._id && <Link href={`/admin/users/${payment.user._id}`} className="mt-2 inline-flex items-center gap-1 text-xs text-gold-deep hover:underline">View customer<ExternalLink className="h-3 w-3" /></Link>}</div>
      <dl className="divide-y divide-neutral-100 rounded-lg border border-neutral-200 px-4">{[
        ["Order ID", payment.orderId], ["Payment ID", payment.paymentId], ["Invoice", payment.invoiceNumber], ["Purchase type", payment.kind === "addon" ? "Add-on" : "Plan"], ["Order date (IST)", new Date(payment.createdAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" })], ["Refund date (IST)", payment.refundedAt ? new Date(payment.refundedAt).toLocaleString("en-IN", { timeZone: "Asia/Kolkata", dateStyle: "medium", timeStyle: "short" }) : undefined],
      ].map(([label, value]) => <div key={label} className="flex items-start justify-between gap-4 py-3"><dt className="shrink-0 text-xs text-neutral-400">{label}</dt><dd className="flex min-w-0 items-center gap-2 text-right text-xs text-neutral-700"><span className="break-all">{value || "—"}</span>{value && ["Order ID", "Payment ID", "Invoice"].includes(label!) && <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" aria-label={`Copy ${label}`} onClick={() => copy(value)}><Copy className="h-3 w-3" /></Button>}</dd></div>)}</dl>
      {payment.failureReason && <div className="rounded-lg border border-red-100 bg-red-50 p-3 text-xs text-red-700"><p className="font-medium">Failure reason</p><p className="mt-1">{payment.failureReason}</p></div>}
    </div>}
  </DialogContent></Dialog>
}
