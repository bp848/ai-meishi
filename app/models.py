from __future__ import annotations

from typing import Any
from uuid import UUID, uuid4

from pydantic import BaseModel, Field, model_validator

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "application/pdf"}


class LogoCandidate(BaseModel):
    name: str
    svg: str
    confidence: float = Field(ge=0.0, le=1.0)


class CardFields(BaseModel):
    company: str | None = None
    name: str | None = None
    title: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    website: str | None = None


class AnalysisResult(BaseModel):
    extracted_text: str
    card_fields: CardFields
    logos: list[LogoCandidate] = Field(default_factory=list)
    metadata: dict[str, Any] = Field(default_factory=dict)


class AnalyzeResponse(BaseModel):
    mime_type: str
    result: AnalysisResult


class PDFExportRequest(BaseModel):
    result: AnalysisResult
    width_mm: float = 91
    height_mm: float = 55


class TemplateField(BaseModel):
    key: str
    x: float
    y: float
    font_size: int = Field(ge=6, le=72)


class TemplateDefinition(BaseModel):
    id: UUID = Field(default_factory=uuid4)
    name: str
    width_mm: float = 91
    height_mm: float = 55
    fields: list[TemplateField] = Field(default_factory=list)


class TemplateCreateRequest(BaseModel):
    name: str
    width_mm: float = 91
    height_mm: float = 55
    fields: list[TemplateField] = Field(default_factory=list)


class TemplatePreviewRequest(BaseModel):
    template: TemplateDefinition
    values: dict[str, str] = Field(default_factory=dict)


class RealtimePreviewMessage(BaseModel):
    type: str = "preview"
    payload: dict[str, Any]

    @model_validator(mode="after")
    def ensure_payload(self) -> "RealtimePreviewMessage":
        if self.type != "preview":
            raise ValueError("Unsupported message type")
        return self
