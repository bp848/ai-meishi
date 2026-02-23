"use client"

import { useCallback } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ACCEPTED_TYPES = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
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
  const onDrop = useCallback(
    (acceptedFiles: File[], rejectedFiles: unknown[]) => {
      if (rejectedFiles && (rejectedFiles as Array<unknown>).length > 0) {
        onError("JPEG/PNG/WebP形式で10MB以下のファイルを選択してください")
        return
      }
      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect, onError]
  )

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation()
    onFileSelect(null)
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-sm font-medium text-foreground">{label}</p>
      <div
        {...getRootProps()}
        className={cn(
          "relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors",
          isDragActive
            ? "border-primary bg-primary/5"
            : file
              ? "border-border bg-card"
              : "border-muted-foreground/25 bg-card hover:border-primary/50 hover:bg-primary/5"
        )}
      >
        <input {...getInputProps()} aria-label={`${label}をアップロード`} />

        {preview ? (
          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`${label}プレビュー`}
              className="max-h-40 max-w-full rounded-md object-contain"
            />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="h-4 w-4" />
              <span className="max-w-[180px] truncate">{file?.name}</span>
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
            <p className="text-xs">JPEG / PNG / WebP (最大10MB)</p>
          </div>
        )}
      </div>
    </div>
  )
}
