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
async def analyze_file(file: UploadFile = File(...)):
    """
    名刺画像を解析してテキスト情報を抽出
    """
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=415, detail="対応していないファイル形式です")
    
    try:
        # ファイルを読み込み
        contents = await file.read()
        
        # モック解析結果（実際の実装ではOpenAI APIなどを呼び出す）
        mock_result = AnalysisResult(
            extracted_text="サンプル会社名\n田中太郎\n営業部長\nexample@company.com\n03-1234-5678\n東京都渋谷区1-2-3\nhttps://example.com",
            card_fields={
                "company": "サンプル会社",
                "name": "田中太郎", 
                "title": "営業部長",
                "email": "example@company.com",
                "phone": "03-1234-5678",
                "address": "東京都渋谷区1-2-3",
                "website": "https://example.com"
            },
            logos=[],
            metadata={"confidence": 0.95}
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
