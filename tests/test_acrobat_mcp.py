import os
from unittest.mock import patch

import pytest

from app.models import AnalysisResult
from app.services.acrobat_mcp_client import AcrobatMCPClient


class TestAcrobatMCP:
    @pytest.fixture
    def client(self):
        with patch.dict(os.environ, {"ACROBAT_API_KEY": "test_key"}):
            yield AcrobatMCPClient()

    def test_analyze_pdf_success(self, client):
        mock_response = {
            "text": "Test Company\\nJohn Doe\\nCEO\\njohn@test.com",
            "text_elements": [
                {
                    "text": "Test Company",
                    "x": 10,
                    "y": 10,
                    "width": 50,
                    "height": 8,
                    "font": {"size": 12, "bold": True},
                },
                {
                    "text": "John Doe",
                    "x": 10,
                    "y": 20,
                    "width": 40,
                    "height": 8,
                    "font": {"size": 10, "bold": False},
                },
                {
                    "text": "john@test.com",
                    "x": 10,
                    "y": 30,
                    "width": 60,
                    "height": 6,
                    "font": {"size": 8, "bold": False},
                },
            ],
            "images": [],
            "metadata": {},
        }

        with patch.object(client, "extract_pdf_content", return_value=mock_response):
            result = client.analyze_with_mcp(b"fake_pdf", "application/pdf")

        assert isinstance(result, AnalysisResult)
        assert result.card_fields.company == "Test Company"
        assert result.card_fields.name == "John Doe"
        assert result.metadata["provider"] == "acrobat_mcp"

    def test_missing_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(RuntimeError, match="ACROBAT_API_KEY is not configured"):
                AcrobatMCPClient()
