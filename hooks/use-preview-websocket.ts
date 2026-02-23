import { useEffect, useRef, useCallback, useState } from "react"
import { io, Socket } from "socket.io-client"
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
    values: Record<string, string>
  }
}

export function usePreviewWebSocket() {
  const socket = useRef<Socket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [connected, setConnected] = useState(false)
  const [previewHtml, setPreviewHtml] = useState<string | null>(null)

  const connect = useCallback(() => {
    if (socket.current?.connected) return

    try {
      const newSocket = io(WS_BASE, {
        path: "/api/v1/preview/ws",
        transports: ["websocket"],
      })

      newSocket.on("connect", () => {
        setConnected(true)
      })

      newSocket.on("preview", (data) => {
        if (data.type === "preview" && data.html) {
          setPreviewHtml(data.html)
        }
      })

      newSocket.on("disconnect", () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      })

      newSocket.on("connect_error", () => {
        setConnected(false)
        reconnectTimer.current = setTimeout(connect, 3000)
      })

      socket.current = newSocket
    } catch {
      reconnectTimer.current = setTimeout(connect, 3000)
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current)
      socket.current?.disconnect()
    }
  }, [connect])

  const sendPreviewUpdate = useCallback(
    (values: CardFields) => {
      if (!socket.current?.connected) return

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

      socket.current.emit("preview", message)
    },
    []
  )

  return { connected, previewHtml, sendPreviewUpdate }
}
