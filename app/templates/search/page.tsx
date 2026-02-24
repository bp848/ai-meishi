"use client"

import { useState, useMemo } from "react"
import Link from "next/link"
import { Header } from "@/components/header"
import { ToastContainer } from "@/components/toast-container"
import { useTemplateStore } from "@/lib/template-store"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Building2,
  Search,
  Trash2,
  PenTool,
  FilePlus,
  Mail,
  Phone,
  MapPin,
  Globe,
} from "lucide-react"
import { cn } from "@/lib/utils"
import type { CompanyTemplate } from "@/lib/template-store"

export default function TemplateSearchPage() {
  const { templates, removeTemplate } = useTemplateStore()
  const [query, setQuery] = useState("")

  const filtered = useMemo(() => {
    if (!query.trim()) return templates
    const q = query.toLowerCase()
    return templates.filter(
      (t) =>
        t.company.toLowerCase().includes(q) ||
        t.fields.address?.toLowerCase().includes(q) ||
        t.fields.website?.toLowerCase().includes(q)
    )
  }, [templates, query])

  return (
    <div className="flex min-h-screen flex-col">
      <Header />
      <main className="flex-1 px-4 py-8">
        <div className="mx-auto max-w-4xl">
          <div className="mb-6 flex items-start justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                名刺テンプレート検索
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                登録済み {templates.length} 件のテンプレート
              </p>
            </div>
            <Link href="/templates/register">
              <Button variant="outline" size="sm">
                <FilePlus className="mr-1.5 h-4 w-4" />
                新規登録
              </Button>
            </Link>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="会社名・住所・URLで検索..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Results */}
          {filtered.length === 0 ? (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center gap-4 py-12 text-center">
                {templates.length === 0 ? (
                  <>
                    <FilePlus className="h-10 w-10 text-muted-foreground" />
                    <div>
                      <p className="font-medium text-foreground">
                        テンプレートがまだありません
                      </p>
                      <p className="text-sm text-muted-foreground">
                        名刺をインポートしてテンプレートを登録しましょう
                      </p>
                    </div>
                    <Link href="/templates/register">
                      <Button>
                        <FilePlus className="mr-2 h-4 w-4" />
                        テンプレートを登録
                      </Button>
                    </Link>
                  </>
                ) : (
                  <>
                    <Search className="h-10 w-10 text-muted-foreground" />
                    <p className="font-medium text-foreground">
                      「{query}」に一致するテンプレートはありません
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-3">
              {filtered.map((template) => (
                <TemplateRow
                  key={template.id}
                  template={template}
                  onRemove={() => removeTemplate(template.id)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
      <ToastContainer />
    </div>
  )
}

function TemplateRow({
  template,
  onRemove,
}: {
  template: CompanyTemplate
  onRemove: () => void
}) {
  const { fields } = template

  return (
    <Card className="group transition-colors hover:border-primary/30">
      <CardContent className="flex items-center gap-4 p-4">
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Building2 className="h-6 w-6" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-foreground truncate">
            {template.company}
          </p>
          <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
            {fields.phone && (
              <span className="flex items-center gap-1">
                <Phone className="h-3 w-3" />
                {fields.phone}
              </span>
            )}
            {fields.email && (
              <span className="flex items-center gap-1">
                <Mail className="h-3 w-3" />
                {fields.email}
              </span>
            )}
            {fields.address && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <MapPin className="h-3 w-3 shrink-0" />
                {fields.address}
              </span>
            )}
            {fields.website && (
              <span className="flex items-center gap-1 truncate max-w-[200px]">
                <Globe className="h-3 w-3 shrink-0" />
                {fields.website}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[10px] text-muted-foreground">
            登録: {new Date(template.createdAt).toLocaleDateString("ja-JP")}
          </p>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Link href={`/cards/create?template=${template.id}`}>
            <Button size="sm" variant="default" className="h-8">
              <PenTool className="mr-1 h-3.5 w-3.5" />
              名刺作成
            </Button>
          </Link>
          <Button
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 text-muted-foreground opacity-0 group-hover:opacity-100 hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation()
              onRemove()
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
