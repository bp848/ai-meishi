"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import { BusinessCardPreview } from "@/components/business-card-preview"
import { FieldEditor } from "@/components/field-editor"
import { ExportButton } from "@/components/export-button"
import { IDMLExportButton } from "@/components/idml-export-button"
import { useToast } from "@/hooks/use-toast"
import { useTemplateStore } from "@/lib/template-store"
import { useCardStore } from "@/lib/card-store"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { ArrowLeft, Building2, Save } from "lucide-react"
import type { CardFieldKey, CardFields } from "@/lib/types"
import { DEFAULT_CARD_FIELDS } from "@/lib/types"

function CardCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const editCardId = searchParams.get("edit")

  const { success, error: showError } = useToast()
  const { templates } = useTemplateStore()
  const { cards, addCard, updateCard } = useCardStore()

  const [fields, setFields] = useState<CardFields>({ ...DEFAULT_CARD_FIELDS })
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(
    templateId
  )
  const [selectedCompany, setSelectedCompany] = useState("")

  // Load template or card for editing
  useEffect(() => {
    if (editCardId) {
      const card = cards.find((c) => c.id === editCardId)
      if (card) {
        setFields({ ...card.fields })
        setSelectedTemplateId(card.templateId)
        setSelectedCompany(card.templateCompany)
      }
    } else if (templateId) {
      const template = templates.find((t) => t.id === templateId)
      if (template) {
        setFields({
          company: template.fields.company,
          address: template.fields.address,
          phone: template.fields.phone,
          website: template.fields.website,
          name: "",
          title: "",
          email: "",
        })
        setSelectedCompany(template.company)
      }
    }
  }, [templateId, editCardId, templates, cards])

  const handleFieldChange = (key: CardFieldKey, value: string) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = () => {
    if (!fields.name.trim()) {
      showError("入力エラー", "氏名は必須です")
      return
    }
    if (editCardId) {
      updateCard(editCardId, fields)
      success("更新完了", `${fields.name} の名刺を更新しました`)
    } else {
      addCard(
        selectedTemplateId ?? "manual",
        selectedCompany || fields.company,
        fields
      )
      success("保存完了", `${fields.name} の名刺を保存しました`)
    }
    router.push("/cards/manage")
  }

  const handleSelectTemplate = (id: string) => {
    const template = templates.find((t) => t.id === id)
    if (template) {
      setSelectedTemplateId(id)
      setSelectedCompany(template.company)
      setFields({
        company: template.fields.company,
        address: template.fields.address,
        phone: template.fields.phone,
        website: template.fields.website,
        name: fields.name,
        title: fields.title,
        email: fields.email,
      })
    }
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              戻る
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {editCardId ? "名刺編集" : "名刺作成"}
              </h1>
              {selectedCompany && (
                <p className="text-sm text-muted-foreground">
                  テンプレート: {selectedCompany}
                </p>
              )}
            </div>
          </div>

          {/* Template picker (only if no template selected and not editing) */}
          {!selectedTemplateId && !editCardId && templates.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  テンプレートを選択（任意）
                </CardTitle>
                <CardDescription>
                  登録済みテンプレートを使うと、会社情報が自動入力されます
                </CardDescription>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {templates.map((t) => (
                  <Button
                    key={t.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleSelectTemplate(t.id)}
                    className="h-auto py-2"
                  >
                    <Building2 className="mr-1.5 h-3.5 w-3.5" />
                    {t.company}
                  </Button>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Editor */}
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="p-6">
                  <BusinessCardPreview fields={fields} />
                </CardContent>
              </Card>
            </div>
            <Card>
              <CardContent className="flex flex-col gap-6 p-6">
                <FieldEditor
                  fields={fields}
                  onFieldChange={handleFieldChange}
                />
                <Separator />
                <div className="flex flex-col gap-2">
                  <Button onClick={handleSave} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {editCardId ? "名刺を更新" : "名刺を保存"}
                  </Button>
                  <ExportButton />
                  <IDMLExportButton fields={fields} />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

export default function CardCreatePage() {
  return (
    <Suspense>
      <CardCreateContent />
    </Suspense>
  )
}
