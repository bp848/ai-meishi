from __future__ import annotations

import io
import re
from typing import Any

from app.models import ALLOWED_MIME_TYPES, AnalysisResult, CardFields
from app.services.hybrid_analyzer import HybridAnalyzer


class ExtractionService:
    def __init__(self, hybrid_analyzer: HybridAnalyzer | None = None) -> None:
        self.hybrid_analyzer = hybrid_analyzer or HybridAnalyzer()

    def analyze(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type: {mime_type}")

        result = self.hybrid_analyzer.analyze(file_bytes=file_bytes, mime_type=mime_type)

        if not result.extracted_text and mime_type == "application/pdf":
            result.extracted_text = self._extract_pdf_text(file_bytes)

        if not result.card_fields.name and result.extracted_text:
            result.card_fields = self._infer_fields(result.extracted_text, result.card_fields)

        return result

    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        try:
            from pypdf import PdfReader
        except ModuleNotFoundError:
            return ""
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()

    def _infer_fields(self, text: str, existing: CardFields) -> CardFields:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        email = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        phone = re.search(r"\+?[0-9][0-9\-()\s]{8,}", text)
        website = re.search(r"https?://\S+|www\.\S+", text)

        data: dict[str, Any] = existing.model_dump()
        if lines and not data.get("company"):
            data["company"] = lines[0]
        if len(lines) > 1 and not data.get("name"):
            data["name"] = lines[1]
        if email and not data.get("email"):
            data["email"] = email.group(0)
        if phone and not data.get("phone"):
            data["phone"] = phone.group(0).strip()
        if website and not data.get("website"):
            data["website"] = website.group(0).strip()
        return CardFields(**data)
