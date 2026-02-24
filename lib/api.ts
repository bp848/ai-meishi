import type { AnalysisResponse, AnalysisResult } from "./types"

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? ""

export async function analyzeFile(
  file: File,
  overrides?: Record<string, string>
): Promise<AnalysisResponse> {
  const formData = new FormData()
  formData.append("file", file)
  if (overrides) {
    formData.append("overrides", JSON.stringify(overrides))
  }

  const res = await fetch(`${API_BASE}/api/v1/files/analyze`, {
    method: "POST",
    body: formData,
  })

  if (!res.ok) {
    if (res.status === 415) throw new Error("対応していないファイル形式です")
    if (res.status === 400) throw new Error("解析に失敗しました")
    throw new Error(`サーバーエラー (${res.status})`)
  }

  return res.json()
}

export async function exportPDF(payload: {
  result: AnalysisResult
  width_mm: number
  height_mm: number
}): Promise<Blob> {
  const res = await fetch(`${API_BASE}/api/v1/pdf/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  })

  if (!res.ok) {
    throw new Error(`PDF出力に失敗しました (${res.status})`)
  }

  return res.blob()
}
