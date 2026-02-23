from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field

ALLOWED_MIME_TYPES = {
    "application/pdf",
    "image/png",
    "image/jpeg",
    "image/jpg",
    "image/webp",
}


class CardFields(BaseModel):
    company: str = ""
    name: str = ""
    title: str = ""
    email: str = ""
    phone: str = ""
    address: str = ""
    website: str = ""


class LogoCandidate(BaseModel):
    name: str
    svg: str
    confidence: float = Field(default=0.0, ge=0.0, le=1.0)


class AnalysisResult(BaseModel):
    extracted_text: str = ""
    card_fields: CardFields = Field(default_factory=CardFields)
    logos: list[LogoCandidate] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class PDFExportRequest(BaseModel):
    result: AnalysisResult
    field_overrides: dict[str, str] = Field(default_factory=dict)
