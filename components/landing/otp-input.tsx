"use client"

import { useEffect, useRef } from "react"
import { motion, useReducedMotion } from "framer-motion"
import { cn } from "@/lib/utils"

interface OtpInputProps {
  length?: number
  value: string
  onChange: (value: string) => void
  onComplete?: (value: string) => void
  disabled?: boolean
  status?: "idle" | "error" | "success"
  autoFocus?: boolean
}

/**
 * Six-box one-time-code input. Typing advances, Backspace retreats, arrow keys
 * move, and a pasted or autofilled code fills every box at once.
 */
export function OtpInput({ length = 6, value, onChange, onComplete, disabled, status = "idle", autoFocus = true }: OtpInputProps) {
  const refs = useRef<(HTMLInputElement | null)[]>([])
  const reduceMotion = useReducedMotion()
  const digits = Array.from({ length }, (_, i) => value[i] || "")

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus()
  }, [autoFocus])

  const commit = (next: string) => {
    const clean = next.replace(/\D/g, "").slice(0, length)
    onChange(clean)
    if (clean.length === length) onComplete?.(clean)
  }

  const handleChange = (index: number, raw: string) => {
    const incoming = raw.replace(/\D/g, "")
    if (!incoming) return
    if (incoming.length > 1) {
      // autofill or paste landed in one box
      commit(value.slice(0, index) + incoming)
      refs.current[Math.min(length - 1, index + incoming.length)]?.focus()
      return
    }
    const next = (value.slice(0, index) + incoming + value.slice(index + 1)).slice(0, length)
    commit(next)
    refs.current[Math.min(length - 1, index + 1)]?.focus()
  }

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace") {
      e.preventDefault()
      if (digits[index]) {
        commit(value.slice(0, index) + value.slice(index + 1))
      } else if (index > 0) {
        commit(value.slice(0, index - 1) + value.slice(index))
        refs.current[index - 1]?.focus()
      }
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs.current[index - 1]?.focus()
    } else if (e.key === "ArrowRight" && index < length - 1) {
      refs.current[index + 1]?.focus()
    }
  }

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text").replace(/\D/g, "")
    if (!text) return
    e.preventDefault()
    commit(text)
    refs.current[Math.min(length - 1, text.length)]?.focus()
  }

  return (
    <motion.div
      className="flex items-center justify-between gap-2"
      animate={status === "error" && !reduceMotion ? { x: [0, -8, 8, -6, 6, -3, 3, 0] } : { x: 0 }}
      transition={{ duration: 0.45 }}
      role="group"
      aria-label={`${length}-digit code`}
    >
      {digits.map((digit, i) => (
        <motion.input
          key={i}
          ref={(el) => { refs.current[i] = el }}
          initial={reduceMotion ? false : { opacity: 0, y: 10, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: reduceMotion ? 0 : 0.05 * i, duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          maxLength={length}
          value={digit}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          onFocus={(e) => e.target.select()}
          className={cn(
            "h-14 w-12 sm:w-[52px] rounded-xl border text-center text-2xl font-semibold tabular-nums tracking-wider outline-none transition-all",
            "bg-white text-neutral-900 caret-gold-deep",
            status === "error"
              ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-200"
              : status === "success"
                ? "border-gold bg-gold-soft text-gold-deep"
                : digit
                  ? "border-neutral-900 focus:ring-2 focus:ring-gold/30 focus:border-gold"
                  : "border-neutral-200 focus:border-gold focus:ring-2 focus:ring-gold/30",
            disabled && "opacity-60"
          )}
        />
      ))}
    </motion.div>
  )
}
