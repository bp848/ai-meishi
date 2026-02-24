"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { Download, Loader2 } from "lucide-react"

export function ExportButton() {
  const [exporting, setExporting] = useState(false)
  const { success, error } = useToast()

  const handleExport = async () => {
    setExporting(true)
    try {
      const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
        import("jspdf"),
        import("html2canvas"),
      ])

      const previewEl = document.getElementById("card-preview")
      if (!previewEl) {
        error("PDF出力エラー", "プレビュー要素が見つかりません")
        return
      }

      const canvas = await html2canvas(previewEl, {
        scale: 3,
        useCORS: true,
        backgroundColor: "#ffffff",
      })

      // Standard business card: 91mm x 55mm
      const pdf = new jsPDF({
        orientation: "landscape",
        unit: "mm",
        format: [55, 91],
      })

      const imgData = canvas.toDataURL("image/png")
      pdf.addImage(imgData, "PNG", 0, 0, 91, 55)
      pdf.save("meishi.pdf")

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
