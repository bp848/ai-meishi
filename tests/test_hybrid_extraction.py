from app.models import AnalysisResult, CardFields
from app.services.extraction import ExtractionService
from app.services.hybrid_analyzer import HybridAnalyzer


class DummyOpenAI:
    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        _ = (file_bytes, mime_type)
        return AnalysisResult(
            extracted_text="Acme\nJane",
            card_fields=CardFields(name="Jane"),
            metadata={},
        )


class DummyAcrobat:
    def __init__(self, result: AnalysisResult) -> None:
        self.result = result

    def analyze_with_mcp(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        _ = (file_bytes, mime_type)
        return self.result


def test_hybrid_analyzer_merge_for_incomplete_pdf():
    acrobat_result = AnalysisResult(
        extracted_text="",
        card_fields=CardFields(name=""),
        metadata={"a": 1},
    )
    analyzer = HybridAnalyzer(
        openai_client=DummyOpenAI(),
        acrobat_client=DummyAcrobat(acrobat_result),
    )
    result = analyzer.analyze(b"pdf", "application/pdf")
    assert result.card_fields.name == "Jane"
    assert result.metadata["merge_strategy"] == "acrobat_primary_openai_fallback"


def test_extraction_service_infers_fields_when_missing_name():
    class StubHybrid:
        def analyze(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
            _ = (file_bytes, mime_type)
            return AnalysisResult(
                extracted_text="Acme Inc\nTaro Yamada\nmail@test.com",
                card_fields=CardFields(),
            )

    service = ExtractionService(hybrid_analyzer=StubHybrid())
    result = service.analyze(b"img", "image/jpeg")
    assert result.card_fields.company == "Acme Inc"
    assert result.card_fields.name == "Taro Yamada"
    assert result.card_fields.email == "mail@test.com"
