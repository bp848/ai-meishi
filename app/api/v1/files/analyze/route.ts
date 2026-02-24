import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

// IDML files are ZIP archives with various MIME types
function isIDML(file: File): boolean {
  return (
    file.name.endsWith(".idml") ||
    file.type === "application/vnd.adobe.indesign-idml-package"
  )
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const overridesRaw = formData.get("overrides") as string | null

    if (!file) {
      return NextResponse.json(
        { detail: "ファイルが指定されていません" },
        { status: 400 }
      )
    }

    const mime = file.type
    const isIdml = isIDML(file)

    if (
      !mime.startsWith("image/") &&
      mime !== "application/pdf" &&
      !isIdml &&
      mime !== "application/zip"
    ) {
      return NextResponse.json(
        { detail: "対応していないファイル形式です" },
        { status: 415 }
      )
    }

    let cardFields: Record<string, string>
    let source = "image"

    if (isIdml || (mime === "application/zip" && file.name.endsWith(".idml"))) {
      cardFields = await analyzeIDML(file)
      source = "idml"
    } else if (OPENAI_API_KEY) {
      if (mime === "application/pdf") {
        cardFields = await analyzePDFWithAI(file)
        source = "pdf"
      } else {
        cardFields = await analyzeImageWithOpenAI(file)
        source = "image"
      }
    } else {
      cardFields = {
        company: "サンプル株式会社",
        name: "山田太郎",
        title: "代表取締役",
        email: "yamada@example.com",
        phone: "03-1234-5678",
        address: "東京都渋谷区神宮前1-2-3",
        website: "https://example.com",
      }
    }

    // Apply overrides
    if (overridesRaw) {
      try {
        const overrides = JSON.parse(overridesRaw) as Record<string, string>
        Object.assign(cardFields, overrides)
      } catch {
        // ignore invalid JSON
      }
    }

    return NextResponse.json({
      mime_type: isIdml ? "application/vnd.adobe.indesign-idml-package" : mime,
      result: {
        extracted_text: Object.values(cardFields).filter(Boolean).join("\n"),
        card_fields: cardFields,
        logos: [],
        metadata: {
          source,
          confidence: OPENAI_API_KEY || isIdml ? 0.9 : 0.0,
          ai_powered: !!OPENAI_API_KEY,
        },
      },
    })
  } catch (err) {
    console.error("Analysis error:", err)
    return NextResponse.json(
      { detail: "解析に失敗しました" },
      { status: 400 }
    )
  }
}

/**
 * IDML → unzip → extract text from Story XML files → AI structuring
 */
async function analyzeIDML(file: File): Promise<Record<string, string>> {
  const buffer = await file.arrayBuffer()
  const zip = await JSZip.loadAsync(buffer)

  // IDML stores text content in Stories/*.xml files
  const textParts: string[] = []
  const storyFiles = Object.keys(zip.files).filter(
    (name) => name.startsWith("Stories/") && name.endsWith(".xml")
  )

  for (const storyFile of storyFiles) {
    const content = await zip.files[storyFile].async("string")
    // Extract text content from XML (between <Content> tags)
    const contentMatches = content.match(/<Content>([\s\S]*?)<\/Content>/g)
    if (contentMatches) {
      for (const match of contentMatches) {
        const text = match
          .replace(/<Content>/g, "")
          .replace(/<\/Content>/g, "")
          .replace(/<[^>]+>/g, "")
          .trim()
        if (text) textParts.push(text)
      }
    }
  }

  const extractedText = textParts.join("\n")

  if (!extractedText.trim()) {
    return emptyFields()
  }

  // If OpenAI is available, use it to structure the text
  if (OPENAI_API_KEY) {
    return await structureTextWithAI(extractedText, "IDML")
  }

  // Basic fallback: try to extract fields from text using patterns
  return extractFieldsFromText(extractedText)
}

/**
 * Image → OpenAI Vision API
 */
async function analyzeImageWithOpenAI(
  file: File
): Promise<Record<string, string>> {
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
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: [
            { type: "text", text: "この名刺の情報を読み取ってください。" },
            {
              type: "image_url",
              image_url: { url: dataUrl, detail: "high" },
            },
          ],
        },
      ],
      max_tokens: 500,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("OpenAI Vision API error:", errText)
    throw new Error("OpenAI API call failed")
  }

  return parseOpenAIResponse(await response.json())
}

/**
 * PDF → text extraction → OpenAI text completion
 */
async function analyzePDFWithAI(
  file: File
): Promise<Record<string, string>> {
  const buffer = Buffer.from(await file.arrayBuffer())

  let extractedText = ""
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const pdfParse = require("pdf-parse") as (
      buf: Buffer
    ) => Promise<{ text: string }>
    const pdfData = await pdfParse(buffer)
    extractedText = pdfData.text
  } catch (err) {
    console.error("PDF parse error:", err)
    extractedText = ""
  }

  if (!extractedText.trim()) {
    return emptyFields()
  }

  return await structureTextWithAI(extractedText, "PDF")
}

/**
 * Use OpenAI to structure extracted text into card fields
 */
async function structureTextWithAI(
  text: string,
  source: string
): Promise<Record<string, string>> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `以下のテキストは名刺${source}から抽出されたものです。名刺情報を読み取ってください。\n\n${text}`,
        },
      ],
      max_tokens: 500,
      temperature: 0,
    }),
  })

  if (!response.ok) {
    const errText = await response.text()
    console.error("OpenAI text API error:", errText)
    throw new Error("OpenAI API call failed")
  }

  return parseOpenAIResponse(await response.json())
}

/**
 * Basic pattern-based field extraction (fallback without OpenAI)
 */
function extractFieldsFromText(text: string): Record<string, string> {
  const emailMatch = text.match(
    /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/
  )
  const phoneMatch = text.match(/(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4})/)
  const urlMatch = text.match(/https?:\/\/[^\s]+/)

  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)

  return {
    company: lines[0] ?? "",
    name: lines[1] ?? "",
    title: lines[2] ?? "",
    email: emailMatch?.[0] ?? "",
    phone: phoneMatch?.[0] ?? "",
    address: "",
    website: urlMatch?.[0] ?? "",
  }
}

const SYSTEM_PROMPT = `あなたは名刺OCRの専門家です。名刺の情報を正確に読み取り、以下のJSON形式で返してください。読み取れないフィールドは空文字にしてください。JSONのみを返し、他のテキストは含めないでください。

{
  "company": "会社名",
  "name": "氏名",
  "title": "役職",
  "email": "メールアドレス",
  "phone": "電話番号",
  "address": "住所",
  "website": "WebサイトURL"
}`

function parseOpenAIResponse(data: any): Record<string, string> {
  const content = data.choices?.[0]?.message?.content ?? "{}"
  const jsonMatch = content.match(/\{[\s\S]*\}/)
  if (!jsonMatch) {
    throw new Error("Failed to parse OCR result")
  }
  const parsed = JSON.parse(jsonMatch[0])
  return {
    company: parsed.company ?? "",
    name: parsed.name ?? "",
    title: parsed.title ?? "",
    email: parsed.email ?? "",
    phone: parsed.phone ?? "",
    address: parsed.address ?? "",
    website: parsed.website ?? "",
  }
}

function emptyFields(): Record<string, string> {
  return {
    company: "",
    name: "",
    title: "",
    email: "",
    phone: "",
    address: "",
    website: "",
  }
}
