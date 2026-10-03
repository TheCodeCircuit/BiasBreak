import uuid
import pandas as pd
import io
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from app.schemas.response_models import (
    AnalyzeResponse,
    DatasetSummary,
    ModelSummary,
    GroupMetric,
    DisparitySummary,
    RiskFlag
)

# Import our custom services
from app.utils.validators import (
    validate_target_column,
    validate_sensitive_column,
    validate_feature_columns,
    validate_binary_target,
    validate_no_sensitive_leakage,
)
from app.services.preprocessing import preprocess_dataset
from app.services.model import train_and_evaluate_model
from app.services.fairness_metrics import analyze_fairness
from app.utils.run_store import save_run

router = APIRouter(prefix="/analyze", tags=["Analyze"])

@router.post("/", response_model=AnalyzeResponse)
async def analyze_data(
    file: UploadFile = File(...),
    target_column: str = Form(...),
    sensitive_column: str = Form(...),
    feature_columns: str = Form(...)
):
    """
    Endpoint to receive a dataset, train a baseline model, and compute fairness metrics.
    """
    
    # 1. Light validation: Check file extension and required form fields
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV files are supported.")
        
    if not target_column or not sensitive_column or not feature_columns:
        raise HTTPException(status_code=400, detail="Target, sensitive, and feature columns must be provided.")

    features = [f.strip() for f in feature_columns.split(",") if f.strip()]
    
    try:
        # 2. Read file content into memory
        file_content = await file.read()
        
        # Load briefly into pandas just for our column validators to run
        df_raw = pd.read_csv(io.BytesIO(file_content))
        
        # 3. Validate Data (Raises ValueError if something is wrong)
        validate_target_column(df_raw, target_column)
        validate_sensitive_column(df_raw, sensitive_column)
        validate_feature_columns(df_raw, features)
        validate_binary_target(df_raw, target_column)
        validate_no_sensitive_leakage(sensitive_column, features)
        
        # 4. Preprocess Data
        X, y, sensitive_series, summary_data = preprocess_dataset(
            file_content=file_content,
            target_column=target_column,
            sensitive_column=sensitive_column,
            feature_columns=features
        )
        
        # 5. Train Model & Evaluate
        model_results = train_and_evaluate_model(X, y, sensitive_series)
        
        # 6. Compute Fairness Metrics
        fairness_results = analyze_fairness(
            y_true=model_results["y_test"],
            y_pred=model_results["y_pred"],
            sensitive_features=model_results["sensitive_test"]
        )
        
        # 7. Format the Response
        analysis_id = str(uuid.uuid4())
        
        dataset_summary = DatasetSummary(
            total_records=summary_data["total_rows"],
            features_analyzed=features,
            sensitive_attribute=sensitive_column
        )
        
        model_summary = ModelSummary(
            overall_accuracy=model_results["accuracy"],
            model_type="Logistic Regression (Baseline)"
        )
        
        # Convert raw dictionaries to Pydantic response models
        group_metrics = [GroupMetric(**g) for g in fairness_results["group_metrics"]]
        disparity_summaries = [DisparitySummary(**d) for d in fairness_results["disparity_summaries"]]
        risk_flags = [RiskFlag(**r) for r in fairness_results["risk_flags"]]
        
        response = AnalyzeResponse(
            status="success",
            analysis_id=analysis_id,
            dataset_summary=dataset_summary,
            model_summary=model_summary,
            group_metrics=group_metrics,
            disparity_summaries=disparity_summaries,
            risk_flags=risk_flags
        )

        # --- Persist run metadata (best-effort, never breaks the API) ---
        save_run(
            analysis_id=analysis_id,
            target_column=target_column,
            sensitive_column=sensitive_column,
            feature_columns=features,
            dataset_summary=summary_data,
            baseline_metrics={
                "accuracy":            model_results["accuracy"],
                "group_metrics":       fairness_results["group_metrics"],
                "disparity_summaries": fairness_results["disparity_summaries"],
                "risk_flags":          fairness_results["risk_flags"],
            },
            # Raw CSV → lets /mitigate re-preprocess with any algorithm
            raw_csv=file_content,
            # Test-split arrays → lets /mitigate compute deltas vs baseline
            predictions={
                "y_test":         model_results["y_test"],
                "y_pred":         model_results["y_pred"],
                "y_prob":         model_results["y_prob"],
                "sensitive_test": model_results["sensitive_test"],
            },
        )

        return response
        
    except ValueError as e:
        # Catch our custom validation errors (like missing columns) and tell the user
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        # Catch unexpected crashes
        raise HTTPException(status_code=500, detail=f"An error occurred during analysis: {str(e)}")
