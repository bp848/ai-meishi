import { useEffect, useRef, useCallback, useState } from "react"
import type { CardFields } from "@/lib/types"

const WS_BASE =
  process.env.NEXT_PUBLIC_WS_URL ?? "ws://localhost:8000"

interface PreviewMessage {
  type: "preview"
  payload: {
    template: {
      id: string
      name: string
      width_mm: number
      height_mm: number
      fields: Array<{
        key: string
        label: string
        x: number
        y: number
        fontSize: number
        fontWeight: string
        color: string
      }>
    }
    values: CardFields
  }
}

export function usePreviewWebSocket() {
  const ws = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return

    try {
      const socket = new WebSocket(`${WS_BASE}/api/v1/preview/ws`)

      socket.onopen = () => {
        setConnected(true)
      }

      socket.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data)
          if (data.type === "preview" && data.html) {
            setPreviewHtml(data.html)
          }
        } catch {
          // ignore parse errors
        }
      }

      socket.onclose = () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      }

      socket.onerror = () => {
        socket.close()
      }

      ws.current = socket
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      ws.current?.close()
    }
  }, [connect])

  const sendPreviewUpdate = useCallback(
    (values: CardFields) => {
      if (ws.current?.readyState !== WebSocket.OPEN) return

      const message: PreviewMessage = {
        type: "preview",
        payload: {
          template: {
            id: "default",
            name: "Standard Business Card",
            width_mm: 91,
            height_mm: 55,
            fields: [
              { key: "company", label: "会社名", x: 10, y: 8, fontSize: 10, fontWeight: "bold", color: "#1a1a1a" },
              { key: "name", label: "氏名", x: 10, y: 20, fontSize: 16, fontWeight: "bold", color: "#1a1a1a" },
              { key: "title", label: "役職", x: 10, y: 28, fontSize: 9, fontWeight: "normal", color: "#555" },
              { key: "email", label: "メール", x: 10, y: 38, fontSize: 8, fontWeight: "normal", color: "#333" },
              { key: "phone", label: "電話", x: 10, y: 43, fontSize: 8, fontWeight: "normal", color: "#333" },
              { key: "address", label: "住所", x: 10, y: 48, fontSize: 7, fontWeight: "normal", color: "#555" },
              { key: "website", label: "Web", x: 10, y: 52, fontSize: 7, fontWeight: "normal", color: "#2563eb" },
            ],
          },
          values,
        },
      }

      ws.current.send(JSON.stringify(message))
    },
    []
  )

  return { connected, previewHtml, sendPreviewUpdate }
}
