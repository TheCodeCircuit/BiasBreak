// One implementation of "what counts as selected", group stats, risk and the 4/5ths rule.
// Before this file existed there were FOUR copies of isPositiveDecision (each with a different
// accepted-values list) plus three `== 1` checks, so the same dataset produced different numbers
// on different cards.

import { processRows } from "./dataProcessor";

export const LOW_SAMPLE = 30;

const POSITIVE = new Set([
  "yes", "y", "true", "selected", "select", "accepted", "accept", "approved",
  "approve", "hired", "hire", "pass", "passed", "positive", "success", "successful",
]);

export function isPositiveDecision(value) {
  if (value === true) return true;
  const s = String(value ?? "").trim().toLowerCase();
  if (s === "") return false;
  const n = Number(s);
  if (!Number.isNaN(n)) return n === 1; // "1", "1.0", " 1 " all count; "0" does not
  return POSITIVE.has(s);
}

export function countOutcomes(rows = [], target) {
  let selected = 0;
  for (const row of rows) if (isPositiveDecision(row?.[target])) selected++;
  const total = rows.length;
  return {
    total,
    selected,
    rejected: total - selected,
    selectionRate: total ? (selected / total) * 100 : 0,
  };
}

export const RISK = {
  low: {
    level: "low",
    label: "Low risk",
    short: "No major disparity detected",
    description: "Group outcome rates look balanced under this simple disparity check.",
    badge: "badge-success",
    text: "text-emerald-700",
    panel: "bg-emerald-50 border-emerald-100",
    bar: "bg-emerald-500",
    tone: "success",
  },
  moderate: {
    level: "moderate",
    label: "Moderate risk",
    short: "Investigate before deployment",
    description: "Some group outcome differences are large enough to need review and an explanation.",
    badge: "badge-warning",
    text: "text-amber-700",
    panel: "bg-amber-50 border-amber-100",
    bar: "bg-amber-500",
    tone: "warning",
  },
  high: {
    level: "high",
    label: "High risk",
    short: "Critical disparity detected",
    description: "One or more groups differ strongly in positive-outcome rate. Review before any use.",
    badge: "badge-danger",
    text: "text-rose-700",
    panel: "bg-rose-50 border-rose-100",
    bar: "bg-rose-500",
    tone: "danger",
  },
};

// Gap is in percentage points. If the 4/5ths rule fails, the label can't say "low":
// previously the same card could show "Low bias risk" next to "4/5ths rule: Failed".
export function riskLevel(gap, fourFifthsFailed = false) {
  let level = gap >= 30 ? "high" : gap >= 15 ? "moderate" : "low";
  if (fourFifthsFailed && level === "low") level = "moderate";
  return level;
}

const round1 = (n) => Number(n.toFixed(1));

function finalize({ entries, source, fallbackOverall, gapOverride }) {
  const sorted = [...entries].sort((a, b) => b.rate - a.rate);
  const maxRate = sorted.length ? sorted[0].rate : 0;
  const minRate = sorted.length ? sorted[sorted.length - 1].rate : 0;
  const spread = sorted.length > 1 ? (maxRate - minRate) * 100 : 0;
  const gap = round1(gapOverride ?? spread);

  const fourFifthsFailed =
    maxRate > 0 && sorted.some((e) => e.rate < maxRate && e.rate / maxRate < 0.8);

  const hasCounts = sorted.length > 0 && sorted.every((e) => e.total != null && e.total > 0);
  const n = hasCounts ? sorted.reduce((s, e) => s + e.total, 0) : 0;
  const overall = hasCounts
    ? (sorted.reduce((s, e) => s + e.rate * e.total, 0) / n) * 100
    : fallbackOverall;

  return {
    source, // "backend" | "dataset"
    entries: sorted, // [{ group, rate (0..1), total|null, selected|null }]
    gap,
    overall: round1(overall),
    maxRate: round1(maxRate * 100),
    minRate: round1(minRate * 100),
    fourFifthsFailed,
    risk: riskLevel(gap, fourFifthsFailed),
    lowSampleGroups: sorted.filter((e) => e.total != null && e.total < LOW_SAMPLE).map((e) => e.group),
  };
}

export function computeGroupStats(rows = [], target, sensitive) {
  const prepared = processRows(rows, sensitive) || [];
  const groups = new Map();

  for (const row of prepared) {
    const key = String(row?.[sensitive] ?? "").trim() || "Unknown";
    const g = groups.get(key) || { group: key, total: 0, selected: 0 };
    g.total += 1;
    if (isPositiveDecision(row?.[target])) g.selected += 1;
    groups.set(key, g);
  }

  const entries = [...groups.values()].map((g) => ({ ...g, rate: g.selected / g.total }));
  return finalize({ entries, source: "dataset", fallbackOverall: 0 });
}

// Backend returns the gap as a fraction (0.12), signed; the UI wants absolute percentage points.
export function getSelectionRateGap(summaries) {
  const item = Array.isArray(summaries)
    ? summaries.find((d) => d.metric_name === "Selection Rate Gap")
    : null;
  const v = Number(item?.value);
  return Number.isFinite(v) ? Math.abs(v) * 100 : null;
}

// Prefer the API's group_metrics (the thing the backend actually audited); fall back to the CSV rows.
export function buildAuditStats({ rows, target, sensitive, metrics }) {
  const local = computeGroupStats(rows, target, sensitive);
  const groupMetrics = metrics?.group_metrics;
  if (!Array.isArray(groupMetrics) || groupMetrics.length === 0) return local;

  const entries = groupMetrics.map((item) => {
    const rate = Number(item.pass_rate);
    const total = Number(item.total ?? item.count ?? item.n ?? item.group_size);
    const hasTotal = Number.isFinite(total) && total > 0;
    const safeRate = Number.isFinite(rate) ? rate : 0;
    return {
      group: String(item.group_name),
      rate: safeRate,
      total: hasTotal ? total : null,
      selected: hasTotal ? Math.round(safeRate * total) : null,
    };
  });

  return finalize({
    entries,
    source: "backend",
    fallbackOverall: local.overall,
    gapOverride: getSelectionRateGap(metrics?.disparity_summaries),
  });
}