"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { Header } from "@/components/header"
import { BusinessCardPreview } from "@/components/business-card-preview"
import { FieldEditor } from "@/components/field-editor"
import { ExportButton } from "@/components/export-button"
import { ToastContainer } from "@/components/toast-container"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, RotateCcw } from "lucide-react"
import type { CardFieldKey } from "@/lib/types"
import { DEFAULT_CARD_FIELDS } from "@/lib/types"
import { usePreviewWebSocket } from "@/hooks/use-preview-websocket"

export default function EditorPage() {
  const router = useRouter()
  const { fieldValues, updateFieldValue, setFieldValues, reset } = useAppStore()
  const { connected, sendPreviewUpdate } = usePreviewWebSocket()

  // If no data, still allow manual editing with defaults
  useEffect(() => {
    const hasData = Object.values(fieldValues).some((v) => v !== "")
    if (!hasData) {
      // Allow user to stay and edit manually
    }
  }, [fieldValues])

  // Send preview updates via WebSocket on field change
  useEffect(() => {
    if (connected) {
      sendPreviewUpdate(fieldValues)
    }
  }, [fieldValues, connected, sendPreviewUpdate])

  const handleFieldChange = (key: CardFieldKey, value: string) => {
    updateFieldValue(key, value)
  }

  const handleReset = () => {
    setFieldValues({ ...DEFAULT_CARD_FIELDS })
  }

  const handleBack = () => {
    reset()
    router.push("/")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          {/* Top bar */}
          <div className="mb-6 flex items-center justify-between">
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              戻る
            </Button>
            <div className="flex items-center gap-2">
              {connected && (
                <span className="flex items-center gap-1.5 text-xs text-success">
                  <span className="h-1.5 w-1.5 rounded-full bg-success" />
                  リアルタイム接続中
                </span>
              )}
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                リセット
              </Button>
            </div>
          </div>

          {/* Editor grid */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Left: Preview */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="p-6">
                  <BusinessCardPreview fields={fieldValues} />
                </CardContent>
              </Card>

              {/* Uploaded image reference */}
              <UploadedImageRef />
            </div>

            {/* Right: Field editor */}
            <Card>
              <CardContent className="flex flex-col gap-6 p-6">
                <FieldEditor
                  fields={fieldValues}
                  onFieldChange={handleFieldChange}
                />
                <Separator />
                <ExportButton />
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

function UploadedImageRef() {
  const frontPreview = useAppStore((s) => s.frontPreview)
  const frontFile = useAppStore((s) => s.frontFile)

  if (!frontFile) return null

  const isPdf = frontFile.type === "application/pdf"

  return (
    <Card>
      <CardContent className="p-4">
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          アップロードファイル
        </p>
        {frontPreview && !isPdf ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={frontPreview}
            alt="アップロードされた名刺画像"
            className="w-full rounded-md object-contain"
          />
        ) : (
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <svg
                className="h-6 w-6 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z"
                />
              </svg>
            </div>
            <div className="flex flex-col gap-0.5">
              <span className="text-sm font-medium text-foreground">
                {frontFile.name}
              </span>
              <span className="text-xs text-muted-foreground">
                {(frontFile.size / 1024).toFixed(0)} KB
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
