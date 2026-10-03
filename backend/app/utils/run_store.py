"""
run_store.py
------------
Minimal helper to persist analysis run data to the local filesystem.

Layout (per run):
    backend/tmp_runs/{analysis_id}/
        meta.json           – analysis_id, timestamp, column selections
        dataset.json        – preprocessing summary (row counts, distributions)
        metrics.json        – baseline fairness metrics, accuracy, risk flags
        predictions.json    – y_test, y_pred, y_prob, sensitive_test (test-split arrays)
        dataset.csv         – raw uploaded CSV bytes, verbatim

No DB, no ORM.  Designed for hackathon / demo use.
"""

import json
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd

# Resolve to  backend/tmp_runs/  regardless of where uvicorn is invoked from
_BACKEND_DIR = Path(__file__).resolve().parent.parent.parent  # …/backend
RUNS_ROOT = _BACKEND_DIR / "tmp_runs"


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def save_run(
    analysis_id: str,
    target_column: str,
    sensitive_column: str,
    feature_columns: List[str],
    dataset_summary: Dict[str, Any],
    baseline_metrics: Dict[str, Any],
    raw_csv: Optional[bytes] = None,
    predictions: Optional[Dict[str, Any]] = None,
) -> Path:
    """
    Persist all data needed for a future /mitigate call.

    Parameters
    ----------
    analysis_id     : UUID string from the /analyze response
    target_column   : name of the target column
    sensitive_column: name of the sensitive attribute column
    feature_columns : list of feature column names
    dataset_summary : dict returned by preprocess_dataset (row counts etc.)
    baseline_metrics: accuracy + fairness metrics dict
    raw_csv         : original uploaded file bytes  → saved as dataset.csv
    predictions     : dict with keys y_test, y_pred, y_prob, sensitive_test
                      (numpy arrays or plain lists) → saved as predictions.json

    Returns the run directory Path.
    Silently swallows write errors so a storage failure never breaks the API.
    """
    run_dir = RUNS_ROOT / analysis_id
    try:
        run_dir.mkdir(parents=True, exist_ok=True)

        # --- meta.json ---------------------------------------------------
        _write_json(run_dir / "meta.json", {
            "analysis_id": analysis_id,
            "saved_at": datetime.now(timezone.utc).isoformat(),
            "target_column": target_column,
            "sensitive_column": sensitive_column,
            "feature_columns": feature_columns,
        })

        # --- dataset.json ------------------------------------------------
        _write_json(run_dir / "dataset.json", dataset_summary)

        # --- metrics.json ------------------------------------------------
        _write_json(run_dir / "metrics.json", baseline_metrics)

        # --- dataset.csv  ------------------------------------------------
        if raw_csv is not None:
            (run_dir / "dataset.csv").write_bytes(raw_csv)

        # --- predictions.json --------------------------------------------
        if predictions is not None:
            _write_json(run_dir / "predictions.json", {
                k: _to_list(v) for k, v in predictions.items()
            })

    except Exception as exc:          # pragma: no cover – best-effort only
        print(f"[run_store] WARNING: could not save run {analysis_id}: {exc}")

    return run_dir


def save_mitigation_result(
    analysis_id: str, 
    method: str, 
    response_dict: Dict[str, Any], 
    feature_removed: Optional[str] = None
) -> None:
    """
    Persist the JSON result of a mitigation run under the existing analysis directory.
    Uses a readable filename based on the method used.
    """
    run_dir = RUNS_ROOT / analysis_id
    if not run_dir.exists():
        print(f"[run_store] WARNING: Cannot save mitigation, run {analysis_id} not found.")
        return

    # Construct a readable filename
    if method == "feature_removal" and feature_removed:
        # e.g., mitigation_feature_removal_college_tier.json
        # Clean the feature name just in case it has weird characters
        clean_feature = "".join(c for c in feature_removed if c.isalnum() or c in ('_', '-')).lower()
        filename = f"mitigation_{method}_{clean_feature}.json"
    else:
        # e.g., mitigation_threshold_tuning.json
        filename = f"mitigation_{method}.json"

    try:
        _write_json(run_dir / filename, response_dict)
    except Exception as exc:          # pragma: no cover
        print(f"[run_store] WARNING: could not save mitigation result for {analysis_id}: {exc}")


def load_run(analysis_id: str) -> Optional[Dict[str, Any]]:
    """
    Load all saved metadata and results for a run by its ID.

    Returns a dict with keys:
        meta        – column selections, timestamp
        dataset     – preprocessing summary
        metrics     – baseline fairness metrics
        predictions – y_test / y_pred / y_prob / sensitive_test  (or None)

    Returns None if the run directory does not exist.
    The raw CSV is NOT loaded into memory here; use load_run_csv() for that.
    """
    run_dir = RUNS_ROOT / analysis_id
    if not run_dir.is_dir():
        return None

    try:
        result: Dict[str, Any] = {
            "meta":        _read_json(run_dir / "meta.json"),
            "dataset":     _read_json(run_dir / "dataset.json"),
            "metrics":     _read_json(run_dir / "metrics.json"),
            "predictions": None,
        }
        pred_path = run_dir / "predictions.json"
        if pred_path.exists():
            result["predictions"] = _read_json(pred_path)
        return result
    except Exception as exc:          # pragma: no cover
        print(f"[run_store] WARNING: could not load run {analysis_id}: {exc}")
        return None


def run_exists(analysis_id: str) -> bool:
    """Quick check – does a saved run exist for this ID?"""
    return (RUNS_ROOT / analysis_id / "meta.json").exists()


def load_analysis_for_mitigation(analysis_id: str) -> Dict[str, Any]:
    """
    Load everything the /mitigate route needs for a given analysis_id.

    Raises
    ------
    FileNotFoundError
        If no run with that ID exists locally.
    RuntimeError
        If the saved files are corrupted / unreadable.

    Returns
    -------
    A flat plain-Python dict with keys:

        analysis_id      str          – echoed back for convenience
        target_column    str          – e.g. "hired"
        sensitive_column str          – e.g. "gender"
        feature_columns  list[str]    – e.g. ["age", "score"]
        dataset_summary  dict         – row counts, distributions, etc.
        baseline_metrics dict         – accuracy, group_metrics, risk_flags, …
        baseline_df      pd.DataFrame – raw CSV as a DataFrame (for re-preprocessing)
        predictions      dict | None  – y_test, y_pred, y_prob, sensitive_test
                                        (plain Python lists, None if not saved)
    """
    run_dir = RUNS_ROOT / analysis_id

    if not run_dir.is_dir():
        raise FileNotFoundError(
            f"No saved analysis found for id='{analysis_id}'. "
            "Run /analyze first to generate and store an analysis."
        )

    try:
        meta    = _read_json(run_dir / "meta.json")
        dataset = _read_json(run_dir / "dataset.json")
        metrics = _read_json(run_dir / "metrics.json")
    except Exception as exc:
        raise RuntimeError(
            f"Saved run '{analysis_id}' exists but could not be read: {exc}"
        ) from exc

    # Predictions are optional (older runs may not have them)
    predictions: Optional[Dict[str, Any]] = None
    pred_path = run_dir / "predictions.json"
    if pred_path.exists():
        try:
            predictions = _read_json(pred_path)
        except Exception:
            predictions = None   # degrade gracefully; caller checks for None

    # Raw CSV as a DataFrame — required for re-preprocessing
    csv_path = run_dir / "dataset.csv"
    if not csv_path.exists():
        raise FileNotFoundError(
            f"Raw dataset CSV not found for analysis_id='{analysis_id}'. "
            "This run was saved before CSV persistence was added; "
            "please re-run /analyze to regenerate."
        )
    try:
        baseline_df = pd.read_csv(csv_path)
    except Exception as exc:
        raise RuntimeError(
            f"Could not parse saved CSV for analysis_id='{analysis_id}': {exc}"
        ) from exc

    return {
        "analysis_id":      analysis_id,
        "target_column":    meta["target_column"],
        "sensitive_column": meta["sensitive_column"],
        "feature_columns":  meta["feature_columns"],
        "dataset_summary":  dataset,
        "baseline_metrics": metrics,
        "baseline_df":      baseline_df,
        "predictions":      predictions,
    }


# ---------------------------------------------------------------------------
# Internal helpers
# ---------------------------------------------------------------------------

def _to_list(value: Any) -> Any:
    """Convert numpy arrays / pandas Series to plain Python lists for JSON."""
    if isinstance(value, (np.ndarray,)):
        return value.tolist()
    if isinstance(value, pd.Series):
        return value.tolist()
    return value


def _write_json(path: Path, data: Any) -> None:
    with open(path, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2, default=str)


def _read_json(path: Path) -> Any:
    with open(path, "r", encoding="utf-8") as fh:
        return json.load(fh)
