import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

function isIDML(file: File): boolean {
  return (
    file.name.endsWith(".idml") ||
    file.type === "application/vnd.adobe.indesign-idml-package"
  )
}

interface LayoutElement {
  fieldKey: string
  text: string
  x_mm: number
  y_mm: number
  width_mm: number
  height_mm: number
  fontFamily: string
  fontSize_pt: number
  fontWeight: string
  fontStyle: string
  color: string
  textAlign: string
}

interface CardLayout {
  width_mm: number
  height_mm: number
  elements: LayoutElement[]
  images: { dataUrl: string; x_mm: number; y_mm: number; width_mm: number; height_mm: number }[]
}

interface AnalyzeResult {
  cardFields: Record<string, string>
  layout: CardLayout | null
  source: string
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const overridesRaw = formData.get("overrides") as string | null

    if (!file) {
      return NextResponse.json({ detail: "ファイルが指定されていません" }, { status: 400 })
    }

    const mime = file.type
    const isIdml = isIDML(file)

    if (!mime.startsWith("image/") && mime !== "application/pdf" && !isIdml && mime !== "application/zip") {
      return NextResponse.json({ detail: "対応していないファイル形式です" }, { status: 415 })
    }

    let result: AnalyzeResult

    if (isIdml || (mime === "application/zip" && file.name.endsWith(".idml"))) {
      result = await analyzeIDML(file)
    } else if (OPENAI_API_KEY) {
      if (mime === "application/pdf") {
        result = await analyzePDFWithLayout(file)
      } else {
        result = await analyzeImageWithLayout(file)
      }
    } else {
      result = mockResult()
    }

    // Apply overrides
    if (overridesRaw) {
      try {
        Object.assign(result.cardFields, JSON.parse(overridesRaw))
      } catch { /* ignore */ }
    }

    return NextResponse.json({
      mime_type: isIdml ? "application/vnd.adobe.indesign-idml-package" : mime,
      result: {
        extracted_text: Object.values(result.cardFields).filter(Boolean).join("\n"),
        card_fields: result.cardFields,
        logos: [],
        layout: result.layout,
        metadata: {
          source: result.source,
          confidence: OPENAI_API_KEY || isIdml ? 0.9 : 0.0,
          ai_powered: !!OPENAI_API_KEY,
        },
      },
    })
  } catch (err) {
    console.error("Analysis error:", err)
    return NextResponse.json({ detail: "解析に失敗しました" }, { status: 400 })
  }
}

// ─── Layout-aware analysis prompts ────────────────────────────────

const LAYOUT_SYSTEM_PROMPT = `あなたは名刺の自動組版の専門家です。名刺画像/テキストから、テキスト情報とレイアウト情報を正確に抽出してください。

以下のJSON形式で返してください。JSONのみを返し、他のテキストは含めないでください。

{
  "card_fields": {
    "company": "会社名",
    "name": "氏名",
    "title": "役職",
    "email": "メールアドレス",
    "phone": "電話番号",
    "address": "住所",
    "website": "WebサイトURL"
  },
  "layout": {
    "width_mm": 91,
    "height_mm": 55,
    "elements": [
      {
        "fieldKey": "company",
        "text": "実際のテキスト",
        "x_mm": 左端からの位置mm,
        "y_mm": 上端からの位置mm,
        "width_mm": テキスト領域の幅mm,
        "height_mm": テキスト領域の高さmm,
        "fontFamily": "フォント名（例: NotoSansJP, Helvetica, Mincho）",
        "fontSize_pt": フォントサイズpt,
        "fontWeight": "normal または bold",
        "fontStyle": "normal または italic",
        "color": "#000000 形式のカラーコード",
        "textAlign": "left, center, right のいずれか"
      }
    ]
  }
}

注意事項:
- 名刺は通常91mm x 55mmです
- フォントサイズは一般的に会社名8-12pt、氏名12-18pt、その他6-9pt
- 座標は左上が原点(0,0)で、単位はmm
- 各テキスト要素の位置と大きさを画像から推定してください
- フォント名は見た目から推定（ゴシック系→NotoSansJP、明朝系→NotoSerifJP）
- 読み取れないフィールドは空文字にしてください`

/**
 * Image → OpenAI Vision API (with layout extraction)
 */
async function analyzeImageWithLayout(file: File): Promise<AnalyzeResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  const base64 = buffer.toString("base64")
  const dataUrl = `data:${file.type};base64,${base64}`

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: LAYOUT_SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "この名刺の情報とレイアウトを読み取ってください。各テキスト要素の座標、フォント情報、カラーを推定してください。" },
            { type: "image_url", image_url: { url: dataUrl, detail: "high" } },
          ],
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    console.error("OpenAI Vision API error:", await response.text())
    throw new Error("OpenAI API call failed")
  }

  return parseLayoutResponse(await response.json(), "image")
}

/**
 * PDF → text extraction → OpenAI layout analysis
 */
async function analyzePDFWithLayout(file: File): Promise<AnalyzeResult> {
  const buffer = Buffer.from(await file.arrayBuffer())
  let extractedText = ""
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (buf: Buffer) => Promise<{ text: string }>
    const pdfData = await pdfParse(buffer)
    extractedText = pdfData.text
  } catch (err) {
    console.error("PDF parse error:", err)
  }

  if (!extractedText.trim()) {
    return { cardFields: emptyFields(), layout: null, source: "pdf" }
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: LAYOUT_SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下は名刺PDFから抽出されたテキストです。名刺情報を構造化し、標準的な名刺レイアウト（91x55mm）で各要素の座標・フォント情報を推定してください。\n\n${extractedText}`,
        },
      ],
      max_tokens: 2000,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    console.error("OpenAI text API error:", await response.text())
    throw new Error("OpenAI API call failed")
  }

  return parseLayoutResponse(await response.json(), "pdf")
}

/**
 * IDML → extract text + layout from XML structure
 */
async function analyzeIDML(file: File): Promise<AnalyzeResult> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  const elements: LayoutElement[] = []
  const textParts: string[] = []

  // Parse Spreads for geometry
  const spreadFiles = Object.keys(zip.files).filter(
    (n) => n.startsWith("Spreads/") && n.endsWith(".xml")
  )

  // Parse Stories for text content + character styles
  const storyFiles = Object.keys(zip.files).filter(
    (n) => n.startsWith("Stories/") && n.endsWith(".xml")
  )

  for (const storyFile of storyFiles) {
    const content = await zip.files[storyFile].async("string")

    // Extract font info from CharacterStyleRange
    const styleMatches = content.match(/<CharacterStyleRange[^>]*>([\s\S]*?)<\/CharacterStyleRange>/g) ?? []

    for (const styleBlock of styleMatches) {
      // Get font attributes
      const fontFamily = styleBlock.match(/AppliedFont="([^"]*)"/)
      const fontSize = styleBlock.match(/PointSize="([^"]*)"/)
      const fontStyle = styleBlock.match(/FontStyle="([^"]*)"/)
      const fillColor = styleBlock.match(/FillColor="([^"]*)"/)

      // Get text content
      const contentMatches = styleBlock.match(/<Content>([\s\S]*?)<\/Content>/g)
      if (contentMatches) {
        for (const match of contentMatches) {
          const text = match
            .replace(/<Content>/g, "")
            .replace(/<\/Content>/g, "")
            .replace(/<[^>]+>/g, "")
            .trim()
          if (text) {
            textParts.push(text)
            elements.push({
              fieldKey: "",
              text,
              x_mm: 0, y_mm: 0,
              width_mm: 80, height_mm: 5,
              fontFamily: fontFamily?.[1]?.replace(/\t/g, " ") ?? "NotoSansJP",
              fontSize_pt: parseFloat(fontSize?.[1] ?? "9"),
              fontWeight: fontStyle?.[1]?.toLowerCase().includes("bold") ? "bold" : "normal",
              fontStyle: fontStyle?.[1]?.toLowerCase().includes("italic") ? "italic" : "normal",
              color: fillColor?.[1] ?? "#000000",
              textAlign: "left",
            })
          }
        }
      }
    }
  }

  // Parse spread for page size
  let width_mm = 91, height_mm = 55
  if (spreadFiles.length > 0) {
    const spreadContent = await zip.files[spreadFiles[0]].async("string")
    const pageWidth = spreadContent.match(/ItemTransform="[^"]*"[^>]*\bPageWidth="([^"]*)"/)
    const pageHeight = spreadContent.match(/ItemTransform="[^"]*"[^>]*\bPageHeight="([^"]*)"/)
    if (pageWidth) width_mm = ptToMm(parseFloat(pageWidth[1]))
    if (pageHeight) height_mm = ptToMm(parseFloat(pageHeight[1]))
  }

  const extractedText = textParts.join("\n")
  let cardFields: Record<string, string>

  if (OPENAI_API_KEY && extractedText.trim()) {
    // Use AI to map text to card fields
    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: FIELD_ONLY_PROMPT },
          { role: "user", content: `名刺IDMLから抽出:\n${extractedText}` },
        ],
        max_tokens: 500,
        temperature: 0,
      }),
    })
    cardFields = resp.ok ? parseFieldsResponse(await resp.json()) : extractFieldsFromText(extractedText)
  } else {
    cardFields = extractFieldsFromText(extractedText)
  }

  // Auto-assign y positions to elements
  let y = 8
  for (const el of elements) {
    el.x_mm = 5
    el.y_mm = y
    el.height_mm = el.fontSize_pt * 0.4 + 1
    y += el.height_mm + 2
  }

  return {
    cardFields,
    layout: { width_mm, height_mm, elements, images: [] },
    source: "idml",
  }
}

// ─── Helpers ────────────────────────────────────────────

function ptToMm(pt: number): number {
  return pt * 0.352778
}

function parseLayoutResponse(data: any, source: string): AnalyzeResult {
  const content = data.choices?.[0]?.message?.content ?? "{}"
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error("Failed to parse layout response")

  const parsed = JSON.parse(jsonMatch[0])
  const cf = parsed.card_fields ?? parsed
  const cardFields = {
    company: cf.company ?? "",
    name: cf.name ?? "",
    title: cf.title ?? "",
    email: cf.email ?? "",
    phone: cf.phone ?? "",
    address: cf.address ?? "",
    website: cf.website ?? "",
  }

  let layout: CardLayout | null = null
  if (parsed.layout) {
    layout = {
      width_mm: parsed.layout.width_mm ?? 91,
      height_mm: parsed.layout.height_mm ?? 55,
      elements: (parsed.layout.elements ?? []).map((el: any) => ({
        fieldKey: el.fieldKey ?? "",
        text: el.text ?? "",
        x_mm: el.x_mm ?? 0,
        y_mm: el.y_mm ?? 0,
        width_mm: el.width_mm ?? 40,
        height_mm: el.height_mm ?? 5,
        fontFamily: el.fontFamily ?? "NotoSansJP",
        fontSize_pt: el.fontSize_pt ?? 9,
        fontWeight: el.fontWeight ?? "normal",
        fontStyle: el.fontStyle ?? "normal",
        color: el.color ?? "#000000",
        textAlign: el.textAlign ?? "left",
      })),
      images: [],
    }
  }

  return { cardFields, layout, source }
}

const FIELD_ONLY_PROMPT = `名刺テキストから情報を抽出してJSON形式で返してください。JSONのみ返してください。
{"company":"","name":"","title":"","email":"","phone":"","address":"","website":""}`

function parseFieldsResponse(data: any): Record<string, string> {
  const content = data.choices?.[0]?.message?.content ?? "{}"
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) return emptyFields()
  const p = JSON.parse(jsonMatch[0])
  return {
    company: p.company ?? "", name: p.name ?? "", title: p.title ?? "",
    email: p.email ?? "", phone: p.phone ?? "", address: p.address ?? "", website: p.website ?? "",
  }
}

function extractFieldsFromText(text: string): Record<string, string> {
  const emailMatch = text.match(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/)
  const phoneMatch = text.match(/(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4})/)
  const urlMatch = text.match(/https?:\/\/[^\s]+/)
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean)
  return {
    company: lines[0] ?? "", name: lines[1] ?? "", title: lines[2] ?? "",
    email: emailMatch?.[0] ?? "", phone: phoneMatch?.[0] ?? "", address: "", website: urlMatch?.[0] ?? "",
  }
}

function emptyFields(): Record<string, string> {
  return { company: "", name: "", title: "", email: "", phone: "", address: "", website: "" }
}

function mockResult(): AnalyzeResult {
  return {
    cardFields: {
      company: "サンプル株式会社", name: "山田太郎", title: "代表取締役",
      email: "yamada@example.com", phone: "03-1234-5678",
      address: "東京都渋谷区神宮前1-2-3", website: "https://example.com",
    },
    layout: {
      width_mm: 91, height_mm: 55,
      elements: [
        { fieldKey: "company", text: "サンプル株式会社", x_mm: 5, y_mm: 5, width_mm: 40, height_mm: 5, fontFamily: "NotoSansJP", fontSize_pt: 9, fontWeight: "bold", fontStyle: "normal", color: "#333333", textAlign: "left" },
        { fieldKey: "name", text: "山田太郎", x_mm: 5, y_mm: 18, width_mm: 50, height_mm: 8, fontFamily: "NotoSansJP", fontSize_pt: 16, fontWeight: "bold", fontStyle: "normal", color: "#000000", textAlign: "left" },
        { fieldKey: "title", text: "代表取締役", x_mm: 5, y_mm: 27, width_mm: 40, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 8, fontWeight: "normal", fontStyle: "normal", color: "#666666", textAlign: "left" },
        { fieldKey: "email", text: "yamada@example.com", x_mm: 5, y_mm: 35, width_mm: 50, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" },
        { fieldKey: "phone", text: "03-1234-5678", x_mm: 5, y_mm: 40, width_mm: 40, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" },
        { fieldKey: "address", text: "東京都渋谷区神宮前1-2-3", x_mm: 5, y_mm: 45, width_mm: 60, height_mm: 4, fontFamily: "NotoSansJP", fontSize_pt: 7, fontWeight: "normal", fontStyle: "normal", color: "#333333", textAlign: "left" },
      ],
      images: [],
    },
    source: "mock",
  }
}
