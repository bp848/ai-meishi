"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { FileBox, Loader2 } from "lucide-react"
import type { CardFields, CardLayout } from "@/lib/types"

interface IDMLExportButtonProps {
  fields: CardFields
  layout?: CardLayout | null
}

export function IDMLExportButton({ fields, layout }: IDMLExportButtonProps) {
  const [exporting, setExporting] = useState(false)
  const { success, error } = useToast()

  const handleExport = async () => {
    setExporting(true)
    try {
      const res = await fetch("/api/v1/idml/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          card_fields: fields,
          layout: layout ?? defaultLayout(fields),
        }),
      })

      if (!res.ok) {
        throw new Error(`IDML出力に失敗しました (${res.status})`)
      }

      const blob = await res.blob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `${fields.company || "meishi"}.idml`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      success("IDML出力完了", "InDesignテンプレートをダウンロードしました")
    } catch {
      error("IDML出力エラー", "IDML出力に失敗しました。再度お試しください")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button
      onClick={handleExport}
      disabled={exporting}
      variant="outline"
      className="w-full"
    >
      {exporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          IDML出力中...
        </>
      ) : (
        <>
          <FileBox className="mr-2 h-4 w-4" />
          IDMLでダウンロード (InDesign)
        </>
      )}
    </Button>
  )
}

function defaultLayout(fields: CardFields): CardLayout {
  const elements = []
  let y = 5

  if (fields.company) {
    elements.push({ fieldKey: "company", text: fields.company, x_mm: 5, y_mm: y, width_mm: 50, height_mm: 5, fontFamily: "NotoSansJP", fontSize_pt: 9, fontWeight: "bold", fontStyle: "normal", color: "#333333", textAlign: "left" })
    y += 8
  }
  if (fields.name) {
    elements.push({ fieldKey: "name", text: fields.name, x_mm: 5, y_mm: y, width_mm: 60, height_mm: 8, fontFamily: "NotoSansJP", fontSize_pt: 16, fontWeight: "bold", fontStyle: "normal", color: "#000000", textAlign: "left" })
    y += 10
  }
  if (fields.title) {
    elements.push({ fieldKey: "title", text: fields.title, x_mm: 5, y_mm: y, width_mm: 40, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 8, fontWeight: "normal", fontStyle: "normal", color: "#666666", textAlign: "left" })
    y += 6
  }
  if (fields.email) {
    elements.push({ fieldKey: "email", text: fields.email, x_mm: 5, y_mm: y, width_mm: 50, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" })
    y += 5
  }
  if (fields.phone) {
    elements.push({ fieldKey: "phone", text: fields.phone, x_mm: 5, y_mm: y, width_mm: 40, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" })
    y += 5
  }
  if (fields.address) {
    elements.push({ fieldKey: "address", text: fields.address, x_mm: 5, y_mm: y, width_mm: 70, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" })
    y += 5
  }
  if (fields.website) {
    elements.push({ fieldKey: "website", text: fields.website, x_mm: 5, y_mm: y, width_mm: 60, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#2563EB", textAlign: "left" })
  }

  return { width_mm: 91, height_mm: 55, elements, images: [] }
}
