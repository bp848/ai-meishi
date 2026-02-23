from __future__ import annotations

import io
from typing import Any

from PIL import Image, ImageEnhance
from pypdf import PdfReader


class ImageAnalyzer:
    @staticmethod
    def preprocess_image(image_bytes: bytes, mime_type: str) -> bytes:
        if mime_type.startswith("image/"):
            with Image.open(io.BytesIO(image_bytes)) as img:
                img = ImageEnhance.Contrast(img).enhance(1.2)
                img = ImageEnhance.Sharpness(img).enhance(1.1)
                buffer = io.BytesIO()
                img.save(buffer, format=img.format or "PNG")
                return buffer.getvalue()
        return image_bytes

    @staticmethod
    def extract_metadata(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
        metadata: dict[str, Any] = {}
        if mime_type == "application/pdf":
            reader = PdfReader(io.BytesIO(image_bytes))
            if reader.pages:
                page = reader.pages[0]
                metadata.update(
                    {
                        "aspect_ratio": float(page.mediabox.width) / float(page.mediabox.height),
                        "page_count": len(reader.pages),
                    }
                )
        elif mime_type.startswith("image/"):
            with Image.open(io.BytesIO(image_bytes)) as img:
                metadata.update(
                    {
                        "aspect_ratio": img.width / img.height,
                        "width": img.width,
                        "height": img.height,
                        "format": img.format,
                    }
                )
        return metadata
