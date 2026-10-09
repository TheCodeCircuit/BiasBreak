// ReportPage.jsx
import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { fetchReport } from "../api/BiasBreakApi";
import { ArrowLeftIcon, PrintIcon, ReportIcon, Spinner } from "../components/Icons";
import { RISK, buildAuditStats, countOutcomes } from "../utils/fairness";

// Renders the backend's markdown-ish text (### headings, **bold**, - bullets) with the light theme.
// The old renderText hard-coded dark-theme colours (#f8fafc, #94a3b8), unreadable on the white report.
function RichText({ text }) {
  if (!text) return null;

  return text.split("\n").map((line, i) => {
    const t = line.trim();
    if (!t) return <div key={i} className="h-2" />;

    const heading = /^#{3,4}\s+(.*)/.exec(t);
    const bullet = /^[-*]\s+(.*)/.exec(t);
    const content = heading ? heading[1] : bullet ? bullet[1] : t;

    const parts = content.split(/(\*\*.*?\*\*)/g).map((part, j) =>
      part.startsWith("**") && part.endsWith("**") && part.length > 4 ? (
        <strong key={j} className="font-extrabold text-slate-950">{part.slice(2, -2)}</strong>
      ) : (
        part
      )
    );

    if (heading) return <h4 key={i} className="mb-1 mt-4 text-base font-extrabold text-slate-950">{parts}</h4>;
    if (bullet)
      return (
        <p key={i} className="flex gap-2 pl-1">
          <span aria-hidden="true">•</span>
          <span>{parts}</span>
        </p>
      );
    return <p key={i}>{parts}</p>;
  });
}

function EmptyReportState({ onBack }) {
  return (
    <div className="app-shell">
      <div className="top-stripe" />
      <main className="page-container flex min-h-[calc(100vh-4px)] items-center justify-center py-10">
        <div className="card card-glow max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">
            <ReportIcon />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.055em] text-slate-950">Report data missing</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            This report needs a completed analysis. Upload a CSV and run the analysis first (a page reload clears it).
          </p>
          <button type="button" onClick={onBack} className="btn btn-primary btn-lg mt-6">
            Back to upload
          </button>
        </div>
      </main>
    </div>
  );
}

function SummaryTile({ label, value, helper, tone = "slate" }) {
  const toneClass = {
    slate: "text-slate-950",
    success: "text-emerald-700",
    danger: "text-rose-700",
    warning: "text-amber-700",
  }[tone];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">{label}</p>
      <p className={`mt-3 font-mono text-3xl font-extrabold tracking-[-0.065em] ${toneClass}`}>{value}</p>
      {helper && <p className="mt-2 text-sm font-semibold leading-6 text-slate-500">{helper}</p>}
    </div>
  );
}

function ConfigRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 py-4 last:border-b-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm font-bold text-slate-500">{label}</span>
      <span className="break-all font-mono text-sm font-extrabold text-slate-950">{value || "Not available"}</span>
    </div>
  );
}

const FALLBACK_STEPS = [
  { title: "Validate data quality", body: "Check missing values, encoding issues, sample-size imbalance, and whether the target column represents a real decision." },
  { title: "Investigate group gaps", body: "Review whether the disparity comes from data collection, policy, model features, or historical bias." },
  { title: "Run mitigation", body: "Compare mitigation strategies on the dashboard before any real-world use." },
];

export default function ReportPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const { file, columns = [], rows, target, sensitive, analysisId, metrics } = location.state || {};
  const hasState = Boolean(target && sensitive && analysisId && Array.isArray(rows) && rows.length);

  const stats = useMemo(
    () => (hasState ? buildAuditStats({ rows, target, sensitive, metrics }) : null),
    [hasState, rows, target, sensitive, metrics]
  );
  const outcomes = useMemo(() => (hasState ? countOutcomes(rows, target) : null), [hasState, rows, target]);

  const [report, setReport] = useState(null);
  const [reportLoading, setReportLoading] = useState(Boolean(analysisId));
  const [reportError, setReportError] = useState("");

  useEffect(() => {
    if (!analysisId) return undefined;

    let ignore = false;
    fetchReport(analysisId)
      .then((data) => {
        if (!ignore) setReport(data?.report ?? null);
      })
      .catch((err) => {
        if (!ignore) setReportError(err.message);
      })
      .finally(() => {
        if (!ignore) setReportLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, [analysisId]);

  if (!hasState) return <EmptyReportState onBack={() => navigate("/")} />;

  const risk = RISK[stats.risk];
  const today = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
  const rejectionRate = 100 - outcomes.selectionRate;
  const recommendations = Array.isArray(report?.recommendations) ? report.recommendations : [];

  return (
    <div className="app-shell">
      <div className="top-stripe print:hidden" />

      <main className="page-container py-8 lg:py-10">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between print:hidden">
          <button type="button" onClick={() => navigate("/dashboard", { state: location.state })} className="btn btn-secondary w-fit">
            <ArrowLeftIcon className="h-4 w-4" strokeWidth={2.6} />
            Back to dashboard
          </button>

          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-primary">Internal audit document</span>
            <button type="button" onClick={() => window.print()} className="btn btn-primary">
              <PrintIcon className="h-4 w-4" />
              Print / save PDF
            </button>
          </div>
        </div>

        <article className="card card-glow overflow-hidden bg-white">
          <div className="top-stripe" />

          <header className="relative overflow-hidden border-b border-slate-200 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-7 md:p-10">
            <div className="decorative-blob -right-12 -top-12 h-48 w-48 bg-indigo-300" />
            <div className="decorative-blob bottom-0 left-1/3 h-36 w-36 bg-emerald-300" />

            <div className="relative z-10 flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <div className="flex items-center gap-3">
                  <div className="flex h-14 w-14 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-500 text-white shadow-xl shadow-indigo-500/25">
                    <ReportIcon className="h-6 w-6" />
                  </div>
                  <div>
                    <p className="text-sm font-extrabold tracking-[-0.03em] text-slate-950">BiasBreak</p>
                    <p className="mt-1 text-[0.7rem] font-extrabold uppercase tracking-[0.14em] text-slate-400">Fairness Audit Report</p>
                  </div>
                </div>

                <h1 className="mt-8 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-950 md:text-5xl">
                  Algorithmic fairness audit.
                </h1>
                <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                  Assessment of selection outcomes across groups for the configured target and sensitive attribute.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[310px] lg:grid-cols-1">
                <div className={`rounded-2xl border p-5 shadow-sm ${risk.panel}`}>
                  <p className={`text-xs font-extrabold uppercase tracking-wider ${risk.text}`}>Audit risk</p>
                  <p className={`mt-2 text-2xl font-extrabold tracking-[-0.05em] ${risk.text}`}>{risk.label}</p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">{risk.description}</p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white/90 p-5 shadow-sm">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Report generated</p>
                  <p className="mt-2 font-mono text-sm font-extrabold text-slate-950">{today}</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-500">Source: {file?.name ?? "Uploaded CSV"}</p>
                </div>
              </div>
            </div>
          </header>

          <div className="space-y-10 p-7 md:p-10">
            <section>
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="section-eyebrow">01 · Executive summary</p>
                  <h2 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-slate-950">Key audit outcome</h2>
                </div>
                <span className={risk.badge}>{risk.label}</span>
              </div>

              <div className={`rounded-3xl border p-6 ${risk.panel}`}>
                {reportLoading ? (
                  <p className="flex items-center gap-3 text-base font-semibold text-slate-600">
                    <Spinner className="h-5 w-5" />
                    Generating the written summary…
                  </p>
                ) : report?.executive_summary ? (
                  <div className="space-y-1.5 text-base font-medium leading-8 text-slate-700">
                    <RichText text={report.executive_summary} />
                  </div>
                ) : (
                  <p className="text-base font-semibold leading-8 text-slate-700">
                    The audit analysed <span className="font-mono font-extrabold text-slate-950">{outcomes.total.toLocaleString()}</span>{" "}
                    records using <span className="font-mono font-extrabold text-indigo-700">{target}</span> as the decision outcome
                    and <span className="font-mono font-extrabold text-violet-700">{sensitive}</span> as the sensitive attribute.
                    The overall selection rate is{" "}
                    <span className="font-mono font-extrabold text-slate-950">{outcomes.selectionRate.toFixed(1)}%</span>, with a
                    group gap of <span className={`font-mono font-extrabold ${risk.text}`}>{stats.gap.toFixed(1)}%</span>.
                  </p>
                )}

                {reportError && (
                  <p className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm font-bold text-amber-700 print:hidden">
                    Could not load the written report: {reportError}. The numbers below come from the audit and are unaffected.
                  </p>
                )}
              </div>
            </section>

            <section>
              <p className="section-eyebrow">02 · Dataset summary</p>
              <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <SummaryTile label="Total records" value={outcomes.total.toLocaleString()} helper="Rows in the uploaded file" />
                <SummaryTile label="Selected" value={outcomes.selected.toLocaleString()} helper={`${outcomes.selectionRate.toFixed(1)}% positive rate`} tone="success" />
                <SummaryTile label="Rejected" value={outcomes.rejected.toLocaleString()} helper={`${rejectionRate.toFixed(1)}% negative rate`} tone="danger" />
                <SummaryTile
                  label="Group gap"
                  value={`${stats.gap.toFixed(1)}%`}
                  helper={`${stats.minRate.toFixed(1)}% lowest · ${stats.maxRate.toFixed(1)}% highest`}
                  tone={stats.risk === "high" ? "danger" : stats.risk === "moderate" ? "warning" : "success"}
                />
              </div>
            </section>

            <section className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
              <div>
                <p className="section-eyebrow">03 · Audit configuration</p>
                <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <ConfigRow label="Decision column" value={target} />
                  <ConfigRow label="Sensitive attribute" value={sensitive} />
                  <ConfigRow label="Detected columns" value={columns.length ? String(columns.length) : "Not provided"} />
                  <ConfigRow label="Dataset file" value={file?.name} />
                  <ConfigRow label="Analysis ID" value={analysisId} />
                </div>
              </div>

              <div>
                <p className="section-eyebrow">04 · Group findings</p>
                <div className="mt-5 overflow-hidden rounded-3xl border border-slate-200 bg-white">
                  <div className="grid grid-cols-[1fr_90px_90px_90px] gap-3 border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    <span>Group</span>
                    <span className="text-right">Selected</span>
                    <span className="text-right">Total</span>
                    <span className="text-right">Rate</span>
                  </div>

                  {stats.entries.map((entry) => (
                    <div key={entry.group} className="grid grid-cols-[1fr_90px_90px_90px] gap-3 border-b border-slate-100 px-4 py-4 last:border-b-0">
                      <span className="truncate font-mono text-sm font-extrabold text-slate-950">{entry.group}</span>
                      <span className="text-right font-mono text-sm font-bold text-emerald-700">{entry.selected != null ? entry.selected.toLocaleString() : "—"}</span>
                      <span className="text-right font-mono text-sm font-bold text-slate-600">{entry.total != null ? entry.total.toLocaleString() : "—"}</span>
                      <span className="text-right font-mono text-sm font-extrabold text-indigo-700">{(entry.rate * 100).toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs font-semibold text-slate-400">
                  {stats.source === "backend" ? "Rates reported by the audit API." : "Rates computed from the file's labels."}
                </p>
              </div>
            </section>

            <section>
              <p className="section-eyebrow">05 · Rule check</p>
              <div className={`mt-5 rounded-3xl border p-6 ${stats.fourFifthsFailed ? "border-rose-100 bg-rose-50" : "border-emerald-100 bg-emerald-50"}`}>
                <h3 className={`text-xl font-extrabold tracking-[-0.045em] ${stats.fourFifthsFailed ? "text-rose-700" : "text-emerald-700"}`}>
                  EEOC 4/5ths rule: {stats.fourFifthsFailed ? "Failed" : "Passed"}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {stats.fourFifthsFailed
                    ? "At least one group is selected at less than 80% of the highest group's rate. This simplified check indicates potential adverse impact and should be reviewed carefully."
                    : "Every group is selected at 80% or more of the highest group's rate under this simplified check."}
                </p>
              </div>
            </section>

            {report?.detailed_findings && (
              <section>
                <p className="section-eyebrow">06 · Detailed findings</p>
                <div className="mt-5 space-y-1.5 rounded-3xl border border-slate-200 bg-white p-6 text-sm leading-7 text-slate-600">
                  <RichText text={report.detailed_findings} />
                </div>
              </section>
            )}

            <section>
              <p className="section-eyebrow">{report?.detailed_findings ? "07" : "06"} · Recommended next steps</p>

              {recommendations.length > 0 ? (
                <ul className="mt-5 space-y-3">
                  {recommendations.map((rec, i) => (
                    <li key={i} className="rounded-2xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-600 shadow-sm">
                      {rec}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  {FALLBACK_STEPS.map((s) => (
                    <div key={s.title} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                      <h3 className="text-base font-extrabold tracking-[-0.035em] text-slate-950">{s.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">{s.body}</p>
                    </div>
                  ))}
                </div>
              )}
            </section>
          </div>

          <footer className="border-t border-slate-200 bg-slate-50 px-7 py-6 text-center md:px-10">
            <p className="text-xs font-extrabold uppercase tracking-[0.14em] text-slate-400">
              Strictly confidential · For internal auditing purposes only
            </p>
          </footer>
        </article>
      </main>
    </div>
  );
}
