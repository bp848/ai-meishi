"use client"

import { useRouter } from "next/navigation"
import { useTemplateStore, type CompanyTemplate } from "@/lib/template-store"
import { useAppStore } from "@/lib/store"
import { DEFAULT_CARD_FIELDS } from "@/lib/types"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Building2, Plus, Trash2, ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

export function TemplateSelector() {
  const { templates, removeTemplate } = useTemplateStore()
  const { setFieldValues } = useAppStore()
  const router = useRouter()

  if (templates.length === 0) return null

  const handleSelect = (template: CompanyTemplate) => {
    // Load template fields but clear the name so user enters new person's info
    const templateFields = {
      ...DEFAULT_CARD_FIELDS,
      company: template.fields.company,
      address: template.fields.address,
      phone: template.fields.phone,
      website: template.fields.website,
      // 保留其他字段为空，让用户填写
      name: "",
      title: "",
      email: "",
    }
    
    // 设置字段值并直接跳转到编辑器
    setFieldValues(templateFields)
    
    // 清除之前的分析结果，确保是模板模式
    const { reset } = useAppStore.getState()
    // 只重置文件和预览，保留字段值
    useAppStore.setState({
      frontFile: null,
      backFile: null,
      frontPreview: null,
      backPreview: null,
      analysisResult: null,
      isLoading: false,
      error: null,
    })
    
    router.push("/editor")
  }

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation()
    removeTemplate(id)
  }

  return (
    <div className="mx-auto mt-10 w-full max-w-2xl">
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <CardTitle className="text-xl font-bold text-foreground">
            登録済みテンプレートから新規作成
          </CardTitle>
          <CardDescription>
            過去に解析した会社のテンプレートを使って、新しい名刺を作成できます
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {templates.map((template) => (
            <div
              key={template.id}
              className={cn(
                "group flex items-center gap-4 rounded-lg border bg-card p-4 transition-colors",
                "hover:border-primary/40 hover:bg-primary/5 cursor-pointer"
              )}
              onClick={() => handleSelect(template)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault()
                  handleSelect(template)
                }
              }}
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Building2 className="h-5 w-5" />
              </div>
              <div className="flex flex-1 flex-col gap-0.5">
                <span className="text-sm font-semibold text-foreground">
                  {template.company}
                </span>
                <span className="text-xs text-muted-foreground">
                  {[template.fields.address, template.fields.website]
                    .filter(Boolean)
                    .join(" / ") || "詳細なし"}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                  onClick={(e) => handleRemove(e, template.id)}
                  aria-label={`${template.company}のテンプレートを削除`}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
                <ArrowRight className="h-4 w-4 text-muted-foreground transition-colors group-hover:text-primary" />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
