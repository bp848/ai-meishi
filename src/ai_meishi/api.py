from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from pydantic import BaseModel
from typing import Optional, Dict, Any
import json

router = APIRouter(prefix="/api/v1")

class AnalysisResult(BaseModel):
    extracted_text: str
    card_fields: Dict[str, str]
    logos: list
    metadata: Dict[str, Any]

class AnalysisResponse(BaseModel):
    mime_type: str
    result: AnalysisResult

@router.post("/files/analyze")
async def analyze_file(file: UploadFile = File(...), overrides: Optional[str] = None):
    """
    名刺画像またはPDFを解析してテキスト情報を抽出
    """
    if not (file.content_type.startswith("image/") or file.content_type == "application/pdf"):
        raise HTTPException(status_code=415, detail="対応していないファイル形式です")
    
    try:
        # ファイルを読み込み
        contents = await file.read()
        
        # PDFの場合はテキスト抽出処理
        if file.content_type == "application/pdf":
            from pypdf import PdfReader
            import io
            
            pdf_stream = io.BytesIO(contents)
            pdf_reader = PdfReader(pdf_stream)
            text = ""
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
            
            # PDFから名刺情報を解析（簡易的な正規表現）
            import re
            email_match = re.search(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', text)
            phone_match = re.search(r'(\d{2,4}[-\s]?\d{2,4}[-\s]?\d{4})', text)
            
            card_fields = {
                "company": "PDFから抽出された会社名",
                "name": "PDFから抽出された氏名", 
                "title": "PDFから抽出された役職",
                "email": email_match.group(0) if email_match else "",
                "phone": phone_match.group(0) if phone_match else "",
                "address": "PDFから抽出された住所",
                "website": ""
            }
        else:
            # 画像の場合のモック解析
            card_fields = {
                "company": "サンプル会社",
                "name": "田中太郎", 
                "title": "営業部長",
                "email": "example@company.com",
                "phone": "03-1234-5678",
                "address": "東京都渋谷区1-2-3",
                "website": "https://example.com"
            }
        
        # overridesパラメータでフィールドを上書き
        if overrides:
            try:
                override_data = json.loads(overrides)
                card_fields.update(override_data)
            except json.JSONDecodeError:
                pass
        
        mock_result = AnalysisResult(
            extracted_text="\n".join(card_fields.values()),
            card_fields=card_fields,
            logos=[],
            metadata={"source": "pdf" if file.content_type == "application/pdf" else "image", "confidence": 0.95}
        )
        
        return AnalysisResponse(
            mime_type=file.content_type,
            result=mock_result
        )
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"解析に失敗しました: {str(e)}")

@router.post("/pdf/export")
async def export_pdf(data: Dict[str, Any]):
    """
    PDFを生成してダウンロード
    """
    try:
        # モックPDF生成（実際の実装ではReportLabなどを使用）
        from io import BytesIO
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import mm
        
        buffer = BytesIO()
        p = canvas.Canvas(buffer, pagesize=(91*mm, 55*mm))
        
        # 名刺情報を描画
        result = data.get("result", {})
        card_fields = result.get("card_fields", {})
        
        p.setFont("Helvetica-Bold", 12)
        p.drawString(10*mm, 45*mm, card_fields.get("company", ""))
        
        p.setFont("Helvetica-Bold", 10)
        p.drawString(10*mm, 40*mm, card_fields.get("name", ""))
        
        p.setFont("Helvetica", 8)
        p.drawString(10*mm, 37*mm, card_fields.get("title", ""))
        p.drawString(10*mm, 34*mm, card_fields.get("email", ""))
        p.drawString(10*mm, 31*mm, card_fields.get("phone", ""))
        p.drawString(10*mm, 28*mm, card_fields.get("address", ""))
        p.drawString(10*mm, 25*mm, card_fields.get("website", ""))
        
        p.save()
        
        buffer.seek(0)
        return buffer.getvalue()
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"PDF出力に失敗しました: {str(e)}")
