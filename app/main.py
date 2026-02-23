from __future__ import annotations

from typing import Annotated

from fastapi import FastAPI, File, HTTPException, UploadFile

from app.models import AnalysisResult
from app.services.extraction import ExtractionService

app = FastAPI(title="ai-meishi backend", version="0.1.0")
service = ExtractionService()


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/analyze", response_model=AnalysisResult)
async def analyze(file: Annotated[UploadFile, File(...)]) -> AnalysisResult:
    payload = await file.read()
    mime_type = file.content_type or ""
    try:
        return service.analyze(payload, mime_type)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
