import os
import json
from pathlib import Path

import google.generativeai as genai
from dotenv import load_dotenv

from app.utils.run_store import RUNS_ROOT, load_run
from app.core.constants import GEMINI_MODEL_NAME

# Load environment variables from a .env file if present
load_dotenv()


def assemble_report_input(analysis_id: str, include_mitigation: bool = True) -> dict:
    """
    Loads saved baseline analysis data and an optional mitigation result,
    building one clean structured dictionary containing only the facts needed
    for explanation (whether by rules or Gemini).
    """
    run_dir = RUNS_ROOT / analysis_id
    if not run_dir.exists():
        raise ValueError(f"Analysis ID {analysis_id} not found.")

    run_data = load_run(analysis_id)
    if not run_data:
        raise ValueError(f"Could not load data for Analysis ID {analysis_id}.")

    meta = run_data.get("meta", {})
    metrics = run_data.get("metrics", {})

    report_input = {
        "target_column": meta.get("target_column"),
        "sensitive_column": meta.get("sensitive_column"),
        "feature_columns": meta.get("feature_columns"),
        "baseline_accuracy": metrics.get("accuracy"),
        "baseline_group_metrics": metrics.get("group_metrics"),
        "baseline_disparity_summary": metrics.get("disparity_summaries"),
        "warnings": metrics.get("risk_flags"),
    }

    # Optionally load the most recent mitigation result if present
    mitigation_files = list(run_dir.glob("mitigation_*.json"))
    if include_mitigation and mitigation_files:
        latest_mitig_file = max(mitigation_files, key=lambda p: p.stat().st_mtime)
        with open(latest_mitig_file, "r", encoding="utf-8") as f:
            mitig_data = json.load(f)

        report_input["mitigation_method"] = mitig_data.get("strategy_used", "Unknown")
        report_input["after_accuracy"] = mitig_data.get("after_accuracy")
        report_input["comparison"] = mitig_data.get("comparison")

    return report_input


def generate_gemini_report(report_input: dict) -> dict:
    """
    Calls Gemini to generate a human-readable summary of the fairness audit.
    If the API key is missing or the call fails, this raises an exception
    so the caller can seamlessly fall back to the rule-based report.
    """
    api_key = os.environ.get("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in environment.")

    # Configure the Gemini client
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(GEMINI_MODEL_NAME)

    data_str = json.dumps(report_input, indent=2, default=str)

    prompt = f"""
You are an expert AI fairness auditor. Your job is to explain the following bias analysis metrics in simple, professional, frontend-friendly terms.

RULES:
1. DO NOT compute any new metrics.
2. DO NOT invent new numbers or hallucinate data.
3. DO NOT claim causes or external societal factors that are not strictly proven in the data.
4. Format your response EXACTLY as a JSON object with the following three keys:
   - "executive_summary": A short paragraph summarizing the analysis. Mention if mitigation was used.
   - "detailed_findings": A markdown-formatted string explaining the key findings, risk flags, and mitigation impact (if any).
   - "recommendations": A JSON array of actionable string recommendations (e.g. ["Action 1", "Action 2"]).

DATA TO EXPLAIN:
{data_str}

Return ONLY valid JSON.
"""
    try:
        response = model.generate_content(prompt)
        text = response.text.strip()

        # Clean up potential markdown formatting from the response
        if text.startswith("```json"):
            text = text[7:]
        elif text.startswith("```"):
            text = text[3:]

        if text.endswith("```"):
            text = text[:-3]

        gemini_dict = json.loads(text.strip())

        return {
            "executive_summary": gemini_dict.get("executive_summary", "Summary not generated."),
            "detailed_findings": gemini_dict.get("detailed_findings", "Findings not generated."),
            "recommendations": gemini_dict.get("recommendations", []),
        }

    except Exception as e:
        # Catch any failure (API down, rate limit, bad JSON parsing)
        # and raise so the caller knows to trigger the fallback.
        raise RuntimeError(f"Gemini generation failed: {e}")


def generate_fallback_report(report_input: dict) -> dict:
    """
    Generates a simple, rule-based report based on the assembled report_input.
    Returns a dictionary mapping directly to the ReportContent schema.
    """
    target = report_input.get("target_column", "Target")
    sensitive = report_input.get("sensitive_column", "Sensitive Attribute")
    acc = report_input.get("baseline_accuracy", 0.0)
    warnings = report_input.get("warnings", [])
    mitigation_method = report_input.get("mitigation_method")

    # 1. Title & Summary -> Executive Summary
    title = f"Bias Analysis Report: {target} by {sensitive}"

    if mitigation_method:
        summary = (
            f"This report evaluates the fairness of the baseline model and the impact of the '{mitigation_method}' "
            f"mitigation strategy. The baseline model achieved an accuracy of {acc:.1%}. After applying mitigation, "
            f"we observed a shift in performance and fairness metrics, detailed below."
        )
    else:
        summary = (
            f"This report evaluates the fairness of the baseline model predicting '{target}' across different groups "
            f"in '{sensitive}'. The baseline model achieved an accuracy of {acc:.1%}. "
            "No mitigation strategy has been applied yet."
        )

    executive_summary = f"### {title}\n\n{summary}"

    # 2. Detailed Findings (Key Findings, Mitigation Impact, Risk Flags, Limitations)
    detailed_findings_parts = []

    # Key Findings
    key_findings = "#### Key Findings\n"
    disparities = report_input.get("baseline_disparity_summary", [])
    if disparities:
        for disp in disparities:
            metric = disp.get("metric_name", "Metric")
            val = disp.get("value", 0)
            fair = "Fair" if disp.get("is_fair") else "Biased"
            key_findings += f"- **{metric}**: {val:.4f} ({fair})\n"
    else:
        key_findings += "- No disparity metrics available.\n"
    detailed_findings_parts.append(key_findings)

    # Before vs After (if mitigation exists)
    if mitigation_method:
        comp = report_input.get("comparison", {})
        after_acc = report_input.get("after_accuracy")
        improved = comp.get("improved")
        acc_change = comp.get("accuracy_change", 0.0)
        gap_change = comp.get("selection_rate_gap_change", 0.0)

        mitig_text = "#### Mitigation Impact\n"
        mitig_text += f"Using **{mitigation_method}**, the model's accuracy changed by {acc_change:+.1%} "
        if after_acc is not None:
            mitig_text += f"(new accuracy: {after_acc:.1%}). "

        mitig_text += f"\nThe fairness gap changed by {gap_change:+.4f}. "
        if improved is True:
            mitig_text += "Overall, fairness improved.\n"
        elif improved is False:
            mitig_text += "Overall, fairness did not improve.\n"

        detailed_findings_parts.append(mitig_text)

    # Risk Flags
    risk_text = "#### Risk Flags\n"
    if warnings:
        for w in warnings:
            # w might be a dict or an object depending on how it was loaded.
            # load_run returns plain dicts.
            severity = w.get("severity", "Warning").upper() if isinstance(w, dict) else getattr(w, "severity", "WARNING").upper()
            desc = w.get("description", "") if isinstance(w, dict) else getattr(w, "description", "")
            risk_text += f"- **[{severity}]**: {desc}\n"
    else:
        risk_text += "- No significant risks flagged.\n"
    detailed_findings_parts.append(risk_text)

    # Limitations
    limitations = (
        "#### Limitations\n"
        "This automated assessment relies solely on statistical metrics and the provided data. "
        "It does not consider external factors, historical context, or qualitative impacts."
    )
    detailed_findings_parts.append(limitations)

    detailed_findings = "\n\n".join(detailed_findings_parts)

    # 3. Recommendations
    recommendations = []
    if warnings:
        recommendations.append("Review the flagged risks to understand which groups are underperforming.")
        if not mitigation_method:
            recommendations.append("Consider running a mitigation strategy (like Threshold Tuning or Feature Removal) to reduce the identified disparities.")
    else:
        recommendations.append("Continue monitoring the model for fairness as new data is collected.")

    if mitigation_method and not report_input.get("comparison", {}).get("improved"):
        recommendations.append("The attempted mitigation did not improve fairness. Consider trying an alternative strategy.")
    elif mitigation_method:
        recommendations.append("Evaluate the trade-off between the accuracy change and the fairness improvement before deploying.")

    return {
        "executive_summary": executive_summary,
        "detailed_findings": detailed_findings,
        "recommendations": recommendations,
    }


def generate_final_report(analysis_id: str, include_mitigation: bool = True) -> dict:
    """
    Top-level orchestrator for generating the BiasBreak report.
    1. Assembles input data from the run store.
    2. Generates a guaranteed fallback report.
    3. Attempts to generate a Gemini report.
    4. If Gemini succeeds, returns it. If it fails, falls back safely.
    """
    # 1. Assemble structured report input
    report_input = assemble_report_input(analysis_id, include_mitigation)

    # 2. Always generate a fallback report first (so we have guaranteed content)
    final_report = generate_fallback_report(report_input)

    # 3. Try to get Gemini to generate a better explanation
    try:
        gemini_report = generate_gemini_report(report_input)

        # 4. If Gemini succeeded, replace the fallback content
        print(f"[Report] Successfully generated Gemini explanation for {analysis_id}")
        final_report = gemini_report

    except Exception as e:
        # 5. If Gemini fails (API key missing, timeout, bad JSON), log it
        #    and gracefully return the fallback report we already generated.
        print(f"[Report] Gemini generation failed, using rule-based fallback. Reason: {e}")

    return final_report
