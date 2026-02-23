import { create } from "zustand"
import type { CardFields } from "./types"

export interface CompanyTemplate {
  id: string
  company: string
  fields: CardFields
  createdAt: number
}

interface TemplateStoreState {
  templates: CompanyTemplate[]
  addTemplate: (fields: CardFields) => void
  removeTemplate: (id: string) => void
  getByCompany: (company: string) => CompanyTemplate | undefined
}

function loadTemplates(): CompanyTemplate[] {
  if (typeof window === "undefined") return []
  try {
    const raw = localStorage.getItem("ai-meishi-templates")
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveTemplates(templates: CompanyTemplate[]) {
  if (typeof window === "undefined") return
  localStorage.setItem("ai-meishi-templates", JSON.stringify(templates))
}

export const useTemplateStore = create<TemplateStoreState>((set, get) => ({
  templates: loadTemplates(),

  addTemplate: (fields) => {
    const existing = get().templates
    // Deduplicate by company name - update if same company
    const filtered = existing.filter(
      (t) => t.company.trim().toLowerCase() !== fields.company.trim().toLowerCase()
    )
    const newTemplate: CompanyTemplate = {
      id: crypto.randomUUID(),
      company: fields.company,
      fields: { ...fields },
      createdAt: Date.now(),
    }
    const updated = [newTemplate, ...filtered]
    saveTemplates(updated)
    set({ templates: updated })
  },

  removeTemplate: (id) => {
    const updated = get().templates.filter((t) => t.id !== id)
    saveTemplates(updated)
    set({ templates: updated })
  },

  getByCompany: (company) => {
    return get().templates.find(
      (t) => t.company.trim().toLowerCase() === company.trim().toLowerCase()
    )
  },
}))
