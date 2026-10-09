// BiasWarningCard.jsx
import { RISK, LOW_SAMPLE } from "../utils/fairness";
import { WarningIcon, InfoIcon, ShieldIcon } from "./Icons";

const RISK_ICON = { high: WarningIcon, moderate: InfoIcon, low: ShieldIcon };

function EmptyState() {
  return (
    <div className="card card-glow p-6 text-center">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-50 text-slate-500">
        <InfoIcon />
      </div>
      <h3 className="mt-4 text-xl font-extrabold tracking-[-0.045em] text-slate-950">No warning data</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">
        There is not enough group data to calculate fairness warnings.
      </p>
    </div>
  );
}

function GroupRow({ entry, stats, risk }) {
  const pct = Number((entry.rate * 100).toFixed(1));
  const diff = Number((pct - stats.overall).toFixed(1));
  const spread = stats.maxRate !== stats.minRate;
  const isHigh = spread && pct === stats.maxRate;
  const isLow = spread && pct === stats.minRate;

  const diffClass = diff > 0 ? "text-emerald-700" : diff < 0 ? "text-rose-700" : "text-slate-500";
  const barClass = isLow ? "bg-rose-500" : isHigh ? risk.bar : "bg-indigo-500";

  const detail = [
    entry.selected != null && `${entry.selected.toLocaleString()} selected`,
    entry.total != null && `n=${entry.total.toLocaleString()}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="border-b border-slate-100 py-3 last:border-b-0">
      <div className="mb-2 flex items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {(isHigh || isLow) && (
              <span
                className={`rounded-full border px-2 py-0.5 text-[0.62rem] font-extrabold uppercase tracking-wider ${
                  isHigh ? "border-indigo-100 bg-indigo-50 text-indigo-700" : "border-rose-100 bg-rose-50 text-rose-700"
                }`}
              >
                {isHigh ? "Highest" : "Lowest"}
              </span>
            )}
            <span className="truncate font-mono text-sm font-extrabold text-slate-950">{entry.group}</span>
          </div>
          {detail && <p className="mt-1 text-xs font-semibold text-slate-400">{detail}</p>}
        </div>

        <div className="text-right">
          <p className="font-mono text-sm font-extrabold text-slate-950">{pct}%</p>
          <p className={`font-mono text-xs font-extrabold ${diffClass}`}>
            {diff > 0 ? "+" : ""}
            {diff.toFixed(1)}
          </p>
        </div>
      </div>

      {/* `relative` is required: .progress-track has no position, so the absolute marker
          used to be positioned against the whole card and drew a line through it. */}
      <div className="progress-track relative h-2">
        <div
          className="absolute top-0 bottom-0 z-10 w-0.5 rounded-full bg-slate-400"
          style={{ left: `${Math.min(Math.max(stats.overall, 0), 100)}%` }}
        />
        <div className={`h-full rounded-full ${barClass}`} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
      </div>
    </div>
  );
}

export default function BiasWarningCard({ stats }) {
  if (!stats?.entries?.length) return <EmptyState />;

  const { entries, gap, overall, fourFifthsFailed, lowSampleGroups, source } = stats;
  const risk = RISK[stats.risk];
  const RiskIcon = RISK_ICON[stats.risk];

  return (
    <div className="card card-glow overflow-hidden">
      <div className={`border-b p-5 ${risk.panel}`}>
        <div className="flex items-start gap-4">
          <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white shadow-sm ${risk.text}`}>
            <RiskIcon />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={risk.badge}>{risk.label}</span>
              <span className="badge badge-info">Gap {gap}%</span>
              <span className="badge">{source === "backend" ? "API metrics" : "Dataset labels"}</span>
            </div>

            <h3 className={`mt-3 text-xl font-extrabold tracking-[-0.045em] ${risk.text}`}>{risk.short}</h3>
            <p className="mt-2 text-sm leading-6 text-slate-600">{risk.description}</p>
          </div>
        </div>
      </div>

      <div className="card-body space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Overall rate</p>
            <p className="mt-2 font-mono text-2xl font-extrabold tracking-[-0.06em] text-slate-950">{overall}%</p>
          </div>

          <div className={`rounded-2xl border p-4 ${risk.panel}`}>
            <p className={`text-xs font-extrabold uppercase tracking-wider ${risk.text}`}>Max gap</p>
            <p className={`mt-2 font-mono text-2xl font-extrabold tracking-[-0.06em] ${risk.text}`}>{gap}%</p>
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Group breakdown</p>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[0.68rem] font-extrabold text-slate-500">
              marker = overall {overall}%
            </span>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white px-4">
            {entries.map((entry) => (
              <GroupRow key={entry.group} entry={entry} stats={stats} risk={risk} />
            ))}
          </div>
        </div>

        {lowSampleGroups.length > 0 && (
          <div className="rounded-2xl border border-amber-100 bg-amber-50 p-4">
            <p className="text-sm font-extrabold text-amber-700">Small groups</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              {lowSampleGroups.slice(0, 4).join(", ")}
              {lowSampleGroups.length > 4 ? ` and ${lowSampleGroups.length - 4} more` : ""} have fewer than {LOW_SAMPLE}{" "}
              records. Their rates swing a lot with one decision, so treat gaps involving them with caution.
            </p>
          </div>
        )}

        <div
          className={`rounded-2xl border p-4 ${
            fourFifthsFailed ? "border-rose-100 bg-rose-50" : "border-emerald-100 bg-emerald-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <div
              className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
                fourFifthsFailed ? "bg-rose-100 text-rose-700" : "bg-emerald-100 text-emerald-700"
              }`}
            >
              {fourFifthsFailed ? <WarningIcon className="h-4 w-4" /> : <ShieldIcon className="h-4 w-4" />}
            </div>

            <div>
              <p className={`text-sm font-extrabold ${fourFifthsFailed ? "text-rose-700" : "text-emerald-700"}`}>
                EEOC 4/5ths rule: {fourFifthsFailed ? "Failed" : "Passed"}
              </p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                {fourFifthsFailed
                  ? "At least one group is selected at less than 80% of the highest group's rate. This may indicate adverse impact and should be investigated."
                  : "Every group is selected at 80% or more of the highest group's rate under this simplified check."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
