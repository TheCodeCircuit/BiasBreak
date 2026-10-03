from fastapi import APIRouter, HTTPException

from app.schemas.response_models import (
    MitigationResponse,
    ComparisonSummary,
    MetricsBlock,
    DisparitySummary,
    GroupMetric,
    MitigateRequest,
)
from app.services.mitigation import apply_threshold_tuning, apply_feature_removal
from app.utils.run_store import save_mitigation_result

router = APIRouter(prefix="/mitigate", tags=["Mitigate"])


# ---------------------------------------------------------------------------
# Route
# ---------------------------------------------------------------------------

@router.post("/", response_model=MitigationResponse)
async def mitigate_bias(request: MitigateRequest):
    """
    Apply a bias mitigation strategy to a previously analysed dataset.

    Supported methods
    -----------------
    threshold_tuning
        Post-processing strategy: sweeps decision thresholds and picks the one
        that best reduces the selection-rate gap between groups while keeping
        overall accuracy within 5 pp of the baseline.

    feature_removal
        Pre-processing strategy: removes a specific feature (e.g. a proxy for
        a sensitive attribute), re-preprocesses the data, and retrains the model.
        Requires `feature_to_remove` in `params`.
    """

    # --- Basic validation ---
    if not request.analysis_id.strip():
        raise HTTPException(status_code=400, detail="Oops! We lost your analysis ID. Please go back and re-run the fairness analysis.")
    if not request.method.strip():
        raise HTTPException(status_code=400, detail="method cannot be empty.")

    supported_methods = ["threshold_tuning", "feature_removal"]
    if request.method not in supported_methods:
        raise HTTPException(
            status_code=400,
            detail=f"Oops! We don't support the mitigation method '{request.method}' yet. "
                   f"Try one of these: {supported_methods}",
        )

    if request.method == "feature_removal":
        if not request.params or "feature_to_remove" not in request.params:
            raise HTTPException(
                status_code=400,
                detail="feature_removal requires 'feature_to_remove' in params.",
            )

    # --- Run mitigation ---
    feature_removed = None
    try:
        if request.method == "threshold_tuning":
            result = apply_threshold_tuning(request.analysis_id)
        else:  # feature_removal
            feature_removed = request.params["feature_to_remove"]
            result = apply_feature_removal(request.analysis_id, feature_removed)

    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail="We couldn't find the original analysis. Please re-run the fairness analysis first.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except RuntimeError as e:
        raise HTTPException(status_code=500, detail=str(e))

    # --- Assemble before / after metrics blocks ---
    before_metrics = MetricsBlock(
        group_metrics=[GroupMetric(**g) for g in result["baseline_group_metrics"]],
        disparity_summaries=[DisparitySummary(**d) for d in result["baseline_disparity_summaries"]],
    )

    after_metrics = MetricsBlock(
        group_metrics=[GroupMetric(**g) for g in result["after_group_metrics"]],
        disparity_summaries=[DisparitySummary(**d) for d in result["after_disparity_summaries"]],
    )

    response = MitigationResponse(
        status="success",
        strategy_used=request.method,
        chosen_threshold=result["chosen_threshold"],
        baseline_accuracy=result["baseline_accuracy"],
        after_accuracy=result["after_accuracy"],
        comparison=ComparisonSummary(
            before_mitigation=before_metrics,
            after_mitigation=after_metrics,
            accuracy_change=result["impact"]["accuracy_change"],
            selection_rate_gap_change=result["impact"]["selection_rate_gap_change"],
            false_positive_rate_gap_change=result["impact"]["false_positive_rate_gap_change"],
            false_negative_rate_gap_change=result["impact"]["false_negative_rate_gap_change"],
            improved=result["impact"]["improved"],
        ),
    )

    # --- Persist the mitigation result locally ---
    save_mitigation_result(
        analysis_id=request.analysis_id,
        method=request.method,
        response_dict=response.model_dump(),
        feature_removed=feature_removed,
    )

    return response
