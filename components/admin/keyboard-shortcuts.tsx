"use client"

import { useState, useEffect } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

const shortcuts = [
  { category: "Navigation", items: [
    { keys: ["G", "D"], description: "Go to Dashboard" },
    { keys: ["G", "U"], description: "Go to Users" },
    { keys: ["G", "E"], description: "Go to Events" },
    { keys: ["G", "R"], description: "Go to Revenue" },
    { keys: ["G", "A"], description: "Go to Analytics" },
    { keys: ["G", "S"], description: "Go to Settings" },
  ]},
  { category: "Actions", items: [
    { keys: ["⌘", "K"], description: "Open Command Palette" },
    { keys: ["?"], description: "Show Keyboard Shortcuts" },
    { keys: ["Esc"], description: "Close Dialog / Cancel" },
  ]},
  { category: "Tables", items: [
    { keys: ["↑", "↓"], description: "Navigate rows" },
    { keys: ["Enter"], description: "Open selected item" },
    { keys: ["⌘", "A"], description: "Select all (when available)" },
  ]},
]

export function KeyboardShortcuts() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const handleKeydown = (e: KeyboardEvent) => {
      // Don't trigger if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      
      if (e.key === "?" && !e.metaKey && !e.ctrlKey) {
        e.preventDefault()
        setOpen(true)
      }
      
      if (e.key === "Escape") {
        setOpen(false)
      }
    }

    document.addEventListener("keydown", handleKeydown)
    return () => document.removeEventListener("keydown", handleKeydown)
  }, [])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 py-4">
          {shortcuts.map((section) => (
            <div key={section.category}>
              <h4 className="text-sm font-medium text-muted-foreground mb-3">{section.category}</h4>
              <div className="space-y-2">
                {section.items.map((shortcut, index) => (
                  <div key={index} className="flex items-center justify-between">
                    <span className="text-sm">{shortcut.description}</span>
                    <div className="flex items-center gap-1">
                      {shortcut.keys.map((key, keyIndex) => (
                        <span key={keyIndex}>
                          <kbd className="px-2 py-1 bg-muted rounded text-xs font-mono">{key}</kbd>
                          {keyIndex < shortcut.keys.length - 1 && (
                            <span className="text-muted-foreground mx-1">+</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p className="text-xs text-muted-foreground text-center">
          Press <kbd className="px-1 py-0.5 bg-muted rounded text-[10px]">Esc</kbd> to close
        </p>
      </DialogContent>
    </Dialog>
  )
}
