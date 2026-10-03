"""
constants.py
------------
Central configuration and magic numbers for the BiasBreak backend.
By extracting these from the service logic, we keep the code readable
and make it easy to tweak the fairness thresholds or model parameters.
"""
import os

# --- Fairness Thresholds ---

# 0.20 comes from the EEOC 80% (four-fifths) rule for disparate impact.
# A gap larger than this between demographic groups is flagged as biased.
SELECTION_RATE_GAP_THRESHOLD = 0.20

# 10 percentage point tolerance for Equalized Odds (error rates).
FPR_GAP_THRESHOLD = 0.10
FNR_GAP_THRESHOLD = 0.10

# Rule of thumb for statistical significance. Groups smaller than this trigger a warning.
MIN_GROUP_SAMPLE_SIZE = 30


# --- Mitigation (Threshold Tuning) ---

# The maximum percentage points of accuracy we are willing to sacrifice
# in order to improve fairness during threshold tuning.
MAX_ACCURACY_DROP = 0.05

# The range of decision thresholds we sweep when looking for the fairest outcome.
THRESHOLD_SWEEP_RANGE = [0.30, 0.35, 0.40, 0.45, 0.50, 0.55, 0.60, 0.65, 0.70]


# --- Third Party / AI Services ---

# Gemini model used for the final plain-English report generation.
# Can be overridden via environment variables if the model changes.
GEMINI_MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-1.5-flash")
