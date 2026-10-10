"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { LogOut, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export function LogoutConfirmation({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const pending = useRef(false)

  async function logout() {
    if (pending.current) return
    pending.current = true
    setLoading(true)
    try {
      const response = await fetch("/api/admin/logout", { method: "POST" })
      if (!response.ok) throw new Error("Logout failed")
      onOpenChange(false)
      toast.success("Logged out successfully")
      router.replace("/admin/login")
      router.refresh()
    } catch {
      toast.error("Logout failed. Please try again.")
    } finally {
      pending.current = false
      setLoading(false)
    }
  }

  return <Dialog open={open} onOpenChange={value => { if (!pending.current) onOpenChange(value) }}>
    <DialogContent className="sm:max-w-md" showCloseButton={!loading}>
      <DialogHeader>
        <div className="mb-2 flex h-11 w-11 items-center justify-center rounded-xl bg-gold-soft text-gold-deep"><LogOut className="h-5 w-5" /></div>
        <DialogTitle>Confirm logout</DialogTitle>
        <DialogDescription>Are you sure you want to log out of your admin account?</DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" disabled={loading} onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="outline" className="border-gold/35 bg-white text-gold-deep hover:bg-gold-soft" disabled={loading} onClick={logout}>
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
          {loading ? "Logging out…" : "Yes, logout"}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
}
