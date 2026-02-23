export type CardFieldKey =
  | "company"
  | "name"
  | "title"
  | "email"
  | "phone"
  | "address"
  | "website"

export type CardFields = Record<CardFieldKey, string>

export interface AnalysisResult {
  extracted_text: string
  card_fields: CardFields
  logos: string[]
  metadata: Record<string, unknown>
}

export interface AnalysisResponse {
  mime_type: string
  result: AnalysisResult
}

export interface TemplateDefinition {
  id: string
  name: string
  width_mm: number
  height_mm: number
  fields: TemplateField[]
}

export interface TemplateField {
  key: string
  label: string
  x: number
  y: number
  fontSize: number
  fontWeight: string
  color: string
}

export const CARD_FIELD_LABELS: Record<CardFieldKey, string> = {
  company: "会社名",
  name: "氏名",
  title: "役職",
  email: "メール",
  phone: "電話番号",
  address: "住所",
  website: "Webサイト",
}

export const DEFAULT_CARD_FIELDS: CardFields = {
  company: "",
  name: "",
  title: "",
  email: "",
  phone: "",
  address: "",
  website: "",
}
