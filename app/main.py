from __future__ import annotations

import json
from uuid import UUID

from fastapi import FastAPI, File, Form, HTTPException, UploadFile, WebSocket, WebSocketDisconnect
from fastapi.responses import Response

from app.models import (
    ALLOWED_MIME_TYPES,
    AnalyzeResponse,
    CardFields,
    PDFExportRequest,
    RealtimePreviewMessage,
    TemplateCreateRequest,
    TemplatePreviewRequest,
)
from app.services.extraction import ExtractionService
from app.services.pdf_export import PDFExportService
from app.services.template_store import TemplateStore

app = FastAPI(title="ai-meishi")

extraction_service = ExtractionService()
pdf_export_service = PDFExportService()
template_store = TemplateStore()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/api/v1/files/analyze", response_model=AnalyzeResponse)
async def analyze_file(
    file: UploadFile = File(...),
    overrides: str | None = Form(default=None),
) -> AnalyzeResponse:
    mime_type = file.content_type or ""
    if mime_type not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    file_bytes = await file.read()
    result = extraction_service.analyze(file_bytes=file_bytes, mime_type=mime_type)

    if overrides:
        override_map = CardFields(**json.loads(overrides))
        result.card_fields = CardFields(
            **{
                **result.card_fields.model_dump(),
                **override_map.model_dump(exclude_none=True),
            }
        )

    return AnalyzeResponse(mime_type=mime_type, result=result)


@app.post("/api/v1/pdf/export")
def export_pdf(request: PDFExportRequest) -> Response:
    payload = pdf_export_service.export(request)
    return Response(content=payload, media_type="application/pdf")


@app.get("/api/v1/templates")
def list_templates():
    return template_store.list_templates()


@app.post("/api/v1/templates")
def create_template(request: TemplateCreateRequest):
    return template_store.create_template(request)


@app.get("/api/v1/templates/{template_id}")
def get_template(template_id: UUID):
    template = template_store.get_template(template_id)
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    return template


@app.post("/api/v1/preview/render")
def render_preview(request: TemplatePreviewRequest):
    rendered = []
    for field in request.template.fields:
        rendered.append(
            {
                "key": field.key,
                "value": request.values.get(field.key, ""),
                "x": field.x,
                "y": field.y,
                "font_size": field.font_size,
            }
        )
    return {
        "width_mm": request.template.width_mm,
        "height_mm": request.template.height_mm,
        "rendered": rendered,
    }


@app.websocket("/api/v1/preview/ws")
async def preview_ws(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            raw = await websocket.receive_json()
            msg = RealtimePreviewMessage(**raw)
            await websocket.send_json({"type": "preview", "payload": msg.payload})
    except (WebSocketDisconnect, ValueError):
        await websocket.close()
