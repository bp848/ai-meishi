from __future__ import annotations

from io import BytesIO

from fastapi.testclient import TestClient
from PIL import Image

from ai_meishi.api import app

client = TestClient(app)


def _png_bytes() -> bytes:
    image = Image.new("RGB", (910, 550), color="white")
    buf = BytesIO()
    image.save(buf, format="PNG")
    return buf.getvalue()


def test_health():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_analyze_image_upload():
    response = client.post(
        "/analyze",
        files={"front": ("front.png", _png_bytes(), "image/png")},
    )

    assert response.status_code == 200
    data = response.json()
    assert data["front"]["side"] == "front"
    assert data["back"] is None



def test_analyze_with_back_image_upload():
    response = client.post(
        "/analyze",
        files={
            "front": ("front.png", _png_bytes(), "image/png"),
            "back": ("back.png", _png_bytes(), "image/png"),
        },
    )

    assert response.status_code == 200
    assert response.json()["back"]["side"] == "back"

def test_analyze_rejects_unsupported_type():
    response = client.post(
        "/analyze",
        files={"front": ("front.txt", b"abc", "text/plain")},
    )

    assert response.status_code == 415


def test_analyze_rejects_unsupported_back_type():
    response = client.post(
        "/analyze",
        files={
            "front": ("front.png", _png_bytes(), "image/png"),
            "back": ("back.txt", b"abc", "text/plain"),
        },
    )

    assert response.status_code == 415


def test_analyze_empty_content_returns_400():
    response = client.post(
        "/analyze",
        files={"front": ("front.png", b"", "image/png")},
    )

    assert response.status_code == 400


def test_export_pdf():
    payload = {
        "template": {
            "front": {
                "side": "front",
                "aspect_ratio": 1.6545,
                "background_color": "#FFFFFF",
                "elements": [
                    {
                        "key": "name",
                        "text": "Original",
                        "x": 10,
                        "y": 10,
                        "width": 30,
                        "height": 8,
                        "style": {
                            "size": 10,
                            "weight": "bold",
                            "color": "#000000",
                            "family": "sans-serif",
                        },
                    }
                ],
                "logo": None,
            },
            "back": None,
        },
        "field_overrides": {"name": "Changed"},
    }

    response = client.post("/export/pdf", json=payload)

    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.content.startswith(b"%PDF")
