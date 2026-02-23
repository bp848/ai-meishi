from __future__ import annotations

from app.models import AnalysisResult, CardFields
from app.services.acrobat_mcp_client import AcrobatMCPClient
from app.services.openai_client import OpenAIClient


class HybridAnalyzer:
    def __init__(
        self,
        openai_client: OpenAIClient | None = None,
        acrobat_client: AcrobatMCPClient | None = None,
    ) -> None:
        self.openai_client = openai_client or OpenAIClient()
        self.acrobat_client = acrobat_client

    def analyze(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        if mime_type == "application/pdf":
            if self.acrobat_client is None:
                self.acrobat_client = AcrobatMCPClient()
            try:
                acrobat_result = self.acrobat_client.analyze_with_mcp(file_bytes, mime_type)
                if not acrobat_result.card_fields.name or not acrobat_result.extracted_text:
                    openai_result = self.openai_client.analyze_document(file_bytes, mime_type)
                    return self._merge_results(acrobat_result, openai_result)
                return acrobat_result
            except Exception:
                return self.openai_client.analyze_document(file_bytes, mime_type)
        return self.openai_client.analyze_document(file_bytes, mime_type)

    def _merge_results(self, primary: AnalysisResult, fallback: AnalysisResult) -> AnalysisResult:
        merged_metadata = {
            **primary.metadata,
            **fallback.metadata,
            "merge_strategy": "acrobat_primary_openai_fallback",
        }
        merged_card_fields = CardFields(**primary.card_fields.model_dump())
        fallback_fields = fallback.card_fields
        for key in ["company", "name", "title", "email", "phone", "address", "website"]:
            if not getattr(merged_card_fields, key) and getattr(fallback_fields, key):
                setattr(merged_card_fields, key, getattr(fallback_fields, key))

        return AnalysisResult(
            extracted_text=primary.extracted_text or fallback.extracted_text,
            card_fields=merged_card_fields,
            logos=primary.logos or fallback.logos,
            metadata=merged_metadata,
        )
