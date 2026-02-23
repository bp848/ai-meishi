from __future__ import annotations

from app.models import PDFExportRequest


class PDFExportService:
    def export(self, request: PDFExportRequest) -> bytes:
        try:
            from io import BytesIO

            from reportlab.lib.units import mm  # type: ignore
            from reportlab.pdfgen import canvas  # type: ignore

            buf = BytesIO()
            c = canvas.Canvas(buf, pagesize=(request.width_mm * mm, request.height_mm * mm))
            y = request.height_mm * mm - 10
            for key, value in request.result.card_fields.model_dump().items():
                if value:
                    c.drawString(10, y, f"{key}: {value}")
                    y -= 10
            c.save()
            return buf.getvalue()
        except ModuleNotFoundError:
            # valid but minimal PDF fallback
            return (
                b"%PDF-1.4\n"
                b"1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n"
                b"2 0 obj<</Type/Pages/Count 0>>endobj\n"
                b"trailer<</Root 1 0 R>>\n"
                b"%%EOF"
            )
