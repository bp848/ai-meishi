import json
import os
from unittest.mock import MagicMock, patch

import pytest

from app.models import AnalysisResult
from app.services.openai_client import OpenAIClient


class TestOpenAIIntegration:
    @pytest.fixture
    def client(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
            yield OpenAIClient()

    def test_analyze_document_success(self, client):
        mock_response = MagicMock()
        mock_response.output_text = json.dumps(
            {
                "extracted_text": "Test Company\\nJohn Doe\\nCEO",
                "card_fields": {
                    "company": "Test Company",
                    "name": "John Doe",
                    "title": "CEO",
                },
                "logos": [],
                "metadata": {},
            }
        )
        fake_client = MagicMock()
        fake_client.responses.create.return_value = mock_response
        client._client = fake_client

        result = client.analyze_document(b"fake_image", "image/jpeg")

        assert isinstance(result, AnalysisResult)
        assert result.card_fields.name == "John Doe"
        assert result.metadata["provider"] == "openai"

    def test_missing_api_key(self):
        client = OpenAIClient()
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(RuntimeError, match="OPENAI_API_KEY is not configured"):
                _ = client.client
