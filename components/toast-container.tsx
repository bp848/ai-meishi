"use client"

import { useToastStore, type ToastVariant } from "@/hooks/use-toast"
import { X } from "lucide-react"
import { cn } from "@/lib/utils"

const variantStyles: Record<ToastVariant, string> = {
  default: "bg-card text-card-foreground border-border",
  success: "bg-success text-success-foreground border-success",
  destructive:
    "bg-destructive text-destructive-foreground border-destructive",
}

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore()

  if (toasts.length === 0) return null

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            "flex items-start gap-3 rounded-lg border p-4 shadow-lg animate-in slide-in-from-bottom-5 min-w-[300px] max-w-[420px]",
            variantStyles[toast.variant]
          )}
          role="alert"
        >
          <div className="flex-1">
            <p className="text-sm font-semibold">{toast.title}</p>
            {toast.description && (
              <p className="mt-1 text-sm opacity-90">{toast.description}</p>
            )}
          </div>
          <button
            onClick={() => removeToast(toast.id)}
            className="shrink-0 opacity-70 hover:opacity-100"
            aria-label="閉じる"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
