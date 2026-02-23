"use client"

import { useRouter } from "next/navigation"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { FileUploadCard } from "@/components/file-upload-card"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Loader2, ScanSearch } from "lucide-react"

export function UploadSection() {
  const router = useRouter()
  const {
    frontFile,
    backFile,
    frontPreview,
    backPreview,
    isLoading,
    error: storeError,
    setFrontFile,
    setBackFile,
    analyzeFiles,
  } = useAppStore()
  const { error: showError } = useToast()

  const handleAnalyze = async () => {
    try {
      await analyzeFiles()
      const currentError = useAppStore.getState().error
      if (currentError) {
        showError("解析に失敗しました", currentError)
        return
      }
      router.push("/editor")
    } catch {
      showError("解析に失敗しました", "ファイルを確認して再度お試しください")
    }
  }

  return (
    <div className="mx-auto w-full max-w-2xl">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold text-foreground">
            名刺をアップロード
          </CardTitle>
          <CardDescription>
            名刺の画像をアップロードすると、AIが自動で情報を抽出します
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="grid gap-6 md:grid-cols-2">
            <FileUploadCard
              label="表面 (必須)"
              file={frontFile}
              preview={frontPreview}
              onFileSelect={setFrontFile}
              onError={(msg) => showError("ファイルエラー", msg)}
            />
            <FileUploadCard
              label="裏面 (任意)"
              file={backFile}
              preview={backPreview}
              onFileSelect={setBackFile}
              onError={(msg) => showError("ファイルエラー", msg)}
            />
          </div>

          <Button
            size="lg"
            className="w-full"
            disabled={!frontFile || isLoading}
            onClick={handleAnalyze}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                解析中...
              </>
            ) : (
              <>
                <ScanSearch className="mr-2 h-5 w-5" />
                AI解析を開始
              </>
            )}
          </Button>

          {storeError && (
            <p className="text-center text-xs text-destructive">
              {storeError}
            </p>
          )}

          {!frontFile && !storeError && (
            <p className="text-center text-xs text-muted-foreground">
              表面の画像をアップロードすると解析を開始できます
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
