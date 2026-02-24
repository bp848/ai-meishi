import { useCallback, useState } from "react"
import type { CardFields } from "@/lib/types"

/**
 * WebSocket preview is disabled in production (no WS server on Vercel).
 * This hook provides a no-op implementation so the editor still works.
 */
export function usePreviewWebSocket() {
  const [connected] = useState(false)
  const [previewHtml] = useState<string | null>(null)

  const sendPreviewUpdate = useCallback((_values: CardFields) => {
    // no-op: real-time preview runs client-side only
  }, [])

  return { connected, previewHtml, sendPreviewUpdate }
}
