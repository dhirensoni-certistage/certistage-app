"use client"

import { cn } from "@/lib/utils"
import { EVENT_CATEGORIES, STANDARD_COLUMNS, categoryColumns } from "@/lib/event-categories"

// "What kind of event is this?" with a preview of the Excel columns that choice gives.
// Optional: "" means not chosen (standard columns only).
export function EventCategoryPicker({ value, onChange, disabled }: { value: string; onChange: (id: string) => void; disabled?: boolean }) {
  const extra = categoryColumns(value)
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        {EVENT_CATEGORIES.map((c) => (
          <button
            key={c.id}
            type="button"
            disabled={disabled}
            onClick={() => onChange(value === c.id ? "" : c.id)}
            aria-pressed={value === c.id}
            className={cn(
              "h-auto min-h-9 px-3 py-2 rounded-md border text-left text-[13px] leading-snug transition-colors",
              value === c.id ? "border-neutral-900 bg-neutral-900 text-white" : "border-neutral-200 bg-white text-neutral-700 hover:border-neutral-400"
            )}
          >
            {c.label}
          </button>
        ))}
      </div>
      <div className="rounded-md bg-neutral-50 border border-neutral-200 px-3 py-2.5">
        <p className="text-[12px] text-neutral-600">Your recipient Excel will have these columns:</p>
        <p className="text-[12px] text-neutral-500 mt-1 leading-relaxed">
          {STANDARD_COLUMNS.join(" · ")}
          {extra.length > 0 && (
            <> · <span className="font-medium text-neutral-900">{extra.join(" · ")}</span></>
          )}
        </p>
        <p className="text-[11px] text-neutral-400 mt-1.5">You can add or remove columns any time; any extra column can be printed on the certificate.</p>
      </div>
    </div>
  )
}
