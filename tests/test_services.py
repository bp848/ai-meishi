from __future__ import annotations

import json

import pytest

from app.models import AnalysisResult, CardFields
from app.services.extraction import ExtractionService
from app.services.gemini_client import GeminiClient
from app.services.pdf_export import PDFExportService
from app.services.template_store import TemplateStore


class OkGemini:
    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        return AnalysisResult(
            extracted_text="ACME\nTaro\nmail@example.com",
            card_fields=CardFields(),
            logos=[],
        )


class EmptyGemini:
    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        return AnalysisResult(extracted_text="", card_fields=CardFields(), logos=[])


def test_extract_unsupported_mime() -> None:
    service = ExtractionService(gemini_client=OkGemini())
    with pytest.raises(ValueError):
        service.analyze(b"x", "text/plain")


def test_extract_infers_fields() -> None:
    service = ExtractionService(gemini_client=OkGemini())
    result = service.analyze(b"x", "image/png")
    assert result.card_fields.company == "ACME"
    assert result.card_fields.name == "Taro"
    assert result.card_fields.email == "mail@example.com"



def test_extract_pdf_branch(monkeypatch) -> None:
    service = ExtractionService(gemini_client=EmptyGemini())
    monkeypatch.setattr(service, "_extract_pdf_text", lambda _b: "PDF Text")
    result = service.analyze(b"pdf", "application/pdf")
    assert result.extracted_text == "PDF Text"

def test_parse_gemini_response() -> None:
    client = GeminiClient()
    payload = json.dumps(
        {
            "extracted_text": "hello",
            "card_fields": {"name": "Taro"},
            "logos": [{"name": "acme", "svg": "<svg/>", "confidence": 0.9}],
        }
    )
    result = client._parse_response_text(payload)
    assert result.card_fields.name == "Taro"
    assert result.logos[0].name == "acme"


def test_gemini_requires_api_key(monkeypatch) -> None:
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
    client = GeminiClient()
    with pytest.raises(RuntimeError):
        client.analyze_document(b"x", "image/png")


def test_pdf_extract_fallback_without_pypdf(monkeypatch) -> None:
    service = ExtractionService(gemini_client=EmptyGemini())

    real_import = __import__

    def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name == "pypdf":
            raise ModuleNotFoundError("missing")
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr("builtins.__import__", fake_import)
    assert service._extract_pdf_text(b"x") == ""


def test_pdf_export_fallback(monkeypatch) -> None:
    service = PDFExportService()
    real_import = __import__

    def fake_import(name, globals=None, locals=None, fromlist=(), level=0):
        if name.startswith("reportlab"):
            raise ModuleNotFoundError("missing")
        return real_import(name, globals, locals, fromlist, level)

    monkeypatch.setattr("builtins.__import__", fake_import)
    req = type(
        "Req",
        (),
        {
            "width_mm": 91,
            "height_mm": 55,
            "result": type("R", (), {"card_fields": CardFields()}),
        },
    )
    payload = service.export(request=req)
    assert payload.startswith(b"%PDF")


def test_template_store() -> None:
    from app.models import TemplateCreateRequest

    store = TemplateStore()
    created = store.create_template(TemplateCreateRequest(name="x"))
    assert store.get_template(created.id) is not None
    assert len(store.list_templates()) == 1


def test_realtime_preview_message_invalid_type() -> None:
    from pydantic import ValidationError

    from app.models import RealtimePreviewMessage

    with pytest.raises(ValidationError):
        RealtimePreviewMessage(type="other", payload={})


def test_extract_pdf_text_success(monkeypatch) -> None:
    service = ExtractionService(gemini_client=EmptyGemini())

    class DummyPage:
        def extract_text(self):
            return "page"

    class DummyReader:
        def __init__(self, _stream):
            self.pages = [DummyPage(), DummyPage()]

    import types

    sys_modules = __import__("sys").modules
    monkeypatch.setitem(
        sys_modules,
        "pypdf",
        types.SimpleNamespace(PdfReader=DummyReader),
    )
    assert service._extract_pdf_text(b"pdf") == "page\npage"


def test_extract_infer_phone_and_website() -> None:
    service = ExtractionService(gemini_client=OkGemini())
    inferred = service._infer_fields(
        "ACME\nTaro\n+81-90-1234-5678\nwww.example.com",
        CardFields(),
    )
    assert inferred.phone == "+81-90-1234-5678"
    assert inferred.website == "www.example.com"


def test_gemini_analyze_success(monkeypatch) -> None:
    import sys
    import types

    monkeypatch.setenv("GEMINI_API_KEY", "dummy")

    class DummyModels:
        @staticmethod
        def generate_content(model, contents, config):
            _ = (model, contents, config)
            return types.SimpleNamespace(
                text='{"extracted_text":"ok","card_fields":{"name":"Neo"},"logos":[]}'
            )

    class DummyClient:
        def __init__(self, api_key):
            self.api_key = api_key
            self.models = DummyModels()

    fake_genai = types.SimpleNamespace(Client=DummyClient)
    sys.modules["google"] = types.SimpleNamespace(genai=fake_genai)

    client = GeminiClient()
    result = client.analyze_document(b"img", "image/png")
    assert result.card_fields.name == "Neo"


def test_pdf_export_reportlab_path(monkeypatch) -> None:
    import sys
    import types

    writes = []

    class DummyCanvas:
        def __init__(self, buf, pagesize):
            self.buf = buf
            self.pagesize = pagesize

        def drawString(self, x, y, text):
            writes.append((x, y, text))

        def save(self):
            self.buf.write(b"ok-pdf")

    monkeypatch.setitem(sys.modules, "reportlab.lib.units", types.SimpleNamespace(mm=1))
    monkeypatch.setitem(
        sys.modules,
        "reportlab.pdfgen",
        types.SimpleNamespace(canvas=types.SimpleNamespace(Canvas=DummyCanvas)),
    )

    service = PDFExportService()
    request = type(
        "Req",
        (),
        {
            "width_mm": 91,
            "height_mm": 55,
            "result": type(
                "R",
                (),
                {"card_fields": CardFields(company="ACME", name="Taro")},
            ),
        },
    )
    payload = service.export(request=request)
    assert payload == b"ok-pdf"
    assert writes
