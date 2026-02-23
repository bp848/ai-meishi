from __future__ import annotations

from io import BytesIO

from pypdf import PdfReader

from ai_meishi.models import FontStyle, LayoutElement, SideTemplate
from ai_meishi.pdf_exporter import PDFExporter


def _template(side: str) -> SideTemplate:
    return SideTemplate(
        side=side,
        aspect_ratio=91 / 55,
        background_color="#FFFFFF",
        elements=[
            LayoutElement(
                key="name",
                text="Original",
                x=10,
                y=10,
                width=30,
                height=8,
                style=FontStyle(size=10, weight="bold", color="#000000", family="sans-serif"),
            )
        ],
        logo=None,
    )


def test_pdf_export_one_side():
    exporter = PDFExporter()
    data = exporter.export(front=_template("front"), back=None, field_overrides={"name": "Renamed"})

    reader = PdfReader(BytesIO(data))
    assert len(reader.pages) == 1


def test_pdf_export_two_sides():
    exporter = PDFExporter()
    data = exporter.export(front=_template("front"), back=_template("back"), field_overrides={})

    reader = PdfReader(BytesIO(data))
    assert len(reader.pages) == 2
