import pandas as pd
import numpy as np
from typing import Dict, Any, List

from app.core.constants import (
    SELECTION_RATE_GAP_THRESHOLD,
    FPR_GAP_THRESHOLD,
    FNR_GAP_THRESHOLD,
    MIN_GROUP_SAMPLE_SIZE
)

def compute_group_metrics(y_true: pd.Series, y_pred: np.ndarray, sensitive_features: pd.Series) -> List[Dict[str, Any]]:
    """
    Computes fairness metrics for each demographic group.
    """
    df = pd.DataFrame({
        'y_true': y_true.values,
        'y_pred': y_pred,
        'group': sensitive_features.values
    })
    
    group_metrics = []
    
    for group_name, group_data in df.groupby('group'):
        count = len(group_data)
        
        # Selection Rate: % of group predicted as positive (1)
        # Safe divide by zero using 'if count > 0'
        selection_rate = group_data['y_pred'].mean() if count > 0 else 0.0
        
        # False Positive Rate (FPR): Predicted 1, but actually 0 / Total actual 0
        actual_negatives = group_data[group_data['y_true'] == 0]
        if len(actual_negatives) > 0:
            fpr = actual_negatives['y_pred'].mean()
        else:
            fpr = 0.0
            
        # False Negative Rate (FNR): Predicted 0, but actually 1 / Total actual 1
        actual_positives = group_data[group_data['y_true'] == 1]
        if len(actual_positives) > 0:
            # FNR is proportion of actual positives predicted as 0
            fnr = 1.0 - actual_positives['y_pred'].mean()
        else:
            fnr = 0.0
            
        group_metrics.append({
            "group_name": str(group_name),
            "pass_rate": float(selection_rate),  # Matches 'pass_rate' in GroupMetric response model
            "count": count,
            "false_positive_rate": float(fpr),
            "false_negative_rate": float(fnr)
        })
        
    return group_metrics

def compute_disparities(group_metrics: List[Dict[str, Any]]) -> Dict[str, Any]:
    """
    Computes overall disparities across all groups.
    Calculates the gap (max - min) for each metric.
    """
    if not group_metrics:
        return {}
        
    selection_rates = [g['pass_rate'] for g in group_metrics]
    fprs = [g['false_positive_rate'] for g in group_metrics]
    fnrs = [g['false_negative_rate'] for g in group_metrics]
    groups = [g['group_name'] for g in group_metrics]
    
    sr_max, sr_min = max(selection_rates), min(selection_rates)
    sr_min_idx = selection_rates.index(sr_min)
    
    return {
        "selection_rate_gap": sr_max - sr_min,
        "false_positive_rate_gap": max(fprs) - min(fprs),
        "false_negative_rate_gap": max(fnrs) - min(fnrs),
        "most_affected_group": groups[sr_min_idx]
    }

def generate_risk_flags(group_metrics: List[Dict[str, Any]], disparities: Dict[str, Any]) -> List[Dict[str, str]]:
    """
    Generates warnings for small groups or large disparities.
    """
    flags = []
    
    # Check for large disparate impact
    if disparities.get("selection_rate_gap", 0) >= SELECTION_RATE_GAP_THRESHOLD:
        flags.append({
            "severity": "High",
            "description": f"Significant disparity in selection rates ({disparities['selection_rate_gap']:.2f} gap). "
                           f"Group '{disparities['most_affected_group']}' is disproportionately rejected."
        })
        
    # Check for small sample sizes
    for group in group_metrics:
        if group["count"] < MIN_GROUP_SAMPLE_SIZE:
            flags.append({
                "severity": "Warning",
                "description": f"Group '{group['group_name']}' has a very small test sample size ({group['count']}). "
                               "Metrics for this group may be unreliable."
            })
            
    return flags

def analyze_fairness(y_true: pd.Series, y_pred: np.ndarray, sensitive_features: pd.Series) -> Dict[str, Any]:
    """
    Main function to compute all fairness metrics and format them for the API response.
    """
    group_metrics = compute_group_metrics(y_true, y_pred, sensitive_features)
    disparities = compute_disparities(group_metrics)
    risk_flags = generate_risk_flags(group_metrics, disparities)
    
    # Format into the exact structure expected by the API response models
    disparity_summaries = [
        {
            "metric_name": "Selection Rate Gap",
            "value": float(disparities.get("selection_rate_gap", 0.0)),
            "is_fair": bool(disparities.get("selection_rate_gap", 0.0) < SELECTION_RATE_GAP_THRESHOLD)
        },
        {
            "metric_name": "False Positive Rate Gap",
            "value": float(disparities.get("false_positive_rate_gap", 0.0)),
            "is_fair": bool(disparities.get("false_positive_rate_gap", 0.0) < FPR_GAP_THRESHOLD)
        },
        {
            "metric_name": "False Negative Rate Gap",
            "value": float(disparities.get("false_negative_rate_gap", 0.0)),
            "is_fair": bool(disparities.get("false_negative_rate_gap", 0.0) < FNR_GAP_THRESHOLD)
        }
    ]
    
    return {
        "group_metrics": group_metrics,
        "disparity_summaries": disparity_summaries,
        "risk_flags": risk_flags
    }
