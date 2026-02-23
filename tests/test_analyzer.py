from __future__ import annotations

from io import BytesIO

import pytest
from PIL import Image
from pypdf import PdfWriter

from ai_meishi.analyzer import TemplateAnalyzer


def test_analyze_png_extracts_aspect_ratio():
    image = Image.new("RGB", (910, 550), color="white")
    buf = BytesIO()
    image.save(buf, format="PNG")

    analyzer = TemplateAnalyzer()
    result = analyzer.analyze(front_bytes=buf.getvalue(), back_bytes=None)

    assert result.front.side == "front"
    assert result.front.aspect_ratio == pytest.approx(910 / 550)
    assert result.back is None


def test_analyze_pdf_extracts_aspect_ratio_for_back():
    writer = PdfWriter()
    writer.add_blank_page(width=200, height=100)
    buf = BytesIO()
    writer.write(buf)

    image = Image.new("RGB", (91, 55), color="white")
    front_buf = BytesIO()
    image.save(front_buf, format="JPEG")

    analyzer = TemplateAnalyzer()
    result = analyzer.analyze(front_bytes=front_buf.getvalue(), back_bytes=buf.getvalue())

    assert result.back is not None
    assert result.back.aspect_ratio == pytest.approx(2.0)


def test_analyze_raises_on_empty_content():
    analyzer = TemplateAnalyzer()
    with pytest.raises(ValueError, match="front content is empty"):
        analyzer.analyze(front_bytes=b"", back_bytes=None)


def test_invalid_image_raises_value_error():
    analyzer = TemplateAnalyzer()
    with pytest.raises(ValueError, match="Unsupported image content"):
        analyzer._extract_aspect_ratio(b"not-an-image")


def test_invalid_pdf_content_raises_value_error():
    analyzer = TemplateAnalyzer()
    with pytest.raises(ValueError, match="Invalid PDF content"):
        analyzer._extract_aspect_ratio(b"%PDF-1.4\n%%EOF")


def test_pdf_no_pages_raises_value_error(monkeypatch):
    class DummyPdf:
        pages = []

    monkeypatch.setattr("ai_meishi.analyzer.PdfReader", lambda *args, **kwargs: DummyPdf())

    analyzer = TemplateAnalyzer()
    with pytest.raises(ValueError, match="PDF has no pages"):
        analyzer._extract_aspect_ratio(b"%PDF-simulated")


def test_zero_image_dimensions_raises_value_error(monkeypatch):
    class DummyImage:
        size = (1, 1)

        def __enter__(self):
            self.size = (10, 0)
            return self

        def __exit__(self, exc_type, exc, tb):
            return False

    monkeypatch.setattr("ai_meishi.analyzer.Image.open", lambda *args, **kwargs: DummyImage())

    analyzer = TemplateAnalyzer()
    with pytest.raises(ValueError, match="Invalid image dimensions"):
        analyzer._extract_aspect_ratio(b"fake-image")
