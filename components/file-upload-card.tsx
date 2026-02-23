"use client"

import { useCallback, useState } from "react"
import { useDropzone } from "react-dropzone"
import { Upload, X, ImageIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

const MAX_FILE_SIZE = 10 * 1024 * 1024
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp", ".pdf"]
const ACCEPTED_MIME_TYPES = ["image/jpeg", "image/png", "image/webp", "application/pdf"]

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

  const onDrop = useCallback(
    (acceptedFiles: File[], fileRejections: any[]) => {
      if (fileRejections.length > 0) {
        const rejection = fileRejections[0]
        if (rejection.errors.some((e: any) => e.code === "file-too-large")) {
          onError("ファイルサイズは10MB以下にしてください")
        } else if (rejection.errors.some((e: any) => e.code === "file-invalid-type")) {
          onError("JPEG/PNG/WebP/PDF形式のファイルを選択してください")
        } else {
          onError("ファイルのアップロードに失敗しました")
        }
        return
      }

      if (acceptedFiles.length > 0) {
        onFileSelect(acceptedFiles[0])
      }
    },
    [onFileSelect, onError]
  )

  const { getRootProps, getInputProps, isDragActive: dropzoneActive } = useDropzone({
    onDrop,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp"],
      "application/pdf": [".pdf"],
    },
    maxSize: MAX_FILE_SIZE,
    multiple: false,
  })

  const handleRemove = () => {
    onFileSelect(null)
  }

  return (
    <div className="relative">
      <div
        {...getRootProps()}
        className={cn(
          "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
          "hover:border-primary/50 hover:bg-muted/50",
          (dropzoneActive || isDragActive) && "border-primary bg-primary/5",
          file && "border-primary bg-primary/10"
        )}
      >
        <input {...getInputProps()} />
        
        {file ? (
          <div className="space-y-4">
            {preview && (
              <div className="mx-auto w-24 h-24 rounded-md overflow-hidden bg-muted">
                {file.type === "application/pdf" ? (
                  <div className="w-full h-full flex items-center justify-center">
                    <ImageIcon className="w-8 h-8 text-muted-foreground" />
                  </div>
                ) : (
                  <img
                    src={preview}
                    alt="プレビュー"
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            )}
            <div className="text-sm">
              <p className="font-medium text-foreground">{file.name}</p>
              <p className="text-muted-foreground">
                {(file.size / 1024 / 1024).toFixed(2)} MB
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                handleRemove()
              }}
            >
              <X className="w-4 h-4 mr-1" />
              削除
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Upload className="w-6 h-6 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                {dropzoneActive ? "ファイルをドロップ" : label}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                クリックまたはドラッグ＆ドロップ
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, WebP, PDF (最大10MB)
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
