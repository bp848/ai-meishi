export type CardFieldKey =
  | "company"
  | "name"
  | "title"
  | "email"
  | "phone"
  | "address"
  | "website"

export type CardFields = Record<CardFieldKey, string>

/** Layout element extracted from PDF/IDML for auto-typesetting */
export interface LayoutElement {
  /** Which card field this element maps to */
  fieldKey: CardFieldKey | string
  /** Text content */
  text: string
  /** X position in mm from left */
  x_mm: number
  /** Y position in mm from top */
  y_mm: number
  /** Width in mm */
  width_mm: number
  /** Height in mm */
  height_mm: number
  /** Font family name */
  fontFamily: string
  /** Font size in pt */
  fontSize_pt: number
  /** Font weight: "normal" | "bold" */
  fontWeight: string
  /** Font style: "normal" | "italic" */
  fontStyle: string
  /** Color as hex (#RRGGBB) or CMYK string */
  color: string
  /** Text alignment: "left" | "center" | "right" */
  textAlign: string
}

/** Full layout extracted from a source file */
export interface CardLayout {
  /** Card width in mm */
  width_mm: number
  /** Card height in mm */
  height_mm: number
  /** All text/layout elements */
  elements: LayoutElement[]
  /** Extracted images/logos (base64 data URLs) */
  images: LayoutImage[]
}

export interface LayoutImage {
  /** Base64 data URL */
  dataUrl: string
  /** X position in mm */
  x_mm: number
  /** Y position in mm */
  y_mm: number
  /** Width in mm */
  width_mm: number
  /** Height in mm */
  height_mm: number
}

export interface AnalysisResult {
  extracted_text: string
  card_fields: CardFields
  logos: string[]
  metadata: Record<string, unknown>
  /** Layout information for auto-typesetting */
  layout?: CardLayout
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
