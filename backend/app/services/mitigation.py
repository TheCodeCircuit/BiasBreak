"""
mitigation.py
-------------
Bias mitigation strategies for BiasBreak.

Currently implements:
    apply_threshold_tuning(analysis_id)
        Post-processing strategy: sweep a range of decision thresholds,
        pick the one that gives the best fairness without hurting accuracy
        too much, then return a structured before/after comparison dict.
        
    apply_feature_removal(analysis_id, feature_to_remove)
        Pre-processing strategy: remove a specific feature (like a proxy for
        a sensitive attribute), re-preprocess the data, retrain the model,
        and return the new metrics.
"""

import numpy as np
import pandas as pd
from typing import Any, Dict, List

from app.utils.run_store import load_analysis_for_mitigation
from app.services.fairness_metrics import (
    compute_group_metrics,
    compute_disparities,
    analyze_fairness,
)
from app.services.preprocessing import preprocess_dataset
from app.services.model import train_and_evaluate_model
from app.core.constants import MAX_ACCURACY_DROP, THRESHOLD_SWEEP_RANGE


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def compute_mitigation_impact(
    baseline_accuracy: float,
    after_accuracy: float,
    baseline_disparities: List[Dict[str, Any]],
    after_disparities: List[Dict[str, Any]]
) -> Dict[str, Any]:
    """
    Computes the change in accuracy and fairness gaps.
    A negative gap change means the disparity got smaller (which is good).
    """
    def get_val(disparities, name):
        for d in disparities:
            if d["metric_name"] == name:
                return d["value"]
        return 0.0

    sr_gap_change = get_val(after_disparities, "Selection Rate Gap") - get_val(baseline_disparities, "Selection Rate Gap")
    fpr_gap_change = get_val(after_disparities, "False Positive Rate Gap") - get_val(baseline_disparities, "False Positive Rate Gap")
    fnr_gap_change = get_val(after_disparities, "False Negative Rate Gap") - get_val(baseline_disparities, "False Negative Rate Gap")
    
    accuracy_change = after_accuracy - baseline_accuracy
    
    # Simple rule: it improved if the primary fairness gap (Selection Rate) decreased
    improved = bool(sr_gap_change < 0)
    
    return {
        "accuracy_change": round(accuracy_change, 4),
        "selection_rate_gap_change": round(sr_gap_change, 4),
        "false_positive_rate_gap_change": round(fpr_gap_change, 4),
        "false_negative_rate_gap_change": round(fnr_gap_change, 4),
        "improved": improved
    }


# ---------------------------------------------------------------------------
# Public entry-point
# ---------------------------------------------------------------------------

def apply_threshold_tuning(analysis_id: str) -> Dict[str, Any]:
    """
    Load a saved analysis run and find the decision threshold that best
    reduces selection-rate disparity between demographic groups, while
    keeping overall accuracy close to the baseline.

    Parameters
    ----------
    analysis_id : str
        The UUID returned by a previous /analyze call.

    Returns
    -------
    A plain dict with keys:
        chosen_threshold      – float, the winning threshold
        baseline_accuracy     – float, accuracy from the original model
        after_accuracy        – float, accuracy with the chosen threshold
        sweep_results         – list of dicts, one per threshold tried
        baseline_group_metrics     – list[dict] from the saved run
        baseline_disparity_summaries – list[dict] from the saved run
        after_group_metrics        – list[dict] at the chosen threshold
        after_disparity_summaries  – list[dict] at the chosen threshold
        after_risk_flags           – list[dict] at the chosen threshold

    Raises
    ------
    FileNotFoundError  – if no run exists for this analysis_id
    RuntimeError       – if saved data is corrupted
    """
    # ------------------------------------------------------------------
    # 1. Load the saved analysis
    # ------------------------------------------------------------------
    run = load_analysis_for_mitigation(analysis_id)

    predictions    = run["predictions"]
    baseline_metrics = run["baseline_metrics"]

    if predictions is None:
        raise RuntimeError(
            "No prediction arrays found for this run. "
            "Please re-run /analyze to regenerate them."
        )

    # Convert saved lists back to numpy / pandas objects
    y_test         = np.array(predictions["y_test"])
    y_prob         = np.array(predictions["y_prob"])
    sensitive_test = pd.Series(predictions["sensitive_test"])

    baseline_accuracy = float(baseline_metrics["accuracy"])

    # ------------------------------------------------------------------
    # 2. Define the thresholds to try
    # ------------------------------------------------------------------
    thresholds = THRESHOLD_SWEEP_RANGE

    # ------------------------------------------------------------------
    # 3. Sweep every threshold and record fairness + accuracy
    # ------------------------------------------------------------------
    sweep_results: List[Dict[str, Any]] = []

    for threshold in thresholds:
        # Convert probabilities → binary predictions at this threshold
        y_pred_t = (y_prob >= threshold).astype(int)

        # Overall accuracy
        accuracy_t = float((y_pred_t == y_test).mean())

        # Group-level fairness metrics
        group_metrics_t = compute_group_metrics(
            pd.Series(y_test), y_pred_t, sensitive_test
        )
        disparities_t = compute_disparities(group_metrics_t)

        sweep_results.append({
            "threshold":           threshold,
            "accuracy":            round(accuracy_t, 4),
            "selection_rate_gap":  round(disparities_t.get("selection_rate_gap", 1.0), 4),
            "fpr_gap":             round(disparities_t.get("false_positive_rate_gap", 1.0), 4),
            "fnr_gap":             round(disparities_t.get("false_negative_rate_gap", 1.0), 4),
        })

    # ------------------------------------------------------------------
    # 4. Pick the best threshold
    #
    #   Rule: minimise selection_rate_gap SUBJECT TO:
    #       accuracy drop from baseline must be ≤ MAX_ACCURACY_DROP
    #
    #   If every threshold violates the accuracy guard, we relax and just
    #   take the one with the smallest selection_rate_gap overall.
    # ------------------------------------------------------------------
    eligible = [
        r for r in sweep_results
        if (baseline_accuracy - r["accuracy"]) <= MAX_ACCURACY_DROP
    ]

    # Fall back to all candidates if nothing survives the guard
    candidates = eligible if eligible else sweep_results

    best = min(candidates, key=lambda r: r["selection_rate_gap"])
    chosen_threshold = best["threshold"]

    # ------------------------------------------------------------------
    # 5. Compute full fairness metrics at the chosen threshold
    # ------------------------------------------------------------------
    y_pred_best = (y_prob >= chosen_threshold).astype(int)
    after_accuracy = float((y_pred_best == y_test).mean())

    after_fairness = analyze_fairness(
        pd.Series(y_test), y_pred_best, sensitive_test
    )

    # ------------------------------------------------------------------
    # 6. Return everything the route needs
    # ------------------------------------------------------------------
    impact = compute_mitigation_impact(
        baseline_accuracy, 
        after_accuracy, 
        baseline_metrics["disparity_summaries"], 
        after_fairness["disparity_summaries"]
    )
    
    return {
        # --- threshold info ---
        "chosen_threshold":  chosen_threshold,
        "baseline_accuracy": round(baseline_accuracy, 4),
        "after_accuracy":    round(after_accuracy, 4),
        "sweep_results":     sweep_results,

        # --- baseline (from the saved run, already formatted) ---
        "baseline_group_metrics":        baseline_metrics["group_metrics"],
        "baseline_disparity_summaries":  baseline_metrics["disparity_summaries"],

        # --- after mitigation ---
        "after_group_metrics":       after_fairness["group_metrics"],
        "after_disparity_summaries": after_fairness["disparity_summaries"],
        "after_risk_flags":          after_fairness["risk_flags"],
        
        # --- impact ---
        "impact": impact
    }


def apply_feature_removal(analysis_id: str, feature_to_remove: str) -> Dict[str, Any]:
    """
    Load a saved analysis run, remove a specific feature from the dataset,
    re-preprocess the data, retrain the model from scratch, and evaluate the
    new fairness metrics.

    Parameters
    ----------
    analysis_id : str
        The UUID returned by a previous /analyze call.
    feature_to_remove : str
        The name of the feature column to drop.

    Returns
    -------
    A dict matching the shape of apply_threshold_tuning, suitable for the route.
    """
    # 1. Load the saved analysis
    run = load_analysis_for_mitigation(analysis_id)
    baseline_metrics = run["baseline_metrics"]
    baseline_accuracy = float(baseline_metrics["accuracy"])
    
    # 2. Check if the feature exists in the original selection
    feature_columns = run["feature_columns"]
    if feature_to_remove not in feature_columns:
        raise ValueError(f"Feature '{feature_to_remove}' not found in original analysis features.")
        
    # 3. Create the new list of features
    new_features = [f for f in feature_columns if f != feature_to_remove]
    
    if not new_features:
        raise ValueError("Cannot remove the only feature from the dataset.")
        
    # 4. Re-run preprocessing with the updated feature list
    # Convert DataFrame back to CSV bytes to reuse existing preprocessing logic cleanly
    file_content = run["baseline_df"].to_csv(index=False).encode('utf-8')
    
    X, y, sensitive_series, _ = preprocess_dataset(
        file_content=file_content,
        target_column=run["target_column"],
        sensitive_column=run["sensitive_column"],
        feature_columns=new_features
    )
    
    # 5. Retrain the logistic regression model on the new data
    model_results = train_and_evaluate_model(X, y, sensitive_series)
    after_accuracy = float(model_results["accuracy"])
    
    # 6. Compute new fairness metrics
    after_fairness = analyze_fairness(
        pd.Series(model_results["y_test"]), 
        model_results["y_pred"], 
        pd.Series(model_results["sensitive_test"])
    )
    
    # 7. Return the data
    impact = compute_mitigation_impact(
        baseline_accuracy, 
        after_accuracy, 
        baseline_metrics["disparity_summaries"], 
        after_fairness["disparity_summaries"]
    )
    
    return {
        "chosen_threshold": None,  # Not applicable for feature removal
        "baseline_accuracy": round(baseline_accuracy, 4),
        "after_accuracy": round(after_accuracy, 4),
        "sweep_results": [],       # Not applicable
        "baseline_group_metrics": baseline_metrics["group_metrics"],
        "baseline_disparity_summaries": baseline_metrics["disparity_summaries"],
        "after_group_metrics": after_fairness["group_metrics"],
        "after_disparity_summaries": after_fairness["disparity_summaries"],
        "after_risk_flags": after_fairness["risk_flags"],
        "impact": impact
    }


