"use client"

import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { EmailPacks } from "@/components/client/email-packs"

/** "Buy emails" popup, opened wherever emails run out (Email certificates dialog, Email log) */
export function BuyEmailsDialog({ open, onOpenChange, onBought }: { open: boolean; onOpenChange: (open: boolean) => void; onBought?: (emails: number) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Buy certificate emails</DialogTitle>
          <DialogDescription>
            One-time packs, paid by UPI, card or net banking. They are used after your plan&apos;s emails and never expire.
          </DialogDescription>
        </DialogHeader>
        <EmailPacks compact onBought={(emails) => { onBought?.(emails); onOpenChange(false) }} />
      </DialogContent>
    </Dialog>
  )
}
