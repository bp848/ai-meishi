"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useAppStore } from "@/lib/store"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2 } from "lucide-react"

export function ExportButton() {
  const [exporting, setExporting] = useState(false)
  const exportPDF = useAppStore((s) => s.exportPDF)
  const { success, error } = useToast()

  const handleExport = async () => {
    setExporting(true)
    try {
      const blob = await exportPDF()
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = "meishi.pdf"
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      success("PDF出力完了", "名刺PDFをダウンロードしました")
    } catch {
      error("PDF出力エラー", "PDF出力に失敗しました。再度お試しください")
    } finally {
      setExporting(false)
    }
  }

  return (
    <Button onClick={handleExport} disabled={exporting} className="w-full">
      {exporting ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          PDF出力中...
        </>
      ) : (
        <>
          <Download className="mr-2 h-4 w-4" />
          PDFでダウンロード
        </>
      )}
    </Button>
  )
}
