from __future__ import annotations

from fastapi.testclient import TestClient

from app.main import app


class StubExtractionService:
    def analyze(self, file_bytes: bytes, mime_type: str):
        from app.models import AnalysisResult, CardFields

        return AnalysisResult(
            extracted_text="ACME\nTaro\nmail@example.com",
            card_fields=CardFields(company="ACME", name="Taro", email="mail@example.com"),
            logos=[],
        )


client = TestClient(app)


def test_health() -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_file_success(monkeypatch) -> None:
    monkeypatch.setattr("app.main.extraction_service", StubExtractionService())

    response = client.post(
        "/api/v1/files/analyze",
        files={"file": ("card.png", b"x", "image/png")},
        data={"overrides": '{"name":"Hanako"}'},
    )
    assert response.status_code == 200
    body = response.json()
    assert body["result"]["card_fields"]["name"] == "Hanako"


def test_analyze_file_invalid_mime() -> None:
    response = client.post(
        "/api/v1/files/analyze",
        files={"file": ("card.txt", b"x", "text/plain")},
    )
    assert response.status_code == 400


def test_export_pdf() -> None:
    payload = {
        "result": {
            "extracted_text": "x",
            "card_fields": {"company": "ACME"},
            "logos": [],
            "metadata": {},
        }
    }
    response = client.post("/api/v1/pdf/export", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"].startswith("application/pdf")


def test_templates_crud() -> None:
    created = client.post(
        "/api/v1/templates",
        json={"name": "default", "fields": [{"key": "name", "x": 10, "y": 10, "font_size": 12}]},
    )
    assert created.status_code == 200
    template_id = created.json()["id"]

    listed = client.get("/api/v1/templates")
    assert listed.status_code == 200
    assert len(listed.json()) >= 1

    fetched = client.get(f"/api/v1/templates/{template_id}")
    assert fetched.status_code == 200


def test_template_not_found() -> None:
    response = client.get("/api/v1/templates/aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa")
    assert response.status_code == 404


def test_preview_render() -> None:
    response = client.post(
        "/api/v1/preview/render",
        json={
            "template": {
                "id": "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa",
                "name": "t",
                "width_mm": 91,
                "height_mm": 55,
                "fields": [{"key": "name", "x": 1, "y": 2, "font_size": 12}],
            },
            "values": {"name": "Taro"},
        },
    )
    assert response.status_code == 200
    assert response.json()["rendered"][0]["value"] == "Taro"


def test_preview_ws() -> None:
    with client.websocket_connect("/api/v1/preview/ws") as ws:
        ws.send_json({"type": "preview", "payload": {"foo": "bar"}})
        response = ws.receive_json()
        assert response["payload"] == {"foo": "bar"}
