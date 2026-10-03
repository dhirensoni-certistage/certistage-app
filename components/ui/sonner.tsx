"use client"

import type React from "react"

import { Toaster as Sonner, type ToasterProps } from "sonner"

// The portal is locked to the light theme (see app/layout.tsx), so the toast
// colours are set directly rather than through theme variables.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="toaster group"
      toastOptions={{
        classNames: {
          toast: "!bg-white !text-neutral-900 !border !border-neutral-200 !shadow-lg !rounded-xl",
          description: "!text-neutral-500",
          actionButton: "!bg-neutral-900 !text-white",
          cancelButton: "!bg-neutral-100 !text-neutral-900"
        }
      }}
      style={
        {
          "--normal-bg": "#ffffff",
          "--normal-text": "#171717",
          "--normal-border": "#e5e5e5",
          "--success-bg": "#ffffff",
          "--success-text": "#171717",
          "--success-border": "#e5e5e5",
          "--error-bg": "#ffffff",
          "--error-text": "#b91c1c",
          "--error-border": "#fecaca"
        } as React.CSSProperties
      }
      {...props}
    />
  )
}

export { Toaster }
