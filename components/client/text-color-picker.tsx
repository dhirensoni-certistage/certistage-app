"use client"

import { useEffect, useState } from "react"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

export const DEFAULT_TEXT_COLOR = "#000000"

// Common certificate text colors offered as one-click presets
export const TEXT_COLOR_PRESETS: { value: string; label: string }[] = [
  { value: "#000000", label: "Black" },
  { value: "#ffffff", label: "White" },
  { value: "#1f2937", label: "Charcoal" },
  { value: "#1e3a8a", label: "Navy" },
  { value: "#b91c1c", label: "Red" },
  { value: "#b45309", label: "Gold" },
  { value: "#166534", label: "Green" },
  { value: "#6b21a8", label: "Purple" },
]

const FULL_HEX = /^#[0-9a-fA-F]{6}$/
const SHORT_HEX = /^#[0-9a-fA-F]{3}$/

// Returns a normalized "#rrggbb" string, or null when the input is not a valid hex color
export function normalizeHexColor(value: string): string | null {
  const trimmed = value.trim()
  const withHash = trimmed.startsWith("#") ? trimmed : `#${trimmed}`
  if (FULL_HEX.test(withHash)) return withHash.toLowerCase()
  if (SHORT_HEX.test(withHash)) {
    return `#${withHash.slice(1).split("").map((c) => c + c).join("")}`.toLowerCase()
  }
  return null
}

interface TextColorPickerProps {
  value?: string
  onChange: (color: string) => void
  className?: string
  compact?: boolean
}

export function TextColorPicker({ value, onChange, className, compact = false }: TextColorPickerProps) {
  const current = normalizeHexColor(value || "") || DEFAULT_TEXT_COLOR
  const [draft, setDraft] = useState(current)

  // Keep the text box in sync when the color changes from outside (preset click, field switch)
  useEffect(() => {
    setDraft(current)
  }, [current])

  const commitDraft = () => {
    const normalized = normalizeHexColor(draft)
    if (normalized) {
      if (normalized !== current) onChange(normalized)
      setDraft(normalized)
    } else {
      setDraft(current)
    }
  }

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <label
          className={cn(
            "relative shrink-0 rounded-md border border-[#E5E5E5] overflow-hidden cursor-pointer shadow-sm",
            compact ? "h-8 w-8" : "h-9 w-9"
          )}
          style={{ backgroundColor: current }}
          title="Pick a color"
        >
          <input
            type="color"
            value={current}
            onChange={(e) => onChange(e.target.value)}
            className="absolute inset-0 h-full w-full opacity-0 cursor-pointer"
            aria-label="Text color"
          />
        </label>
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commitDraft}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault()
              commitDraft()
            }
          }}
          spellCheck={false}
          maxLength={7}
          placeholder="#000000"
          aria-label="Text color hex value"
          className={cn("font-mono uppercase", compact ? "h-8 text-xs" : "h-9 text-sm")}
        />
      </div>
      <div className="flex flex-wrap gap-1.5">
        {TEXT_COLOR_PRESETS.map((preset) => {
          const selected = preset.value === current
          return (
            <button
              key={preset.value}
              type="button"
              onClick={() => onChange(preset.value)}
              title={preset.label}
              aria-label={`${preset.label} text`}
              aria-pressed={selected}
              className={cn(
                "h-6 w-6 rounded-full border transition-transform hover:scale-110",
                selected ? "border-blue-600 ring-2 ring-blue-400/30" : "border-[#D4D4D4]"
              )}
              style={{ backgroundColor: preset.value }}
            />
          )
        })}
      </div>
    </div>
  )
}
