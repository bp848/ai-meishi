"use client"

import { useState, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import { useToast } from "@/hooks/use-toast"
import { useTemplateStore } from "@/lib/template-store"
import { FileUploadCard } from "@/components/file-upload-card"
import { BusinessCardPreview } from "@/components/business-card-preview"
import { FieldEditor } from "@/components/field-editor"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { Loader2, Save, ScanSearch } from "lucide-react"
import { analyzeFile } from "@/lib/api"
import type { CardFieldKey, CardFields } from "@/lib/types"
import { DEFAULT_CARD_FIELDS } from "@/lib/types"

export default function TemplateRegisterPage() {
  const router = useRouter()
  const { success, error: showError } = useToast()
  const { addTemplate } = useTemplateStore()

  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<string | null>(null)
  const [fields, setFields] = useState<CardFields>({ ...DEFAULT_CARD_FIELDS })
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analyzed, setAnalyzed] = useState(false)

  const handleFileSelect = useCallback((f: File | null) => {
    if (preview) URL.revokeObjectURL(preview)
    setFile(f)
    setPreview(f ? URL.createObjectURL(f) : null)
    setAnalyzed(false)
    setFields({ ...DEFAULT_CARD_FIELDS })
  }, [preview])

  const handleAnalyze = async () => {
    if (!file) return
    setIsAnalyzing(true)
    try {
      const response = await analyzeFile(file)
      setFields({ ...response.result.card_fields })
      setAnalyzed(true)
      success("解析完了", "名刺情報を抽出しました。確認・編集してください。")
    } catch (err) {
      showError(
        "解析エラー",
        err instanceof Error ? err.message : "解析に失敗しました"
      )
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleFieldChange = (key: CardFieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!fields.company.trim()) {
      showError("入力エラー", "会社名は必須です")
      return
    }
    addTemplate(fields)
    success("テンプレート登録完了", `「${fields.company}」を登録しました`)
    router.push("/templates/search")
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-foreground">
              テンプレート登録
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              名刺のPDF・IDML・画像をインポートしてテンプレートを登録します
            </p>
          </div>

          {/* Step 1: Upload */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                1. ファイルをアップロード
              </CardTitle>
              <CardDescription>
                名刺の画像（JPEG, PNG, WebP）、PDF、またはIDMLファイルを選択してください
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="max-w-sm">
                <FileUploadCard
                  label="名刺ファイル (必須)"
                  file={file}
                  preview={preview}
                  onFileSelect={handleFileSelect}
                  onError={(msg) => showError("ファイルエラー", msg)}
                />
              </div>
              <Button
                size="lg"
                disabled={!file || isAnalyzing}
                onClick={handleAnalyze}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    AI解析中...
                  </>
                ) : (
                  <>
                    <ScanSearch className="mr-2 h-5 w-5" />
                    AI解析を開始
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Step 2: Edit & Preview */}
          {analyzed && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  2. 内容を確認・編集してテンプレート登録
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-6 lg:grid-cols-2">
                  <div className="flex flex-col gap-4">
                    <BusinessCardPreview fields={fields} />
                    {preview && file && file.type !== "application/pdf" && (
                      <div className="rounded-md border p-2">
                        <p className="mb-1 text-xs text-muted-foreground">
                          元画像
                        </p>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={preview}
                          alt="アップロード画像"
                          className="w-full rounded object-contain"
                        />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-4">
                    <FieldEditor
                      fields={fields}
                      onFieldChange={handleFieldChange}
                    />
                    <Separator />
                    <Button size="lg" onClick={handleSave} className="w-full">
                      <Save className="mr-2 h-4 w-4" />
                      テンプレートとして登録
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}
