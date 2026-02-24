import { NextRequest, NextResponse } from "next/server"

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
    if (!mime.startsWith("image/") && mime !== "application/pdf") {
      return NextResponse.json(
        { detail: "対応していないファイル形式です" },
        { status: 415 }
      )
    }

    let cardFields: Record<string, string>

    if (mime === "application/pdf") {
      const buffer = Buffer.from(await file.arrayBuffer())
      // Simple text extraction from PDF
      const text = extractTextFromPDF(buffer)
      const emailMatch = text.match(
        /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/
      )
      const phoneMatch = text.match(/(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4})/)

      cardFields = {
        company: "",
        name: "",
        title: "",
        email: emailMatch?.[0] ?? "",
        phone: phoneMatch?.[0] ?? "",
        address: "",
        website: "",
      }
    } else {
      // Mock analysis for images
      cardFields = {
        company: "サンプル会社",
        name: "田中太郎",
        title: "営業部長",
        email: "example@company.com",
        phone: "03-1234-5678",
        address: "東京都渋谷区1-2-3",
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
      mime_type: mime,
      result: {
        extracted_text: Object.values(cardFields).filter(Boolean).join("\n"),
        card_fields: cardFields,
        logos: [],
        metadata: {
          source: mime === "application/pdf" ? "pdf" : "image",
          confidence: 0.95,
        },
      },
    })
  } catch {
    return NextResponse.json(
      { detail: "解析に失敗しました" },
      { status: 400 }
    )
  }
}

/** Minimal PDF text extraction without external deps */
function extractTextFromPDF(buffer: Buffer): string {
  // Extract readable strings from the PDF buffer
  const raw = buffer.toString("latin1")
  const textParts: string[] = []

  // Match text between BT..ET blocks (PDF text objects)
  const btEtRegex = /BT\s([\s\S]*?)ET/g
  let match
  while ((match = btEtRegex.exec(raw)) !== null) {
    const block = match[1]
    // Extract text from Tj and TJ operators
    const tjRegex = /\(([^)]*)\)\s*Tj/g
    let tjMatch
    while ((tjMatch = tjRegex.exec(block)) !== null) {
      textParts.push(tjMatch[1])
    }
  }

  return textParts.join(" ")
}
