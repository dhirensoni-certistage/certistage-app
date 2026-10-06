"use client"

import { useEffect, useState } from "react"
import { Check, Loader2, Plus, Search, UserRound } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { EVENT_CATEGORIES } from "@/lib/event-categories"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

interface Owner { _id: string; name: string; email: string; plan: string }

export function CreateEventDialog({ open, onOpenChange, onCreated }: { open: boolean; onOpenChange: (open: boolean) => void; onCreated: () => void }) {
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [category, setCategory] = useState("other")
  const [ownerSearch, setOwnerSearch] = useState("")
  const [owners, setOwners] = useState<Owner[]>([])
  const [owner, setOwner] = useState<Owner | null>(null)
  const [loading, setLoading] = useState(false)
  const [ownerError, setOwnerError] = useState("")
  const [creating, setCreating] = useState(false)
  useEffect(() => {
    if (!open) return
    const controller = new AbortController()
    setLoading(true)
    setOwnerError("")
    const timeout = setTimeout(async () => {
      try {
        const params = new URLSearchParams({ search: ownerSearch.trim(), status: "active", limit: "5", sort: "name", direction: "asc" })
        const res = await fetch(`/api/admin/users?${params}`, { signal: controller.signal, cache: "no-store" })
        if (!res.ok) throw new Error("Unable to load owners. Change your search to retry.")
        const data = await res.json()
        if (!controller.signal.aborted) setOwners(data.users)
      } catch (error) {
        if (!controller.signal.aborted) setOwnerError(error instanceof Error ? error.message : "Unable to load owners")
      } finally { if (!controller.signal.aborted) setLoading(false) }
    }, 250)
    return () => { clearTimeout(timeout); controller.abort() }
  }, [open, ownerSearch])

  const create = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !owner) { toast.error("Enter an event name and select an owner"); return }
    setCreating(true)
    try {
      const res = await fetch("/api/admin/events", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: name.trim(), description: description.trim(), category, ownerId: owner._id }) })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || "Failed to create event")
      toast.success("Event created successfully")
      setName(""); setDescription(""); setCategory("other"); setOwner(null); setOwnerSearch("")
      onOpenChange(false)
      onCreated()
    } catch (error) { toast.error(error instanceof Error ? error.message : "Failed to create event") }
    finally { setCreating(false) }
  }

  return <Dialog open={open} onOpenChange={value => { if (!creating) onOpenChange(value) }}>
    <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[520px]">
      <DialogHeader><DialogTitle className="flex items-center gap-2"><Plus className="h-5 w-5 text-gold-deep" />Create Event</DialogTitle><DialogDescription>Create an event for a registered user. Their plan’s event limit applies.</DialogDescription></DialogHeader>
      <form onSubmit={create} className="space-y-5">
        <div className="space-y-2"><Label htmlFor="event-name">Event name <span className="text-red-500">*</span></Label><Input id="event-name" placeholder="e.g. Global Tech Summit 2026" value={name} onChange={event => setName(event.target.value)} maxLength={200} required disabled={creating} /></div>
        <div className="space-y-2"><Label htmlFor="event-owner-search">Event owner <span className="text-red-500">*</span></Label>
          {owner && <div className="flex items-center gap-3 rounded-lg border border-gold/30 bg-gold-soft/40 p-3"><UserRound className="h-4 w-4 text-gold-deep" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{owner.name}</p><p className="truncate text-xs text-neutral-500">{owner.email}</p></div><Button type="button" variant="ghost" size="sm" disabled={creating} onClick={() => setOwner(null)}>Change</Button></div>}
          {!owner && <><div className="relative"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-400" /><Input id="event-owner-search" aria-label="Search event owners" value={ownerSearch} onChange={event => setOwnerSearch(event.target.value)} placeholder="Search users by name or email..." className="pl-9" disabled={creating} /></div>
            <div className="max-h-44 overflow-y-auto rounded-lg border border-neutral-200" aria-label="Event owners">
              {loading ? <div className="flex items-center justify-center gap-2 p-5 text-xs text-neutral-500"><Loader2 className="h-4 w-4 animate-spin" />Loading owners…</div> : ownerError ? <p role="alert" className="p-4 text-xs text-red-600">{ownerError}</p> : owners.length ? owners.map(item => <button key={item._id} type="button" disabled={creating} className={cn("flex w-full items-center gap-3 border-b border-neutral-100 p-3 text-left last:border-0 hover:bg-neutral-50 focus-visible:bg-neutral-50")} onClick={() => setOwner(item)}><div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-xs text-gold-deep">{(item.name || item.email).charAt(0).toUpperCase()}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.name}</p><p className="truncate text-xs text-neutral-500">{item.email}</p></div><Check className="h-4 w-4 text-neutral-300" /></button>) : <p className="p-5 text-center text-xs text-neutral-500">No active users match this search.</p>}
            </div></>}
        </div>
        <div className="space-y-2"><Label htmlFor="event-category">Category</Label><Select value={category} onValueChange={setCategory} disabled={creating}><SelectTrigger id="event-category" className="w-full"><SelectValue /></SelectTrigger><SelectContent>{EVENT_CATEGORIES.map(item => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-2"><Label htmlFor="event-description">Description <span className="font-normal text-neutral-400">(optional)</span></Label><Textarea id="event-description" placeholder="A short description of the event" value={description} onChange={event => setDescription(event.target.value)} maxLength={2000} rows={3} disabled={creating} /></div>
        <DialogFooter><Button type="button" variant="outline" disabled={creating} onClick={() => onOpenChange(false)}>Cancel</Button><Button type="submit" variant="outline" disabled={creating || !name.trim() || !owner} className="border-gold/35 bg-white text-gold-deep hover:border-gold/60 hover:bg-gold-soft/60 hover:text-gold-deep">{creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}{creating ? "Creating…" : "Create Event"}</Button></DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
}
