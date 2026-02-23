from __future__ import annotations

import os
import tempfile
from typing import Any

import requests

from app.models import AnalysisResult, CardFields, LogoCandidate


class AcrobatMCPClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("ACROBAT_API_KEY")
        if not self.api_key:
            raise RuntimeError("ACROBAT_API_KEY is not configured")

    def extract_pdf_content(self, file_bytes: bytes) -> dict[str, Any]:
        with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as temp:
            temp.write(file_bytes)
            temp_file_path = temp.name

        try:
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json",
            }
            payload = {
                "input": temp_file_path,
                "output_format": "json",
                "extract_images": True,
                "extract_text": True,
                "extract_metadata": True,
            }
            response = requests.post(
                "https://api.adobe.com/pdfservices/extract",
                headers=headers,
                json=payload,
                timeout=30,
            )
            response.raise_for_status()
            return response.json()
        finally:
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    def analyze_with_mcp(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        if mime_type != "application/pdf":
            raise ValueError("Acrobat MCP only supports PDF files")

        extracted_data = self.extract_pdf_content(file_bytes)
        extracted_text = extracted_data.get("text", "")
        card_fields = self._extract_fields_from_pdf(extracted_data)
        logos = self._detect_logos_in_pdf(extracted_data)
        layout_elements = self._extract_layout_elements(extracted_data)
        return AnalysisResult(
            extracted_text=extracted_text,
            card_fields=card_fields,
            logos=logos,
            metadata={
                "provider": "acrobat_mcp",
                "layout_elements": layout_elements,
                "pdf_metadata": extracted_data.get("metadata", {}),
            },
        )

    def _extract_fields_from_pdf(self, data: dict[str, Any]) -> CardFields:
        text_elements = data.get("text_elements", [])
        fields: dict[str, str] = {}
        for element in text_elements:
            content = str(element.get("text", ""))
            lowered = content.lower()
            if "@" in content and "." in content:
                fields["email"] = content
            elif any(keyword in lowered for keyword in ["tel", "phone", "電話"]):
                fields["phone"] = content
            elif any(keyword in lowered for keyword in ["www", "http", "web"]):
                fields["website"] = content

        sorted_elements = sorted(text_elements, key=lambda x: x.get("y", 0))
        if len(sorted_elements) >= 2:
            fields["company"] = sorted_elements[0].get("text", "")
            fields["name"] = sorted_elements[1].get("text", "")
        if len(sorted_elements) >= 3:
            fields["title"] = sorted_elements[2].get("text", "")
        return CardFields(**fields)

    def _detect_logos_in_pdf(self, data: dict[str, Any]) -> list[LogoCandidate]:
        logos: list[LogoCandidate] = []
        for i, image in enumerate(data.get("images", [])):
            width = image.get("width", 0)
            height = image.get("height", 0)
            x = image.get("x", 0)
            y = image.get("y", 0)
            if width < 100 and height < 100 and (x < 50 or y < 50):
                svg_path = f"M{x} {y} H{x + width} V{y + height} H{x} Z"
                logos.append(LogoCandidate(name=f"logo_{i}", svg=svg_path, confidence=0.7))
        return logos

    def _extract_layout_elements(self, data: dict[str, Any]) -> list[dict[str, Any]]:
        elements: list[dict[str, Any]] = []
        for element in data.get("text_elements", []):
            text = str(element.get("text", ""))
            if not text.strip():
                continue
            font_info = element.get("font", {})
            elements.append(
                {
                    "key": self._generate_element_key(text),
                    "text": text,
                    "x": element.get("x", 0) / 72 * 25.4,
                    "y": element.get("y", 0) / 72 * 25.4,
                    "width": element.get("width", 50) / 72 * 25.4,
                    "height": element.get("height", 10) / 72 * 25.4,
                    "style": {
                        "size": font_info.get("size", 10),
                        "weight": "bold" if font_info.get("bold", False) else "normal",
                        "color": font_info.get("color", "#000000"),
                        "family": font_info.get("family", "sans-serif"),
                    },
                }
            )
        return elements

    def _generate_element_key(self, text: str) -> str:
        lowered = text.lower()
        if "@" in text:
            return "email"
        if any(keyword in lowered for keyword in ["tel", "phone", "電話"]):
            return "phone"
        if any(keyword in lowered for keyword in ["www", "http"]):
            return "website"
        if len(text.split()) <= 3 and not any(char.isdigit() for char in text):
            return "name"
        return "text"
