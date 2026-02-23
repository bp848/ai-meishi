from __future__ import annotations

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.responses import Response

from .analyzer import TemplateAnalyzer
from .models import PDFExportRequest
from .pdf_exporter import PDFExporter

app = FastAPI(title="AI Meishi API")
analyzer = TemplateAnalyzer()
exporter = PDFExporter()

ALLOWED_CONTENT_TYPES = {
    "image/jpeg",
    "image/png",
    "application/pdf",
}


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze")
async def analyze(front: UploadFile = File(...), back: UploadFile | None = File(None)):
    _validate_content_type(front)
    front_bytes = await front.read()

    back_bytes = None
    if back:
        _validate_content_type(back)
        back_bytes = await back.read()

    try:
        return analyzer.analyze(front_bytes=front_bytes, back_bytes=back_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@app.post("/export/pdf")
def export_pdf(payload: PDFExportRequest):
    pdf_bytes = exporter.export(
        front=payload.template.front,
        back=payload.template.back,
        field_overrides=payload.field_overrides,
    )
    headers = {"Content-Disposition": 'attachment; filename="business-card.pdf"'}
    return Response(content=pdf_bytes, media_type="application/pdf", headers=headers)


def _validate_content_type(file: UploadFile) -> None:
    if file.content_type not in ALLOWED_CONTENT_TYPES:
        raise HTTPException(status_code=415, detail=f"Unsupported file type: {file.content_type}")
