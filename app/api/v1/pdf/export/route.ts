import { NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const result = data.result ?? {}
    const cardFields = result.card_fields ?? {}
    const widthMm = data.width_mm ?? 91
    const heightMm = data.height_mm ?? 55

    // Generate a simple PDF using raw PDF syntax (no external deps)
    const pdf = buildCardPDF(cardFields, widthMm, heightMm)

    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": 'attachment; filename="business-card.pdf"',
      },
    })
  } catch {
    return NextResponse.json(
      { detail: "PDF出力に失敗しました" },
      { status: 500 }
    )
  }
}

function mmToPt(mm: number): number {
  return mm * 2.83465
}

function buildCardPDF(
  fields: Record<string, string>,
  widthMm: number,
  heightMm: number
): Buffer {
  const w = mmToPt(widthMm)
  const h = mmToPt(heightMm)

  const lines = [
    { text: fields.company ?? "", size: 12, y: h - mmToPt(10) },
    { text: fields.name ?? "", size: 14, y: h - mmToPt(18) },
    { text: fields.title ?? "", size: 9, y: h - mmToPt(24) },
    { text: fields.email ?? "", size: 8, y: h - mmToPt(30) },
    { text: fields.phone ?? "", size: 8, y: h - mmToPt(35) },
    { text: fields.address ?? "", size: 8, y: h - mmToPt(40) },
    { text: fields.website ?? "", size: 8, y: h - mmToPt(45) },
  ].filter((l) => l.text)

  // Build content stream
  let stream = ""
  for (const line of lines) {
    stream += `BT /F1 ${line.size} Tf ${mmToPt(10)} ${line.y.toFixed(2)} Td (${escapePdf(line.text)}) Tj ET\n`
  }

  const streamBytes = Buffer.from(stream, "binary")
  const streamLen = streamBytes.length

  // Minimal valid PDF
  const objects = [
    // 1: Catalog
    `1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj`,
    // 2: Pages
    `2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj`,
    // 3: Page
    `3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${w.toFixed(2)} ${h.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>\nendobj`,
    // 4: Stream
    `4 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}endstream\nendobj`,
    // 5: Font
    `5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj`,
  ]

  let body = "%PDF-1.4\n"
  const offsets: number[] = []
  for (const obj of objects) {
    offsets.push(Buffer.byteLength(body, "binary"))
    body += obj + "\n"
  }

  const xrefOffset = Buffer.byteLength(body, "binary")
  body += "xref\n"
  body += `0 ${objects.length + 1}\n`
  body += "0000000000 65535 f \n"
  for (const off of offsets) {
    body += `${String(off).padStart(10, "0")} 00000 n \n`
  }
  body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`
  body += `startxref\n${xrefOffset}\n%%EOF\n`

  return Buffer.from(body, "binary")
}

function escapePdf(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
}
