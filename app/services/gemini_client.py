from __future__ import annotations

import json
import os
from typing import Any

from app.models import AnalysisResult, CardFields, LogoCandidate


class GeminiClient:
    def __init__(self, model: str = "gemini-2.0-flash") -> None:
        self.model = model

    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not configured")

        # Imported lazily so tests can run without SDK installation.
        from google import genai  # type: ignore

        client = genai.Client(api_key=api_key)
        prompt = (
            "Extract business card text fields and detect logos. Return strict JSON with keys: "
            "extracted_text (string), card_fields (object), logos (array of {name,svg,confidence})."
        )
        response = client.models.generate_content(
            model=self.model,
            contents=[
                {"text": prompt},
                {"inline_data": {"mime_type": mime_type, "data": file_bytes}},
            ],
            config={"response_mime_type": "application/json"},
        )
        return self._parse_response_text(response.text)

    def _parse_response_text(self, payload: str) -> AnalysisResult:
        parsed: dict[str, Any] = json.loads(payload)
        logos = [LogoCandidate(**logo) for logo in parsed.get("logos", [])]
        return AnalysisResult(
            extracted_text=parsed.get("extracted_text", ""),
            card_fields=CardFields(**parsed.get("card_fields", {})),
            logos=logos,
            metadata={"provider": "gemini"},
        )
