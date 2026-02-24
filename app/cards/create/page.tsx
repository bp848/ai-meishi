"use client"

import { useEffect, useState, Suspense } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import { BusinessCardPreview } from "@/components/business-card-preview"
import { ExportButton } from "@/components/export-button"
import { IDMLExportButton } from "@/components/idml-export-button"
import { useToast } from "@/hooks/use-toast"
import { useTemplateStore, VARIABLE_FIELD_KEYS } from "@/lib/template-store"
import { useCardStore } from "@/lib/card-store"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import {
  ArrowLeft,
  Building2,
  Briefcase,
  Mail,
  Save,
  User,
} from "lucide-react"
import type { CardFieldKey, CardFields, CardLayout } from "@/lib/types"
import { DEFAULT_CARD_FIELDS, CARD_FIELD_LABELS } from "@/lib/types"
import type { LucideIcon } from "lucide-react"

const VARIABLE_ICONS: Record<string, LucideIcon> = {
  name: User,
  title: Briefcase,
  email: Mail,
}

function CardCreateContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const templateId = searchParams.get("template")
  const editCardId = searchParams.get("edit")

  const { success, error: showError } = useToast()
  const { templates, getById } = useTemplateStore()
  const { cards, addCard, updateCard } = useCardStore()

  const [fields, setFields] = useState<CardFields>({ ...DEFAULT_CARD_FIELDS })
  const [layout, setLayout] = useState<CardLayout | null>(null)
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
        // Load layout from template
        const tpl = templates.find((t) => t.id === card.templateId)
        if (tpl?.layout) setLayout(tpl.layout)
      }
    } else if (templateId) {
      const template = getById(templateId)
      if (template) {
        applyTemplate(template)
      }
    }
  }, [templateId, editCardId, templates, cards])

  const applyTemplate = (template: NonNullable<ReturnType<typeof getById>>) => {
    setSelectedTemplateId(template.id)
    setSelectedCompany(template.company)
    setLayout(template.layout ?? null)
    // Fixed fields from template, variable fields blank (or preserved)
    setFields((prev) => ({
      company: template.fixedFields?.company ?? template.fields.company,
      phone: template.fixedFields?.phone ?? template.fields.phone,
      address: template.fixedFields?.address ?? template.fields.address,
      website: template.fixedFields?.website ?? template.fields.website,
      // Keep previously entered personal info
      name: prev.name,
      title: prev.title,
      email: prev.email,
    }))
  }

  const handleVariableChange = (key: CardFieldKey, value: string) => {
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
    const template = getById(id)
    if (template) applyTemplate(template)
  }

  const hasTemplate = !!selectedTemplateId

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

          {/* Template picker */}
          {!selectedTemplateId && !editCardId && templates.length > 0 && (
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="text-lg">
                  テンプレートを選択
                </CardTitle>
                <CardDescription>
                  会社テンプレートを選ぶと、会社情報（住所・電話等）が自動入力されます。個人情報だけ入力すればOKです。
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
            {/* Left: Preview */}
            <div className="flex flex-col gap-6">
              <Card>
                <CardContent className="p-6">
                  <BusinessCardPreview fields={fields} />
                </CardContent>
              </Card>

              {/* Show fixed (read-only) template info */}
              {hasTemplate && (
                <Card className="bg-muted/50">
                  <CardContent className="p-4">
                    <p className="mb-2 text-xs font-medium text-muted-foreground">
                      会社情報（テンプレートから固定）
                    </p>
                    <div className="space-y-1 text-sm text-foreground">
                      {fields.company && <p><span className="text-muted-foreground">会社名:</span> {fields.company}</p>}
                      {fields.phone && <p><span className="text-muted-foreground">電話:</span> {fields.phone}</p>}
                      {fields.address && <p><span className="text-muted-foreground">住所:</span> {fields.address}</p>}
                      {fields.website && <p><span className="text-muted-foreground">Web:</span> {fields.website}</p>}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Right: Input fields */}
            <Card>
              <CardContent className="flex flex-col gap-6 p-6">
                <div>
                  <p className="mb-3 text-sm font-medium text-muted-foreground">
                    {hasTemplate
                      ? "個人情報を入力してください"
                      : "名刺情報を入力"}
                  </p>

                  {/* Variable fields (always editable) */}
                  <div className="flex flex-col gap-3">
                    {VARIABLE_FIELD_KEYS.map((key) => {
                      const Icon = VARIABLE_ICONS[key] ?? User
                      return (
                        <div key={key} className="flex flex-col gap-1.5">
                          <Label
                            htmlFor={`field-${key}`}
                            className="flex items-center gap-1.5 text-xs text-muted-foreground"
                          >
                            <Icon className="h-3.5 w-3.5" />
                            {CARD_FIELD_LABELS[key]}
                            {key === "name" && (
                              <span className="text-destructive">*</span>
                            )}
                          </Label>
                          <Input
                            id={`field-${key}`}
                            type={key === "email" ? "email" : "text"}
                            value={fields[key]}
                            onChange={(e) =>
                              handleVariableChange(key, e.target.value)
                            }
                            placeholder={CARD_FIELD_LABELS[key]}
                            className="h-9 text-sm"
                          />
                        </div>
                      )
                    })}
                  </div>
                </div>

                <Separator />

                <div className="flex flex-col gap-2">
                  <Button onClick={handleSave} className="w-full">
                    <Save className="mr-2 h-4 w-4" />
                    {editCardId ? "名刺を更新" : "名刺を保存"}
                  </Button>
                  <ExportButton />
                  <IDMLExportButton fields={fields} layout={layout} />
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
