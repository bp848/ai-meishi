from __future__ import annotations

import base64
import json
import os
from typing import Any

from app.models import AnalysisResult, CardFields, LogoCandidate


class OpenAIClient:
    def __init__(self, model: str = "gpt-4o") -> None:
        self.model = model
        self._client = None

    @property
    def client(self):
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY is not configured")
            from openai import OpenAI

            self._client = OpenAI(api_key=api_key)
        return self._client

    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        prompt = self._build_detailed_prompt()
        user_content = [
            {
                "type": "input_text",
                "text": "この名刺を解析してください。",
            },
            {
                "type": "input_image",
                "image_url": self._encode_image(file_bytes, mime_type),
            },
        ]
        response = self.client.responses.create(
            model=self.model,
            input=[
                {"role": "system", "content": [{"type": "input_text", "text": prompt}]},
                {"role": "user", "content": user_content},
            ],
            text={"format": {"type": "json_object"}},
        )

        return self._parse_response_text(response.output_text)

    def _encode_image(self, file_bytes: bytes, mime_type: str) -> str:
        base64_image = base64.b64encode(file_bytes).decode("utf-8")
        return f"data:{mime_type};base64,{base64_image}"

    def _build_detailed_prompt(self) -> str:
        return (
            "ビジネスカードを解析してJSONで返してください。"
            "card_fields, logos, layout_elements, metadataを含め、"
            "座標はミリメートル単位で出力してください。"
        )

    def _parse_response_text(self, payload: str) -> AnalysisResult:
        try:
            parsed: dict[str, Any] = json.loads(payload)
            logos = [LogoCandidate(**logo) for logo in parsed.get("logos", [])]
            card_fields = CardFields(**parsed.get("card_fields", {}))
            return AnalysisResult(
                extracted_text=parsed.get("extracted_text", ""),
                card_fields=card_fields,
                logos=logos,
                metadata={
                    **parsed.get("metadata", {}),
                    "provider": "openai",
                    "layout_elements": parsed.get("layout_elements", []),
                },
            )
        except (json.JSONDecodeError, TypeError, ValueError) as exc:
            raise ValueError(f"Invalid OpenAI response format: {exc}") from exc
