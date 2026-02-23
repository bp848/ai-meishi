from __future__ import annotations

import io
from typing import Any

from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas

from app.models import LogoCandidate, PDFExportRequest

CARD_WIDTH = 91 * mm
CARD_HEIGHT = 55 * mm


class PDFExportService:
    def export(self, request: PDFExportRequest) -> bytes:
        buffer = io.BytesIO()
        canvas = Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        self._draw_background(canvas, request.result)
        layout_elements = request.result.metadata.get("layout_elements", [])
        for element in layout_elements:
            self._draw_layout_element(canvas, element, request.field_overrides)
        for logo in request.result.logos:
            self._draw_logo(canvas, logo)
        canvas.save()
        return buffer.getvalue()

    def _draw_background(self, canvas: Canvas, result: Any) -> None:
        bg_color = result.metadata.get("background_color", "#FFFFFF")
        canvas.setFillColor(HexColor(bg_color))
        canvas.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, stroke=0, fill=1)

    def _draw_layout_element(
        self,
        canvas: Canvas,
        element: dict[str, Any],
        overrides: dict[str, str],
    ) -> None:
        key = element.get("key", "")
        text = overrides.get(key, element.get("text", ""))
        if not text:
            return

        x = element.get("x", 0) * mm
        y = CARD_HEIGHT - ((element.get("y", 0) + element.get("height", 0)) * mm)
        style = element.get("style", {})
        color = style.get("color", "#000000")
        size = style.get("size", 10)
        weight = style.get("weight", "normal")
        family = style.get("family", "sans-serif")

        canvas.setFillColor(HexColor(color))
        canvas.setFont(self._get_font_name(weight, family), size)
        canvas.drawString(x, y, text)

    def _draw_logo(self, canvas: Canvas, logo: LogoCandidate) -> None:
        _ = (canvas, logo)

    def _get_font_name(self, weight: str, family: str) -> str:
        _ = family
        if weight == "bold":
            return "Helvetica-Bold"
        return "Helvetica"
