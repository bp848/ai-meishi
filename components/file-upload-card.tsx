"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, ImageIcon, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 30 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".webp"]
const ACCEPTED_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]

function isPdf(file: File) {
  return file.type === "application/pdf"
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

interface FileUploadCardProps {
  label: string
  file: File | null
  preview: string | null
  onFileSelect: (file: File | null) => void
  onError: (message: string) => void
}

export function FileUploadCard({
  label,
  file,
  preview,
  onFileSelect,
  onError,
}: FileUploadCardProps) {
  const [isDragActive, setIsDragActive] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const validateAndSelect = useCallback(
    (f: File) => {
      if (!ACCEPTED_MIME_TYPES.includes(f.type)) {
        onError("PDF / JPEG / PNG / WebP 形式のファイルを選択してください")
        return
      }
      if (f.size > MAX_FILE_SIZE) {
        onError("ファイルサイズは30MB以下にしてください")
        return
      }
      onFileSelect(f)
    },
    [onFileSelect, onError]
  )

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragActive(false)
  }, [])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragActive(false)
      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) validateAndSelect(droppedFile)
    },
    [validateAndSelect]
  )

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0]
      if (selected) validateAndSelect(selected)
      e.target.value = ""
    },
    [validateAndSelect]
  )

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : file
              ? "border-border bg-card"
              : "border-muted-foreground/25 bg-card hover:border-primary/50 hover:bg-primary/5"
        )}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        aria-label={`${label}をアップロード`}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(",")}
          onChange={handleChange}
          className="sr-only"
          aria-label={`${label}のファイル選択`}
        />

        {file ? (
          <div className="flex flex-col items-center gap-3">
            {preview && !isPdf(file) ? (
              /* eslint-disable-next-line @next/next/no-img-element */
              <img
                src={preview}
                alt={`${label}プレビュー`}
                className="max-h-40 max-w-full rounded-md object-contain"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-xl bg-primary/10">
                <FileText className="h-10 w-10 text-primary" />
              </div>
            )}
            <div className="flex flex-col items-center gap-0.5">
              <div className="flex items-center gap-2 text-sm text-foreground">
                {isPdf(file) ? (
                  <FileText className="h-4 w-4 shrink-0 text-primary" />
                ) : (
                  <ImageIcon className="h-4 w-4 shrink-0 text-primary" />
                )}
                <span className="max-w-[200px] truncate font-medium">
                  {file.name}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {formatFileSize(file.size)}
              </span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRemove}
              className="text-destructive hover:text-destructive"
            >
              <X className="mr-1 h-4 w-4" />
              削除
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-muted-foreground">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary/10">
              <FileText className="h-7 w-7 text-primary" />
            </div>
            <div className="flex flex-col items-center gap-1">
              <p className="text-sm font-medium text-foreground">
                {isDragActive
                  ? "ドロップしてアップロード"
                  : "PDFをドラッグ&ドロップ"}
              </p>
              <p className="text-xs">
                {"またはクリックして選択"}
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground/70">
              {"PDF / JPEG / PNG / WebP (最大30MB)"}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
