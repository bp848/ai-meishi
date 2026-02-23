from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, Field


class FontStyle(BaseModel):
    size: float = Field(gt=0)
    weight: Literal["normal", "bold"] = "normal"
    color: str = Field(pattern=r"^#(?:[0-9A-Fa-f]{6})$")
    family: Literal["serif", "sans-serif"] = "sans-serif"


class LayoutElement(BaseModel):
    key: str
    text: str
    x: float = Field(ge=0)
    y: float = Field(ge=0)
    width: float = Field(gt=0)
    height: float = Field(gt=0)
    style: FontStyle


class LogoSVG(BaseModel):
    view_box: str
    svg_path: str


class SideTemplate(BaseModel):
    side: Literal["front", "back"]
    aspect_ratio: float = Field(gt=0)
    background_color: str = Field(pattern=r"^#(?:[0-9A-Fa-f]{6})$")
    elements: list[LayoutElement]
    logo: LogoSVG | None = None


class AnalysisResponse(BaseModel):
    front: SideTemplate
    back: SideTemplate | None = None


class PDFExportRequest(BaseModel):
    template: AnalysisResponse
    field_overrides: dict[str, str] = Field(default_factory=dict)
