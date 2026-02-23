from __future__ import annotations

from io import BytesIO

from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas

from .models import SideTemplate

CARD_WIDTH = 91 * mm
CARD_HEIGHT = 55 * mm


class PDFExporter:
    def export(
        self,
        front: SideTemplate,
        back: SideTemplate | None,
        field_overrides: dict[str, str],
    ) -> bytes:
        buffer = BytesIO()
        canvas = Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))

        self._draw_side(canvas, front, field_overrides)
        canvas.showPage()

        if back:
            self._draw_side(canvas, back, field_overrides)
            canvas.showPage()

        canvas.save()
        return buffer.getvalue()

    def _draw_side(
        self,
        canvas: Canvas,
        side: SideTemplate,
        field_overrides: dict[str, str],
    ) -> None:
        canvas.setFillColor(HexColor(side.background_color))
        canvas.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, stroke=0, fill=1)

        for element in side.elements:
            text = field_overrides.get(element.key, element.text)
            x = element.x * mm
            y = CARD_HEIGHT - ((element.y + element.height) * mm)

            canvas.setFillColor(HexColor(element.style.color))
            font_name = "Helvetica-Bold" if element.style.weight == "bold" else "Helvetica"
            canvas.setFont(font_name, element.style.size)
            canvas.drawString(x, y, text)
