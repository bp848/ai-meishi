import { NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY = process.env.OPENAI_API_KEY

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

    if (OPENAI_API_KEY) {
      // Use OpenAI Vision API for real OCR
      cardFields = await analyzeWithOpenAI(file)
    } else {
      // Fallback mock data
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
      mime_type: mime,
      result: {
        extracted_text: Object.values(cardFields).filter(Boolean).join("\n"),
        card_fields: cardFields,
        logos: [],
        metadata: {
          source: mime === "application/pdf" ? "pdf" : "image",
          confidence: OPENAI_API_KEY ? 0.95 : 0.0,
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

async function analyzeWithOpenAI(file: File): Promise<Record<string, string>> {
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
        {
          role: "system",
          content: `あなたは名刺OCRの専門家です。名刺画像から情報を正確に読み取り、以下のJSON形式で返してください。読み取れないフィールドは空文字にしてください。JSONのみを返し、他のテキストは含めないでください。

{
  "company": "会社名",
  "name": "氏名",
  "title": "役職",
  "email": "メールアドレス",
  "phone": "電話番号",
  "address": "住所",
  "website": "WebサイトURL"
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "この名刺の情報を読み取ってください。",
            },
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
    console.error("OpenAI API error:", errText)
    throw new Error("OpenAI API call failed")
  }

  const data = await response.json()
  const content = data.choices?.[0]?.message?.content ?? "{}"

  // Extract JSON from the response (handle markdown code blocks)
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
