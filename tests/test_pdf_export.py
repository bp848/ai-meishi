from app.models import AnalysisResult, CardFields, PDFExportRequest
from app.services.pdf_export import PDFExportService


def test_pdf_export_generates_pdf_bytes():
    service = PDFExportService()
    req = PDFExportRequest(
        result=AnalysisResult(
            extracted_text="x",
            card_fields=CardFields(name="John"),
            logos=[],
            metadata={
                "background_color": "#FFFFFF",
                "layout_elements": [
                    {
                        "key": "name",
                        "text": "John",
                        "x": 10,
                        "y": 10,
                        "width": 30,
                        "height": 5,
                        "style": {
                            "color": "#000000",
                            "size": 10,
                            "weight": "bold",
                            "family": "sans",
                        },
                    }
                ],
            },
        ),
        field_overrides={"name": "Jane"},
    )

    output = service.export(req)

    assert output.startswith(b"%PDF")
