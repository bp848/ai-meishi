import { create } from "zustand"
import type { AnalysisResult, CardFields, CardFieldKey } from "./types"
import { DEFAULT_CARD_FIELDS } from "./types"
import { analyzeFile, exportPDF } from "./api"
import { useTemplateStore } from "./template-store"

interface AppState {
  frontFile: File | null
  backFile: File | null
  frontPreview: string | null
  backPreview: string | null
  analysisResult: AnalysisResult | null
  fieldValues: CardFields
  isLoading: boolean
  error: string | null
  templateSaved: boolean
  setFrontFile: (file: File | null) => void
  setBackFile: (file: File | null) => void
  analyzeFiles: () => Promise<void>
  updateFieldValue: (key: CardFieldKey, value: string) => void
  setFieldValues: (fields: CardFields) => void
  exportPDF: () => Promise<Blob>
  reset: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  frontFile: null,
  backFile: null,
  frontPreview: null,
  backPreview: null,
  analysisResult: null,
  fieldValues: { ...DEFAULT_CARD_FIELDS },
  isLoading: false,
  error: null,
  templateSaved: false,

  setFrontFile: (file) => {
    const prev = get().frontPreview
    if (prev) URL.revokeObjectURL(prev)
    set({
      frontFile: file,
      frontPreview: file ? URL.createObjectURL(file) : null,
    })
  },

  setBackFile: (file) => {
    const prev = get().backPreview
    if (prev) URL.revokeObjectURL(prev)
    set({
      backFile: file,
      backPreview: file ? URL.createObjectURL(file) : null,
    })
  },

  analyzeFiles: async () => {
    const { frontFile } = get()
    if (!frontFile) {
      set({ error: "表面の画像をアップロードしてください" })
      return
    }
    set({ isLoading: true, error: null })
    try {
      const response = await analyzeFile(frontFile)
      const cardFields = { ...response.result.card_fields }
      
      set({
        analysisResult: response.result,
        fieldValues: cardFields,
        isLoading: false,
      })
      
      // 自动保存模板（如果公司名存在）
      if (cardFields.company && cardFields.company.trim()) {
        try {
          // 延迟执行避免状态冲突
          setTimeout(() => {
            useTemplateStore.getState().addTemplate(cardFields)
            // 设置模板保存标志
            set({ templateSaved: true })
            // 3秒后重置标志
            setTimeout(() => set({ templateSaved: false }), 3000)
          }, 100)
        } catch (templateError) {
          console.warn("模板保存失败:", templateError)
        }
      }
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error ? err.message : "解析中にエラーが発生しました",
      })
    }
  },

  updateFieldValue: (key, value) => {
    set((state) => ({
      fieldValues: { ...state.fieldValues, [key]: value },
    }))
  },

  setFieldValues: (fields) => {
    set({ fieldValues: { ...fields } })
  },

  exportPDF: async () => {
    const { analysisResult, fieldValues } = get()
    set({ isLoading: true, error: null })
    try {
      const blob = await exportPDF({
        result: {
          extracted_text: analysisResult?.extracted_text ?? "",
          card_fields: fieldValues,
          logos: analysisResult?.logos ?? [],
          metadata: analysisResult?.metadata ?? {},
        },
        width_mm: 91,
        height_mm: 55,
      })
      set({ isLoading: false })
      return blob
    } catch (err) {
      set({
        isLoading: false,
        error:
          err instanceof Error
            ? err.message
            : "PDF出力中にエラーが発生しました",
      })
      throw err
    }
  },

  reset: () => {
    const { frontPreview, backPreview } = get()
    if (frontPreview) URL.revokeObjectURL(frontPreview)
    if (backPreview) URL.revokeObjectURL(backPreview)
    set({
      frontFile: null,
      backFile: null,
      frontPreview: null,
      backPreview: null,
      analysisResult: null,
      fieldValues: { ...DEFAULT_CARD_FIELDS },
      isLoading: false,
      error: null,
      templateSaved: false,
    })
  },
}))
