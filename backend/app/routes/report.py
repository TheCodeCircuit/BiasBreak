from fastapi import APIRouter, HTTPException

from app.schemas.response_models import ReportResponse, ReportContent, ReportRequest
from app.services.gemini_report import generate_final_report
from app.utils.run_store import run_exists

router = APIRouter(prefix="/report", tags=["Report"])


@router.post("/", response_model=ReportResponse)
async def generate_report(request: ReportRequest):
    """
    Endpoint to generate a final report using Gemini based on analysis/mitigation results.
    """
    # 1. Validate input
    if not request.analysis_id.strip():
        raise HTTPException(status_code=400, detail="Oops! We lost your analysis ID. Please go back and re-run the fairness analysis.")

    # Check if the run even exists
    if not run_exists(request.analysis_id):
        raise HTTPException(status_code=404, detail="We couldn't find any results for this analysis. Please try running the fairness analysis again.")

    try:
        # 2. Call the top-level report generation service.
        # This service automatically handles building the input, attempting Gemini,
        # and gracefully falling back to a rule-based report if AI fails.
        report_dict = generate_final_report(
            analysis_id=request.analysis_id,
            include_mitigation=request.include_mitigation,
        )

        # 3. Format into strict Pydantic models to preserve frontend-friendly response shape
        report_content = ReportContent(
            executive_summary=report_dict.get("executive_summary", ""),
            detailed_findings=report_dict.get("detailed_findings", ""),
            recommendations=report_dict.get("recommendations", []),
        )

        return ReportResponse(status="success", report=report_content)

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An error occurred while generating the report: {str(e)}")
