# Codex バックエンド開発指示書

## プロジェクト概要
AI名刺解析・テンプレート編集アプリのバックエンドをCodexで開発

## 現状の実装状況
✅ FastAPIバックエンド骨格  
✅ APIエンドポイント定義  
✅ 基本的なデータモデル  
❌ Gemini AI連携（骨格のみ）  
❌ 依存関係不足  
❌ 実際の画像解析ロジック未実装  

## 必須開発タスク

### 1. 依存関係の追加と修正

#### pyproject.toml の更新
```toml
[project]
name = "ai-meishi"
version = "0.1.0"
requires-python = ">=3.11"
dependencies = [
  "fastapi>=0.115",
  "uvicorn>=0.30",
  "python-multipart>=0.0.9",
  "pydantic>=2.8",
  # 追加依存関係
  "openai>=1.0.0",
  "pypdf>=4.2.0",
  "pillow>=10.0.0",
  "reportlab>=4.2.0",
  "python-jose[cryptography]>=3.3.0",
  "passlib[bcrypt]>=1.7.4",
  "sqlalchemy>=2.0.0",
  "alembic>=1.13.0",
  "websockets>=12.0",
  "requests>=2.31.0",
]

[project.optional-dependencies]
dev = [
  "pytest>=8.2",
  "pytest-cov>=5.0",
  "httpx>=0.27",
  "ruff>=0.6",
  "pytest-asyncio>=0.23.0",
]
```

### 2. OpenAI API + Acrobat MCP連携の完全実装

#### app/services/openai_client.py の新規作成
```python
from __future__ import annotations

import base64
import json
import os
from typing import Any

from app.models import AnalysisResult, CardFields, LogoCandidate

class OpenAIClient:
    def __init__(self, model: str = "gpt-4o") -> None:
        self.model = model
        self._client = None

    @property
    def client(self):
        if self._client is None:
            api_key = os.getenv("OPENAI_API_KEY")
            if not api_key:
                raise RuntimeError("OPENAI_API_KEY is not configured")
            from openai import OpenAI
            self._client = OpenAI(api_key=api_key)
        return self._client

    def analyze_document(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        """ビジネスカードを詳細に解析"""
        prompt = self._build_detailed_prompt()
        
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": self._encode_image(file_bytes, mime_type)}
            ],
            response_format={"type": "json_object"}
        )
        
        return self._parse_response_text(response.choices[0].message.content)

    def _encode_image(self, file_bytes: bytes, mime_type: str) -> str:
        """画像をbase64エンコード"""
        base64_image = base64.b64encode(file_bytes).decode('utf-8')
        return f"data:{mime_type};base64,{base64_image}"

    def _build_detailed_prompt(self) -> str:
        """詳細な解析プロンプトを構築"""
        return """
        ビジネスカードを解析して、以下のJSON形式で返してください:

        {
            "extracted_text": "カード全体のテキスト（改行維持）",
            "card_fields": {
                "company": "会社名",
                "name": "個人名",
                "title": "役職",
                "email": "メールアドレス",
                "phone": "電話番号",
                "address": "住所",
                "website": "ウェブサイトURL"
            },
            "layout_elements": [
                {
                    "key": "name",
                    "text": "山田 太郎",
                    "x": 12.5,
                    "y": 14.2,
                    "width": 50.0,
                    "height": 10.0,
                    "style": {
                        "size": 14,
                        "weight": "bold",
                        "color": "#111111",
                        "family": "sans-serif"
                    }
                }
            ],
            "logos": [
                {
                    "name": "company_logo",
                    "svg": "M0 0 H100 V32 H0 Z...",
                    "confidence": 0.95
                }
            ],
            "metadata": {
                "aspect_ratio": 1.6545,
                "background_color": "#FFFFFF",
                "detected_language": "ja"
            }
        }

        重要:
        - 座標はミリメートル単位（91mm×55mm名刺基準）
        - 色は16進数で指定
        - SVGはベクターデータを正確に再現
        - 信頼度は0.0-1.0で評価
        """

    def _parse_response_text(self, payload: str) -> AnalysisResult:
        """OpenAIレスポンスを解析"""
        try:
            parsed: dict[str, Any] = json.loads(payload)
            
            logos = [LogoCandidate(**logo) for logo in parsed.get("logos", [])]
            card_fields = CardFields(**parsed.get("card_fields", {}))
            
            return AnalysisResult(
                extracted_text=parsed.get("extracted_text", ""),
                card_fields=card_fields,
                logos=logos,
                metadata={
                    **parsed.get("metadata", {}),
                    "provider": "openai",
                    "layout_elements": parsed.get("layout_elements", [])
                }
            )
        except (json.JSONDecodeError, TypeError) as exc:
            raise ValueError(f"Invalid OpenAI response format: {exc}") from exc
```

#### app/services/acrobat_mcp_client.py の新規作成
```python
from __future__ import annotations

import json
import os
from typing import Any, Dict, List

from app.models import AnalysisResult, CardFields, LogoCandidate

class AcrobatMCPClient:
    def __init__(self) -> None:
        self.api_key = os.getenv("ACROBAT_API_KEY")
        if not self.api_key:
            raise RuntimeError("ACROBAT_API_KEY is not configured")

    def extract_pdf_content(self, file_bytes: bytes) -> Dict[str, Any]:
        """PDFからテキスト、画像、メタデータを抽出"""
        import requests
        
        # 一時ファイルに保存
        temp_file_path = "/tmp/business_card.pdf"
        with open(temp_file_path, "wb") as f:
            f.write(file_bytes)
        
        try:
            # Acrobat APIでPDF解析
            headers = {
                "Authorization": f"Bearer {self.api_key}",
                "Content-Type": "application/json"
            }
            
            payload = {
                "input": temp_file_path,
                "output_format": "json",
                "extract_images": True,
                "extract_text": True,
                "extract_metadata": True
            }
            
            response = requests.post(
                "https://api.adobe.com/pdfservices/extract",
                headers=headers,
                json=payload
            )
            
            if response.status_code != 200:
                raise Exception(f"Acrobat API error: {response.status_code}")
            
            return response.json()
            
        finally:
            # 一時ファイルを削除
            if os.path.exists(temp_file_path):
                os.remove(temp_file_path)

    def analyze_with_mcp(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        """Acrobat MCPを使用してPDFを詳細解析"""
        if mime_type != "application/pdf":
            raise ValueError("Acrobat MCP only supports PDF files")
        
        extracted_data = self.extract_pdf_content(file_bytes)
        
        # テキスト抽出
        extracted_text = extracted_data.get("text", "")
        
        # フィールド抽出（正規表現と位置情報を使用）
        card_fields = self._extract_fields_from_pdf(extracted_data)
        
        # ロゴ検出
        logos = self._detect_logos_in_pdf(extracted_data)
        
        # レイアウト要素
        layout_elements = self._extract_layout_elements(extracted_data)
        
        return AnalysisResult(
            extracted_text=extracted_text,
            card_fields=card_fields,
            logos=logos,
            metadata={
                "provider": "acrobat_mcp",
                "layout_elements": layout_elements,
                "pdf_metadata": extracted_data.get("metadata", {})
            }
        )

    def _extract_fields_from_pdf(self, data: Dict[str, Any]) -> CardFields:
        """PDFデータからフィールドを抽出"""
        text = data.get("text", "")
        
        # テキスト位置情報を使用してフィールドを特定
        text_elements = data.get("text_elements", [])
        
        fields = {}
        
        # メールアドレス検出
        for element in text_elements:
            content = element.get("text", "")
            if "@" in content and "." in content:
                fields["email"] = content
            elif any(keyword in content.lower() for keyword in ["tel", "phone", "電話"]):
                fields["phone"] = content
            elif any(keyword in content.lower() for keyword in ["www", "http", "web"]):
                fields["website"] = content
        
        # 会社名と個人名を推定（位置情報から）
        sorted_elements = sorted(text_elements, key=lambda x: x.get("y", 0))
        
        if len(sorted_elements) >= 2:
            fields["company"] = sorted_elements[0].get("text", "")
            fields["name"] = sorted_elements[1].get("text", "")
        
        if len(sorted_elements) >= 3:
            fields["title"] = sorted_elements[2].get("text", "")
        
        return CardFields(**fields)

    def _detect_logos_in_pdf(self, data: Dict[str, Any]) -> List[LogoCandidate]:
        """PDFからロゴを検出"""
        logos = []
        images = data.get("images", [])
        
        for i, image in enumerate(images):
            # 画像サイズと位置からロゴ候補を判定
            width = image.get("width", 0)
            height = image.get("height", 0)
            x = image.get("x", 0)
            y = image.get("y", 0)
            
            # ロゴの特徴：小さく、角にある
            if (width < 100 and height < 100 and 
                (x < 50 or y < 50)):  # 角にある
                
                # 簡易SVG生成（実際はより高度な処理が必要）
                svg_path = f"M{x} {y} H{x+width} V{y+height} H{x} Z"
                
                logos.append(LogoCandidate(
                    name=f"logo_{i}",
                    svg=svg_path,
                    confidence=0.7
                ))
        
        return logos

    def _extract_layout_elements(self, data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """PDFからレイアウト要素を抽出"""
        elements = []
        text_elements = data.get("text_elements", [])
        
        for element in text_elements:
            text = element.get("text", "")
            if not text.strip():
                continue
            
            # フォント情報からスタイルを推定
            font_info = element.get("font", {})
            font_size = font_info.get("size", 10)
            font_weight = "bold" if font_info.get("bold", False) else "normal"
            font_color = font_info.get("color", "#000000")
            
            elements.append({
                "key": self._generate_element_key(text),
                "text": text,
                "x": element.get("x", 0) / 72 * 25.4,  # ptをmmに変換
                "y": element.get("y", 0) / 72 * 25.4,
                "width": element.get("width", 50) / 72 * 25.4,
                "height": element.get("height", 10) / 72 * 25.4,
                "style": {
                    "size": font_size,
                    "weight": font_weight,
                    "color": font_color,
                    "family": font_info.get("family", "sans-serif")
                }
            })
        
        return elements

    def _generate_element_key(self, text: str) -> str:
        """テキスト内容から要素キーを生成"""
        text_lower = text.lower()
        
        if "@" in text:
            return "email"
        elif any(keyword in text_lower for keyword in ["tel", "phone", "電話"]):
            return "phone"
        elif any(keyword in text_lower for keyword in ["www", "http"]):
            return "website"
        elif len(text.split()) <= 3 and not any(char.isdigit() for char in text):
            return "name"
        else:
            return "text"
```

#### app/services/extraction.py の更新
```python
from __future__ import annotations

import io
import re
from typing import Any

from app.models import ALLOWED_MIME_TYPES, AnalysisResult, CardFields
from app.services.hybrid_analyzer import HybridAnalyzer

class ExtractionService:
    def __init__(self, hybrid_analyzer: HybridAnalyzer | None = None) -> None:
        self.hybrid_analyzer = hybrid_analyzer or HybridAnalyzer()

    def analyze(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        if mime_type not in ALLOWED_MIME_TYPES:
            raise ValueError(f"Unsupported mime type: {mime_type}")

        result = self.hybrid_analyzer.analyze(file_bytes=file_bytes, mime_type=mime_type)

        if not result.extracted_text and mime_type == "application/pdf":
            result.extracted_text = self._extract_pdf_text(file_bytes)

        if not result.card_fields.name and result.extracted_text:
            result.card_fields = self._infer_fields(result.extracted_text, result.card_fields)

        return result

    def _extract_pdf_text(self, file_bytes: bytes) -> str:
        try:
            from pypdf import PdfReader  # type: ignore
        except ModuleNotFoundError:
            return ""
        reader = PdfReader(io.BytesIO(file_bytes))
        return "\n".join((page.extract_text() or "") for page in reader.pages).strip()

    def _infer_fields(self, text: str, existing: CardFields) -> CardFields:
        lines = [line.strip() for line in text.splitlines() if line.strip()]
        email = re.search(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}", text)
        phone = re.search(r"\+?[0-9][0-9\-()\s]{8,}", text)
        website = re.search(r"https?://\S+|www\.\S+", text)

        data: dict[str, Any] = existing.model_dump()
        if lines and not data.get("company"):
            data["company"] = lines[0]
        if len(lines) > 1 and not data.get("name"):
            data["name"] = lines[1]
        if email and not data.get("email"):
            data["email"] = email.group(0)
        if phone and not data.get("phone"):
            data["phone"] = phone.group(0).strip()
        if website and not data.get("website"):
            data["website"] = website.group(0).strip()
        return CardFields(**data)
```

#### app/services/hybrid_analyzer.py の新規作成
```python
from __future__ import annotations

from typing import Any

from app.models import AnalysisResult
from app.services.openai_client import OpenAIClient
from app.services.acrobat_mcp_client import AcrobatMCPClient

class HybridAnalyzer:
    def __init__(self) -> None:
        self.openai_client = OpenAIClient()
        self.acrobat_client = AcrobatMCPClient()

    def analyze(self, file_bytes: bytes, mime_type: str) -> AnalysisResult:
        """ハイブリッド解析：OpenAI + Acrobat MCP"""
        
        if mime_type == "application/pdf":
            # PDFの場合はAcrobat MCPを優先
            try:
                acrobat_result = self.acrobat_client.analyze_with_mcp(file_bytes, mime_type)
                
                # OpenAIで補完解析
                if not acrobat_result.card_fields.name or not acrobat_result.extracted_text:
                    openai_result = self.openai_client.analyze_document(file_bytes, mime_type)
                    return self._merge_results(acrobat_result, openai_result)
                
                return acrobat_result
                
            except Exception as e:
                # Acrobat MCP失敗時はOpenAIにフォールバック
                print(f"Acrobat MCP failed: {e}, falling back to OpenAI")
                return self.openai_client.analyze_document(file_bytes, mime_type)
        
        else:
            # 画像の場合はOpenAIのみ
            return self.openai_client.analyze_document(file_bytes, mime_type)

    def _merge_results(self, primary: AnalysisResult, fallback: AnalysisResult) -> AnalysisResult:
        """2つの解析結果をマージ"""
        merged_metadata = {
            **primary.metadata,
            **fallback.metadata,
            "merge_strategy": "acrobat_primary_openai_fallback"
        }
        
        # 欠けているフィールドを補完
        merged_card_fields = primary.card_fields
        fallback_fields = fallback.card_fields
        
        if not merged_card_fields.name and fallback_fields.name:
            merged_card_fields.name = fallback_fields.name
        if not merged_card_fields.email and fallback_fields.email:
            merged_card_fields.email = fallback_fields.email
        # ... 他のフィールドも同様
        
        return AnalysisResult(
            extracted_text=primary.extracted_text or fallback.extracted_text,
            card_fields=merged_card_fields,
            logos=primary.logos or fallback.logos,
            metadata=merged_metadata
        )
```

### 3. 高度な画像解析機能

#### app/services/image_analyzer.py の新規作成
```python
from __future__ import annotations

import io
from typing import Any

from PIL import Image, ImageEnhance
from pypdf import PdfReader

class ImageAnalyzer:
    @staticmethod
    def preprocess_image(image_bytes: bytes, mime_type: str) -> bytes:
        """画像の前処理（コントラスト強調、リサイズなど）"""
        if mime_type.startswith("image/"):
            with Image.open(io.BytesIO(image_bytes)) as img:
                # コントラスト強調
                enhancer = ImageEnhance.Contrast(img)
                img = enhancer.enhance(1.2)
                
                # シャープネス強調
                enhancer = ImageEnhance.Sharpness(img)
                img = enhancer.enhance(1.1)
                
                # バッファに保存
                buffer = io.BytesIO()
                img.save(buffer, format=img.format or "PNG")
                return buffer.getvalue()
        
        return image_bytes

    @staticmethod
    def extract_metadata(image_bytes: bytes, mime_type: str) -> dict[str, Any]:
        """画像メタデータを抽出"""
        metadata = {}
        
        if mime_type == "application/pdf":
            reader = PdfReader(io.BytesIO(image_bytes))
            if reader.pages:
                page = reader.pages[0]
                metadata.update({
                    "aspect_ratio": float(page.mediabox.width) / float(page.mediabox.height),
                    "page_count": len(reader.pages)
                })
        elif mime_type.startswith("image/"):
            with Image.open(io.BytesIO(image_bytes)) as img:
                metadata.update({
                    "aspect_ratio": img.width / img.height,
                    "width": img.width,
                    "height": img.height,
                    "format": img.format
                })
        
        return metadata
```

### 4. ロゴ認識とSVG生成

#### app/services/logo_detector.py の新規作成
```python
from __future__ import annotations

import cv2
import numpy as np
from typing import List, Tuple

from app.models import LogoCandidate

class LogoDetector:
    def detect_logos(self, image_bytes: bytes) -> List[LogoCandidate]:
        """画像からロゴを検出しSVGを生成"""
        try:
            # 画像をOpenCV形式に変換
            nparr = np.frombuffer(image_bytes, np.uint8)
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            # ロゴ候補領域を検出
            logo_regions = self._find_logo_regions(image)
            
            # 各領域をSVGに変換
            logos = []
            for i, region in enumerate(logo_regions):
                svg_path = self._region_to_svg(region)
                confidence = self._calculate_confidence(region)
                
                logos.append(LogoCandidate(
                    name=f"logo_{i}",
                    svg=svg_path,
                    confidence=confidence
                ))
            
            return logos
            
        except Exception:
            return []

    def _find_logo_regions(self, image: np.ndarray) -> List[np.ndarray]:
        """ロゴと思われる領域を検出"""
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # 輪郭検出
        contours, _ = cv2.findContours(gray, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        # ロゴ候補をフィルタリング
        logo_regions = []
        for contour in contours:
            area = cv2.contourArea(contour)
            if 1000 < area < 50000:  # 面積でフィルタリング
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = w / h
                
                # 縦横比でフィルタリング（正方形に近いものを優先）
                if 0.5 < aspect_ratio < 2.0:
                    logo_regions.append(image[y:y+h, x:x+w])
        
        return logo_regions

    def _region_to_svg(self, region: np.ndarray) -> str:
        """画像領域をSVGパスに変換"""
        # 簡略化されたSVG生成（実際はより高度な処理が必要）
        height, width = region.shape[:2]
        
        # エッジ検出でSVGパスを生成
        gray = cv2.cvtColor(region, cv2.COLOR_BGR2GRAY)
        edges = cv2.Canny(gray, 50, 150)
        contours, _ = cv2.findContours(edges, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        svg_paths = []
        for contour in contours:
            if len(contour) > 5:
                path_data = self._contour_to_svg_path(contour)
                svg_paths.append(path_data)
        
        return f'<svg viewBox="0 0 {width} {height}"><path d="{"".join(svg_paths)}" fill="black"/></svg>'

    def _contour_to_svg_path(self, contour: np.ndarray) -> str:
        """OpenCV輪郭をSVGパスに変換"""
        path_parts = []
        for i, point in enumerate(contour):
            x, y = point[0]
            if i == 0:
                path_parts.append(f"M{x} {y}")
            else:
                path_parts.append(f"L{x} {y}")
        path_parts.append("Z")
        return " ".join(path_parts)

    def _calculate_confidence(self, region: np.ndarray) -> float:
        """ロゴの信頼度を計算"""
        # 簡易的な信頼度計算
        height, width = region.shape[:2]
        area = height * width
        
        # 面積と縦横比から信頼度を算出
        aspect_ratio = width / height
        confidence = min(1.0, area / 10000)  # 面積による正規化
        
        if 0.8 < aspect_ratio < 1.2:  # 正方形に近いほど高信頼度
            confidence *= 1.2
        
        return min(1.0, confidence)
```

### 5. PDFエクスポート機能の強化

#### app/services/pdf_export.py の更新
```python
from __future__ import annotations

import io
from typing import Any

from reportlab.lib.colors import HexColor
from reportlab.lib.units import mm
from reportlab.pdfgen.canvas import Canvas
from reportlab.graphics.shapes import Drawing
from reportlab.graphics.renderPDF import draw

from app.models import AnalysisResult

CARD_WIDTH = 91 * mm
CARD_HEIGHT = 55 * mm

class PDFExportService:
    def export(self, request: PDFExportRequest) -> bytes:
        """高品質なPDFを生成"""
        buffer = io.BytesIO()
        canvas = Canvas(buffer, pagesize=(CARD_WIDTH, CARD_HEIGHT))
        
        # 背景を描画
        self._draw_background(canvas, request.result)
        
        # レイアウト要素を描画
        layout_elements = request.result.metadata.get("layout_elements", [])
        for element in layout_elements:
            self._draw_layout_element(canvas, element, request.field_overrides)
        
        # ロゴを描画
        for logo in request.result.logos:
            self._draw_logo(canvas, logo)
        
        canvas.save()
        return buffer.getvalue()

    def _draw_background(self, canvas: Canvas, result: AnalysisResult) -> None:
        """背景色を描画"""
        bg_color = result.metadata.get("background_color", "#FFFFFF")
        canvas.setFillColor(HexColor(bg_color))
        canvas.rect(0, 0, CARD_WIDTH, CARD_HEIGHT, stroke=0, fill=1)

    def _draw_layout_element(self, canvas: Canvas, element: dict[str, Any], overrides: dict[str, str]) -> None:
        """テキスト要素を描画"""
        key = element.get("key", "")
        text = overrides.get(key, element.get("text", ""))
        
        if not text:
            return
        
        x = element.get("x", 0) * mm
        y = CARD_HEIGHT - ((element.get("y", 0) + element.get("height", 0)) * mm)
        
        style = element.get("style", {})
        color = style.get("color", "#000000")
        size = style.get("size", 10)
        weight = style.get("weight", "normal")
        family = style.get("family", "sans-serif")
        
        canvas.setFillColor(HexColor(color))
        font_name = self._get_font_name(weight, family)
        canvas.setFont(font_name, size)
        canvas.drawString(x, y, text)

    def _draw_logo(self, canvas: Canvas, logo: LogoCandidate) -> None:
        """ロゴSVGを描画"""
        try:
            # SVGをReportLab Drawingに変換
            # （実際の実装ではSVGパーサーが必要）
            pass
        except Exception:
            # ロゴ描画エラーは無視
            pass

    def _get_font_name(self, weight: str, family: str) -> str:
        """フォント名を取得"""
        if weight == "bold":
            return "Helvetica-Bold"
        return "Helvetica"
```

### 6. データベース統合

#### app/database.py の新規作成
```python
from __future__ import annotations

from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

#### app/models/database.py の新規作成
```python
from __future__ import annotations

from sqlalchemy import Column, String, DateTime, JSON, Float
from sqlalchemy.sql import func

from app.database import Base

class Template(Base):
    __tablename__ = "templates"
    
    id = Column(String, primary_key=True)
    name = Column(String, nullable=False)
    width_mm = Column(Float, default=91.0)
    height_mm = Column(Float, default=55.0)
    fields = Column(JSON, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

class Analysis(Base):
    __tablename__ = "analyses"
    
    id = Column(String, primary_key=True)
    result = Column(JSON, nullable=False)
    mime_type = Column(String, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

### 7. 設定管理

#### app/config.py の更新
```python
from __future__ import annotations

import os
from typing import Any

from pydantic import BaseSettings

class Settings(BaseSettings):
    database_url: str = "sqlite:///./ai_meishi.db"
    openai_api_key: str = ""
    acrobat_api_key: str = ""
    cors_origins: list[str] = ["http://localhost:3000"]
    max_file_size: int = 10 * 1024 * 1024  # 10MB
    
    class Config:
        env_file = ".env"

settings = Settings()
```

### 8. テストの拡充

#### tests/test_openai_integration.py の新規作成
```python
import pytest
from unittest.mock import patch, MagicMock

from app.services.openai_client import OpenAIClient
from app.models import AnalysisResult

class TestOpenAIIntegration:
    @pytest.fixture
    def client(self):
        with patch.dict(os.environ, {"OPENAI_API_KEY": "test_key"}):
            return OpenAIClient()

    @pytest.mark.asyncio
    async def test_analyze_document_success(self, client):
        # モック設定
        mock_response = MagicMock()
        mock_response.choices = [MagicMock()]
        mock_response.choices[0].message.content = json.dumps({
            "extracted_text": "Test Company\nJohn Doe\nCEO",
            "card_fields": {
                "company": "Test Company",
                "name": "John Doe",
                "title": "CEO"
            },
            "logos": [],
            "metadata": {}
        })
        
        with patch.object(client.client.chat.completions, 'create', return_value=mock_response):
            result = client.analyze_document(b"fake_image", "image/jpeg")
            
            assert isinstance(result, AnalysisResult)
            assert result.card_fields.name == "John Doe"
            assert result.metadata["provider"] == "openai"

    def test_missing_api_key(self):
        client = OpenAIClient()
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(RuntimeError, match="OPENAI_API_KEY is not configured"):
                _ = client.client
```

#### tests/test_acrobat_mcp.py の新規作成
```python
import pytest
from unittest.mock import patch, MagicMock

from app.services.acrobat_mcp_client import AcrobatMCPClient
from app.models import AnalysisResult

class TestAcrobatMCP:
    @pytest.fixture
    def client(self):
        with patch.dict(os.environ, {"ACROBAT_API_KEY": "test_key"}):
            return AcrobatMCPClient()

    @pytest.mark.asyncio
    async def test_analyze_pdf_success(self, client):
        mock_response = {
            "text": "Test Company\nJohn Doe\nCEO\njohn@test.com",
            "text_elements": [
                {"text": "Test Company", "x": 10, "y": 10, "width": 50, "height": 8, "font": {"size": 12, "bold": True}},
                {"text": "John Doe", "x": 10, "y": 20, "width": 40, "height": 8, "font": {"size": 10, "bold": False}},
                {"text": "john@test.com", "x": 10, "y": 30, "width": 60, "height": 6, "font": {"size": 8, "bold": False}}
            ],
            "images": [],
            "metadata": {}
        }
        
        with patch.object(client, 'extract_pdf_content', return_value=mock_response):
            result = client.analyze_with_mcp(b"fake_pdf", "application/pdf")
            
            assert isinstance(result, AnalysisResult)
            assert result.card_fields.company == "Test Company"
            assert result.card_fields.name == "John Doe"
            assert result.metadata["provider"] == "acrobat_mcp"

    def test_missing_api_key(self):
        with patch.dict(os.environ, {}, clear=True):
            with pytest.raises(RuntimeError, match="ACROBAT_API_KEY is not configured"):
                AcrobatMCPClient()
```

### 9. 環境設定

#### .env.example の更新
```env
# OpenAI API
OPENAI_API_KEY=your_openai_api_key_here

# Acrobat API
ACROBAT_API_KEY=your_acrobat_api_key_here

# Database
DATABASE_URL=sqlite:///./ai_meishi.db

# CORS
CORS_ORIGINS=http://localhost:3000,https://yourdomain.com

# File Upload
MAX_FILE_SIZE=10485760
```

#### Dockerfile の作成
```dockerfile
FROM python:3.11-slim

WORKDIR /app

COPY pyproject.toml .
RUN pip install -e .

COPY app/ ./app/

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### 10. デプロイ準備

#### docker-compose.yml の作成
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "8000:8000"
    environment:
      - OPENAI_API_KEY=${OPENAI_API_KEY}
      - ACROBAT_API_KEY=${ACROBAT_API_KEY}
      - DATABASE_URL=sqlite:///./data/ai_meishi.db
    volumes:
      - ./data:/app/data
    restart: unless-stopped

  frontend:
    build: ../frontend
    ports:
      - "3000:3000"
    depends_on:
      - backend
    restart: unless-stopped
```

## 開発優先順位

1. **高優先度**
   - 依存関係の追加
   - OpenAI API連携の完全実装
   - Acrobat MCP連携の実装
   - ハイブリッド解析機能

2. **中優先度**
   - ロゴ検出とSVG生成
   - PDFエクスポート機能強化
   - データベース統合

3. **低優先度**
   - 高度な画像前処理
   - パフォーマンス最適化
   - キャッシュ機能

## アーキテクチャ概要

### **ハイブリッド解析戦略**
- **PDFファイル**: Acrobat MCPを優先、OpenAIで補完
- **画像ファイル**: OpenAI GPT-4o Visionを使用
- **フォールバック**: 従来の正規表現ベース抽出

### **API連携フロー**
```
ファイルアップロード → HybridAnalyzer
    ↓
PDFの場合: Acrobat MCP → OpenAI（補完）
画像の場合: OpenAI Vision
    ↓
結果マージ → レスポンス返却
```

### **主要サービス**
- `OpenAIClient`: GPT-4o Visionによる画像解析
- `AcrobatMCPClient`: PDFの詳細な構造解析
- `HybridAnalyzer`: 複数サービスの結果統合
- `ExtractionService`: ファイル形式判定とルーティング

## 納品物
- 完全なFastAPIバックエンド
- データベースマイグレーション
- Dockerデプロイ設定
- 環境設定ファイル
- 拡充されたテストスイート
