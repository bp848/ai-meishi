"use client"

import { useCallback, useRef, useState } from "react"
import { Upload, X, ImageIcon, FileText } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 20 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
const ACCEPTED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]

function isPdf(file: File) {
  return file.type === "application/pdf"
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
        onError("JPEG / PNG / WebP / PDF 形式のファイルを選択してください")
        return
      }
      if (f.size > MAX_FILE_SIZE) {
        onError("ファイルサイズは20MB以下にしてください")
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
              <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-12 w-12 text-primary" />
              </div>
            )}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {isPdf(file) ? (
                <FileText className="h-4 w-4" />
              ) : (
                <ImageIcon className="h-4 w-4" />
              )}
              <span className="max-w-[180px] truncate">{file.name}</span>
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
          <div className="flex flex-col items-center gap-2 text-muted-foreground">
            <Upload className="h-8 w-8" />
            <p className="text-sm font-medium">
              {isDragActive
                ? "ドロップしてアップロード"
                : "クリックまたはドラッグ&ドロップ"}
            </p>
            <p className="text-xs">{"JPEG / PNG / WebP / PDF (最大20MB)"}</p>
          </div>
        )}
      </div>
    </div>
  )
}
