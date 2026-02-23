from __future__ import annotations

import hashlib
import io
from typing import Literal

from PIL import Image, UnidentifiedImageError
from pypdf import PdfReader
from pypdf.errors import PdfReadError

from .models import AnalysisResponse, FontStyle, LayoutElement, LogoSVG, SideTemplate


class TemplateAnalyzer:
    def analyze(self, front_bytes: bytes, back_bytes: bytes | None) -> AnalysisResponse:
        front = self._analyze_side(front_bytes, "front")
        back = self._analyze_side(back_bytes, "back") if back_bytes else None
        return AnalysisResponse(front=front, back=back)

    def _analyze_side(self, content: bytes | None, side: Literal["front", "back"]) -> SideTemplate:
        if not content:
            raise ValueError(f"{side} content is empty")

        aspect_ratio = self._extract_aspect_ratio(content)
        seed = hashlib.sha256(content).hexdigest()[:6]
        elements = [
            LayoutElement(
                key="name",
                text="山田 太郎",
                x=12,
                y=14,
                width=50,
                height=10,
                style=FontStyle(size=14, weight="bold", color="#111111", family="sans-serif"),
            ),
            LayoutElement(
                key="title",
                text="営業部長",
                x=12,
                y=26,
                width=36,
                height=8,
                style=FontStyle(size=9, weight="normal", color="#333333", family="sans-serif"),
            ),
            LayoutElement(
                key="email",
                text="taro@example.co.jp",
                x=12,
                y=40,
                width=60,
                height=7,
                style=FontStyle(size=8, weight="normal", color="#222222", family="sans-serif"),
            ),
        ]
        logo = LogoSVG(
            view_box="0 0 100 32",
            svg_path=f"M0 0 H100 V32 H0 Z M10 8 H90 V24 H10 Z #{seed}",
        )

        return SideTemplate(
            side=side,
            aspect_ratio=aspect_ratio,
            background_color="#FFFFFF",
            elements=elements,
            logo=logo,
        )

    @staticmethod
    def _extract_aspect_ratio(content: bytes) -> float:
        if content.startswith(b"%PDF"):
            try:
                reader = PdfReader(io.BytesIO(content))
            except PdfReadError as exc:
                raise ValueError("Invalid PDF content") from exc
            if not reader.pages:
                raise ValueError("PDF has no pages")
            page = reader.pages[0]
            box = page.mediabox
            width = float(box.width)
            height = float(box.height)
            if width <= 0 or height <= 0:
                raise ValueError("Invalid PDF dimensions")
            return width / height

        try:
            with Image.open(io.BytesIO(content)) as img:
                width, height = img.size
        except UnidentifiedImageError as exc:
            raise ValueError("Unsupported image content") from exc

        if width <= 0 or height <= 0:
            raise ValueError("Invalid image dimensions")
        return width / height
