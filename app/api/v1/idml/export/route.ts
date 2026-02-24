import { NextRequest, NextResponse } from "next/server"
import JSZip from "jszip"

/**
 * POST /api/v1/idml/export
 * Generates an IDML file from layout data for InDesign auto-typesetting.
 */
export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    const layout = data.layout
    const cardFields = data.card_fields ?? {}

    const widthMm = layout?.width_mm ?? 91
    const heightMm = layout?.height_mm ?? 55
    const elements = layout?.elements ?? []

    const widthPt = mmToPt(widthMm)
    const heightPt = mmToPt(heightMm)

    const zip = new JSZip()

    // 1. mimetype
    zip.file("mimetype", "application/vnd.adobe.indesign-idml-package")

    // 2. designmap.xml (master document)
    zip.file(
      "designmap.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Document DOMVersion="19.0" Self="d">
  <idPkg:Preferences src="Resources/Preferences.xml"/>
  <idPkg:Spread src="Spreads/Spread_u1.xml"/>
  <idPkg:Story src="Stories/Story_main.xml"/>
</Document>`
    )

    // 3. Resources/Preferences.xml
    zip.file(
      "Resources/Preferences.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Preferences xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="19.0">
  <DocumentPreference PageWidth="${widthPt}" PageHeight="${heightPt}" FacingPages="false" DocumentBleedTopOffset="0" DocumentBleedBottomOffset="0" DocumentBleedInsideOrLeftOffset="0" DocumentBleedOutsideOrRightOffset="0"/>
</idPkg:Preferences>`
    )

    // 4. Spreads/Spread_u1.xml with TextFrames for each element
    let textFrameXml = ""
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const x = mmToPt(el.x_mm ?? 0)
      const y = mmToPt(el.y_mm ?? 0)
      const w = mmToPt(el.width_mm ?? 40)
      const h = mmToPt(el.height_mm ?? 5)

      textFrameXml += `
      <TextFrame Self="tf_${i}" ParentStory="story_${i}"
        ItemTransform="1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)}"
        ContentType="TextType">
        <Properties>
          <PathGeometry>
            <GeometryPathType PathOpen="false">
              <PathPointArray>
                <PathPointType Anchor="0 0" LeftDirection="0 0" RightDirection="0 0"/>
                <PathPointType Anchor="${w.toFixed(2)} 0" LeftDirection="${w.toFixed(2)} 0" RightDirection="${w.toFixed(2)} 0"/>
                <PathPointType Anchor="${w.toFixed(2)} ${h.toFixed(2)}" LeftDirection="${w.toFixed(2)} ${h.toFixed(2)}" RightDirection="${w.toFixed(2)} ${h.toFixed(2)}"/>
                <PathPointType Anchor="0 ${h.toFixed(2)}" LeftDirection="0 ${h.toFixed(2)}" RightDirection="0 ${h.toFixed(2)}"/>
              </PathPointArray>
            </GeometryPathType>
          </PathGeometry>
        </Properties>
      </TextFrame>`
    }

    zip.file(
      "Spreads/Spread_u1.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="19.0">
  <Spread Self="spread_1" FlattenerOverride="Default" PageCount="1">
    <Page Self="page_1" AppliedMaster="" Name="1"
      GeometricBounds="0 0 ${heightPt.toFixed(2)} ${widthPt.toFixed(2)}"
      ItemTransform="1 0 0 1 0 0"/>
    ${textFrameXml}
  </Spread>
</idPkg:Spread>`
    )

    // 5. Stories - one per element with full font/style info
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      // Use the updated card field value if available, else the element's original text
      const fieldKey = el.fieldKey as string
      const text = cardFields[fieldKey] || el.text || ""
      const fontFamily = el.fontFamily ?? "NotoSansJP"
      const fontSize = el.fontSize_pt ?? 9
      const fontWeight = el.fontWeight ?? "normal"
      const fontStyle = el.fontStyle ?? "normal"
      const color = el.color ?? "#000000"
      const textAlign = el.textAlign ?? "left"

      const indesignFontStyle =
        fontWeight === "bold" && fontStyle === "italic"
          ? "Bold Italic"
          : fontWeight === "bold"
            ? "Bold"
            : fontStyle === "italic"
              ? "Italic"
              : "Regular"

      const justification =
        textAlign === "center"
          ? "CenterAlign"
          : textAlign === "right"
            ? "RightAlign"
            : "LeftAlign"

      zip.file(
        `Stories/Story_${i}.xml`,
        `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="19.0">
  <Story Self="story_${i}">
    <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle">
      <Properties>
        <Justification type="enumeration">${justification}</Justification>
      </Properties>
      <CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]"
        AppliedFont="${fontFamily}"
        FontStyle="${indesignFontStyle}"
        PointSize="${fontSize}"
        FillColor="Color/${escapeXml(color)}">
        <Content>${escapeXml(text)}</Content>
      </CharacterStyleRange>
    </ParagraphStyleRange>
  </Story>
</idPkg:Story>`
      )
    }

    // Also create the combined Story_main.xml
    let mainStoryContent = ""
    for (let i = 0; i < elements.length; i++) {
      const el = elements[i]
      const fieldKey = el.fieldKey as string
      const text = cardFields[fieldKey] || el.text || ""
      mainStoryContent += `
      <ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/$ID/NormalParagraphStyle">
        <CharacterStyleRange AppliedFont="${el.fontFamily ?? "NotoSansJP"}" PointSize="${el.fontSize_pt ?? 9}" FontStyle="${el.fontWeight === "bold" ? "Bold" : "Regular"}">
          <Content>${escapeXml(text)}</Content>
        </CharacterStyleRange>
      </ParagraphStyleRange>`
    }
    zip.file(
      "Stories/Story_main.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="19.0">
  <Story Self="story_main">${mainStoryContent}
  </Story>
</idPkg:Story>`
    )

    // 6. META-INF/container.xml
    zip.file(
      "META-INF/container.xml",
      `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<container>
  <rootfile full-path="designmap.xml"/>
</container>`
    )

    // Generate ZIP
    const idmlBuffer = await zip.generateAsync({
      type: "uint8array",
      compression: "DEFLATE",
      compressionOptions: { level: 6 },
    })

    return new NextResponse(Buffer.from(idmlBuffer), {
      headers: {
        "Content-Type": "application/vnd.adobe.indesign-idml-package",
        "Content-Disposition": 'attachment; filename="business-card.idml"',
      },
    })
  } catch (err) {
    console.error("IDML export error:", err)
    return NextResponse.json(
      { detail: "IDML出力に失敗しました" },
      { status: 500 }
    )
  }
}

function mmToPt(mm: number): number {
  return mm * 2.83465
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;")
}
