// MitigationPanel.jsx
import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { runMitigation } from "../api/BreakBiasApi";
import { getSelectionRateGap, riskLevel, RISK } from "../utils/fairness";
import { CheckIcon, LightningIcon, ResetIcon, Spinner, ToolIcon } from "./Icons";

const METHODS = {
  threshold_tuning: {
    label: "Threshold tuning",
    help: "Adjusts decision thresholds to narrow the gap between groups.",
  },
  feature_removal: {
    label: "Feature removal",
    help: "Retrains the model without one feature, e.g. a proxy for the sensitive attribute.",
  },
};

const round1 = (n) => Number(n.toFixed(1));

function GapGauge({ value, tone }) {
  const size = 94;
  const stroke = 9;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const fraction = Math.min(Math.max(value / 100, 0), 1);

  const toneClass = {
    success: "text-emerald-600",
    warning: "text-amber-600",
    danger: "text-rose-600",
    neutral: "text-slate-400",
  }[tone];

  return (
    <div className="relative flex h-[94px] w-[94px] shrink-0 items-center justify-center">
      <svg className="-rotate-90" width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#e9eff8" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={stroke}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - fraction)}
          strokeLinecap="round"
          className={toneClass}
          style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16, 1, 0.3, 1)" }}
        />
      </svg>
      <div className="absolute text-center">
        <p className={`font-mono text-lg font-extrabold leading-none tracking-[-0.06em] ${toneClass}`}>{value}%</p>
      </div>
    </div>
  );
}

const Placeholder = () => (
  <div className="flex h-[94px] w-[94px] items-center justify-center rounded-full border border-dashed border-slate-300 bg-white text-slate-400">
    <span className="font-mono text-2xl font-extrabold">—</span>
  </div>
);

const toneFor = (gap) => RISK[riskLevel(gap)].tone;

// baselineGap: percentage points from the /analyze/ response (null if the API didn't send one)
export default function MitigationPanel({ analysisId, featuresAnalyzed = [], baselineGap = null }) {
  const [method, setMethod] = useState("threshold_tuning");
  // The sensitive column is NOT a model feature, so it must never be the default "feature to remove".
  const [feature, setFeature] = useState(featuresAnalyzed[0] ?? "");
  const [result, setResult] = useState(null); // { before, after } in percentage points
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const before = result?.before ?? baselineGap;
  const after = result?.after ?? null;
  const improvement = before != null && after != null ? round1(before - after) : null;
  const improvementPct = improvement != null && before > 0 ? Math.round((improvement / before) * 100) : 0;

  const apply = async () => {
    if (!analysisId) {
      setError("Missing analysis id. Go back and run the analysis again.");
      return;
    }
    if (method === "feature_removal" && !feature) {
      setError("Pick a feature to remove.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await runMitigation({ analysisId, method, featureToRemove: feature });
      const afterGap = getSelectionRateGap(data?.comparison?.after_mitigation?.disparity_summaries);
      // The old code fell back to "0.0" here, i.e. it reported a PERFECT result when the API sent nothing.
      if (afterGap == null) throw new Error('The API response had no "Selection Rate Gap" for the mitigated model.');
      const beforeGap = getSelectionRateGap(data?.comparison?.before_mitigation?.disparity_summaries);
      setResult({ before: round1(beforeGap ?? baselineGap ?? 0), after: round1(afterGap) });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
  };

  return (
    <div className="card card-glow overflow-hidden">
      <div className="card-header">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-indigo-100 bg-indigo-50 text-indigo-700">
              <ToolIcon />
            </div>
            <div>
              <div className="section-eyebrow">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-glow" />
                Remediation
              </div>
              <h3 className="mt-3 text-xl font-extrabold tracking-[-0.045em] text-slate-950">Mitigation</h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                Retrain with a mitigation applied and compare the selection-rate gap before and after.
              </p>
            </div>
          </div>

          {result && (
            <button type="button" onClick={reset} className="btn btn-secondary shrink-0">
              <ResetIcon />
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="card-body space-y-5">
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1 2xl:grid-cols-2">
          <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5 text-center">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Before</p>
            <div className="mt-4 flex justify-center">
              {before != null ? <GapGauge value={before} tone={toneFor(before)} /> : <Placeholder />}
            </div>
            <p className="mt-3 text-sm font-bold text-slate-500">Selection-rate gap</p>
          </div>

          <div
            className={`rounded-3xl border p-5 text-center transition ${
              after != null ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50"
            }`}
          >
            <p className={`text-xs font-extrabold uppercase tracking-wider ${after != null ? "text-emerald-700" : "text-slate-400"}`}>
              After
            </p>
            <div className="mt-4 flex justify-center">
              <AnimatePresence mode="wait">
                <motion.div
                  key={after != null ? "after" : "empty"}
                  initial={{ opacity: 0, scale: 0.86 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.86 }}
                >
                  {after != null ? <GapGauge value={after} tone={toneFor(after)} /> : <Placeholder />}
                </motion.div>
              </AnimatePresence>
            </div>
            <p className={`mt-3 text-sm font-bold ${after != null ? "text-emerald-700" : "text-slate-500"}`}>
              {after != null ? "Gap after mitigation" : "Apply a method first"}
            </p>
          </div>
        </div>

        <AnimatePresence>
          {improvement != null && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 12 }}
              className={`rounded-2xl border p-4 ${improvement > 0 ? "border-emerald-100 bg-emerald-50" : "border-slate-200 bg-slate-50"}`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${
                    improvement > 0 ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}
                >
                  <CheckIcon className="h-4 w-4" />
                </div>
                <div>
                  <p className={`text-sm font-extrabold ${improvement > 0 ? "text-emerald-700" : "text-slate-600"}`}>
                    {improvement > 0 ? `${improvement} percentage-point reduction` : "No measurable improvement"}
                  </p>
                  <p className="mt-1 text-sm leading-6 text-slate-600">
                    {improvement > 0
                      ? `Gap went from ${before}% to ${after}% (${improvementPct}% smaller).`
                      : `Gap went from ${before}% to ${after}%. This method did not narrow it; try the other one.`}
                  </p>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {error && (
          <div className="rounded-2xl border border-rose-100 bg-rose-50 p-4">
            <p className="text-sm font-bold text-rose-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="label" htmlFor="mitigation-method">Method</label>
            <select
              id="mitigation-method"
              className="input"
              value={method}
              onChange={(e) => setMethod(e.target.value)}
              disabled={loading}
            >
              {Object.entries(METHODS).map(([value, m]) => (
                <option key={value} value={value}>{m.label}</option>
              ))}
            </select>
            <p className="helper-text">{METHODS[method].help}</p>
          </div>

          {method === "feature_removal" && (
            <div>
              <label className="label" htmlFor="mitigation-feature">Feature to remove</label>
              <select
                id="mitigation-feature"
                className="input"
                value={feature}
                onChange={(e) => setFeature(e.target.value)}
                disabled={loading || featuresAnalyzed.length === 0}
              >
                {featuresAnalyzed.length === 0 ? (
                  <option value="">No features reported by the API</option>
                ) : (
                  featuresAnalyzed.map((f) => <option key={f} value={f}>{f}</option>)
                )}
              </select>
            </div>
          )}

          <button
            type="button"
            onClick={apply}
            disabled={loading}
            className="btn btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? (
              <>
                <Spinner />
                Retraining…
              </>
            ) : (
              <>
                <LightningIcon />
                {result ? "Apply again" : "Apply mitigation"}
              </>
            )}
          </button>
        </div>
      </div>

      <div className="card-footer flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <span className="text-sm font-semibold text-slate-500">Your original file is not modified</span>
        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1.5 font-mono text-xs font-extrabold text-indigo-700">
          {METHODS[method].label}
        </span>
      </div>
    </div>
  );
}
