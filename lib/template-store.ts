import { create } from "zustand"
import type { CardFields, CardLayout } from "./types"

/**
 * Template = company-wide fixed info + layout.
 * When creating a card, only the personal (variable) fields are entered.
 *
 * Fixed fields (shared across all cards): company, phone, address, website
 * Variable fields (per-person): name, title, email
 */
export const FIXED_FIELD_KEYS = ["company", "phone", "address", "website"] as const
export const VARIABLE_FIELD_KEYS = ["name", "title", "email"] as const

export interface CompanyTemplate {
  id: string
  company: string
  /** Fixed company fields (company, phone, address, website) */
  fixedFields: Partial<CardFields>
  /** Sample / default variable fields for reference */
  sampleFields: Partial<CardFields>
  /** All fields combined (backward compat) */
  fields: CardFields
  /** Layout extracted from source file */
  layout?: CardLayout | null
  createdAt: number
}

interface TemplateStoreState {
  templates: CompanyTemplate[]
  addTemplate: (fields: CardFields, layout?: CardLayout | null) => void
  removeTemplate: (id: string) => void
  getByCompany: (company: string) => CompanyTemplate | undefined
  getById: (id: string) => CompanyTemplate | undefined
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

  addTemplate: (fields, layout) => {
    const existing = get().templates
    const filtered = existing.filter(
      (t) => t.company.trim().toLowerCase() !== fields.company.trim().toLowerCase()
    )

    // Split into fixed and variable
    const fixedFields: Partial<CardFields> = {}
    const sampleFields: Partial<CardFields> = {}
    for (const key of FIXED_FIELD_KEYS) {
      fixedFields[key] = fields[key] ?? ""
    }
    for (const key of VARIABLE_FIELD_KEYS) {
      sampleFields[key] = fields[key] ?? ""
    }

    const newTemplate: CompanyTemplate = {
      id: crypto.randomUUID(),
      company: fields.company,
      fixedFields,
      sampleFields,
      fields: { ...fields },
      layout: layout ?? null,
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

  getById: (id) => get().templates.find((t) => t.id === id),
}))
