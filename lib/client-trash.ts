"use client"

import { toast } from "sonner"

/** Put a deleted batch back. Returns an error message when it could not be restored. */
export async function restoreDeleted(batchId: string): Promise<{ ok: boolean; error?: string; recipients?: number; certificateTypes?: number }> {
  try {
    const res = await fetch("/api/client/trash", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ batchId })
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) return { ok: false, error: data.error || "Could not restore" }
    return { ok: true, ...data.restored }
  } catch {
    return { ok: false, error: "Could not restore. Check your connection." }
  }
}

/** "Deleted" toast with an Undo action that restores the batch. */
export function toastDeleted(message: string, batchId: string | undefined, onRestored: () => void) {
  if (!batchId) {
    toast.success(message)
    return
  }
  toast.success(message, {
    description: "You can restore it from Recently deleted for 30 days.",
    duration: 8000,
    action: {
      label: "Undo",
      onClick: async () => {
        const result = await restoreDeleted(batchId)
        if (result.ok) {
          toast.success("Restored")
          onRestored()
        } else {
          toast.error(result.error || "Could not restore")
        }
      }
    }
  })
}
