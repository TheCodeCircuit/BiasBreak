from pydantic import BaseModel
from typing import List, Optional

# ---------------------------------------------------------
# Shared / Common Models
# ---------------------------------------------------------

class GroupMetric(BaseModel):
    group_name: str
    pass_rate: float
    count: int
    false_positive_rate: float
    false_negative_rate: float

class DisparitySummary(BaseModel):
    metric_name: str
    value: float
    is_fair: bool

class DatasetSummary(BaseModel):
    total_records: int
    features_analyzed: List[str]
    sensitive_attribute: str

class ModelSummary(BaseModel):
    overall_accuracy: float
    model_type: str

    model_config = {'protected_namespaces': ()}

class RiskFlag(BaseModel):
    severity: str
    description: str

# ---------------------------------------------------------
# Models for /analyze Endpoint
# ---------------------------------------------------------

class AnalyzeResponse(BaseModel):
    status: str
    analysis_id: str
    dataset_summary: DatasetSummary
    model_summary: ModelSummary
    group_metrics: List[GroupMetric]
    disparity_summaries: List[DisparitySummary]
    risk_flags: List[RiskFlag]

    model_config = {'protected_namespaces': ()}

# ---------------------------------------------------------
# Models for /mitigate Endpoint
# ---------------------------------------------------------

class MetricsBlock(BaseModel):
    disparity_summaries: List[DisparitySummary]
    group_metrics: List[GroupMetric]

class ComparisonSummary(BaseModel):
    before_mitigation: MetricsBlock
    after_mitigation: MetricsBlock
    accuracy_change: Optional[float] = None
    selection_rate_gap_change: Optional[float] = None
    false_positive_rate_gap_change: Optional[float] = None
    false_negative_rate_gap_change: Optional[float] = None
    improved: Optional[bool] = None

class MitigationResponse(BaseModel):
    status: str
    strategy_used: str
    chosen_threshold: Optional[float] = None   # only set for threshold-tuning
    baseline_accuracy: Optional[float] = None
    after_accuracy: Optional[float] = None
    comparison: ComparisonSummary

# ---------------------------------------------------------
# Models for /report Endpoint
# ---------------------------------------------------------

class ReportContent(BaseModel):
    executive_summary: str
    detailed_findings: str
    recommendations: List[str]

class ReportResponse(BaseModel):
    status: str
    report: ReportContent

# ---------------------------------------------------------
# Request Models (centralised here to keep schemas consistent)
# ---------------------------------------------------------

class MitigateRequest(BaseModel):
    analysis_id: str
    method: str                     # "threshold_tuning" or "feature_removal"
    params: Optional[dict] = None   # Required for feature_removal: {"feature_to_remove": "col"}

class ReportRequest(BaseModel):
    analysis_id: str
    include_mitigation: bool = False
