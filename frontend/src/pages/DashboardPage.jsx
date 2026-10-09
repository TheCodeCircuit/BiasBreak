// DashboardPage.jsx
import { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";

import MetricCard from "../components/MetricCard";
import FairnessChart from "../components/FairnessChart";
import BiasWarningCard from "../components/BiasWarningCard";
import MitigationPanel from "../components/MitigationPanel";
import {
  ArrowRightIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  DatabaseIcon,
  ReportIcon,
  XCircleIcon,
} from "../components/Icons";
import { buildAuditStats, countOutcomes, getSelectionRateGap } from "../utils/fairness";

const STEPS = [
  { number: "01", title: "Upload", description: "Dataset added", done: true },
  { number: "02", title: "Map", description: "Columns selected", done: true },
  { number: "03", title: "Audit", description: "Review metrics", active: true },
  { number: "04", title: "Report", description: "Generate output" },
];

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const fadeRight = {
  hidden: { opacity: 0, x: 24 },
  show: { opacity: 1, x: 0, transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] } },
};

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

function ShieldLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-500 text-white shadow-lg shadow-indigo-500/25">
      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  );
}

function EmptyState({ onBack }) {
  return (
    <div className="app-shell">
      <div className="top-stripe" />
      <main className="page-container flex min-h-[calc(100vh-4px)] items-center justify-center py-10">
        <div className="card card-glow max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">
            <XCircleIcon />
          </div>
          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.055em] text-slate-950">Dashboard data missing</h1>
          <p className="mt-3 text-sm leading-7 text-slate-500">
            This dashboard needs a completed analysis. Upload a CSV and run the analysis first (a page reload clears it).
          </p>
          <button type="button" onClick={onBack} className="btn btn-primary btn-lg mt-6">
            Back to upload
          </button>
        </div>
      </main>
    </div>
  );
}

function ConfigPill({ label, value, tone = "indigo" }) {
  const toneClass = tone === "violet" ? "text-violet-700" : "text-indigo-700";
  return (
    <div className="flex overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-sm">
      <span className="border-r border-slate-200 bg-slate-50 px-3 py-2 text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400">
        {label}
      </span>
      <span className={`max-w-[180px] truncate px-3 py-2 font-mono text-xs font-extrabold ${toneClass}`}>{value}</span>
    </div>
  );
}

function ReportBanner({ onGenerateReport }) {
  return (
    <motion.div variants={fadeUp}>
      <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 p-6 shadow-2xl shadow-indigo-500/25 lg:p-8">
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10" />
        <div className="absolute bottom-[-90px] right-32 h-52 w-52 rounded-full bg-white/10" />
        <div className="absolute left-10 top-10 h-28 w-28 rounded-full bg-emerald-300/20 blur-3xl" />

        <div className="relative z-10 flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-white/85">
              <ReportIcon className="h-4 w-4" />
              Final step
            </div>
            <h2 className="mt-5 text-3xl font-extrabold tracking-[-0.06em] text-white">Turn this audit into a report.</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-white/75">
              Generate a fairness report with configuration details, group breakdowns, warnings, mitigation results,
              and a written summary.
            </p>
          </div>

          <button
            type="button"
            onClick={onGenerateReport}
            className="inline-flex min-h-[52px] items-center justify-center gap-3 rounded-2xl bg-white px-6 font-extrabold text-indigo-700 shadow-xl shadow-black/15 transition hover:-translate-y-0.5 hover:shadow-2xl"
          >
            <ReportIcon className="h-4 w-4" />
            Generate report
            <ArrowRightIcon className="h-4 w-4" strokeWidth={2.6} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const location = useLocation();
  const navigate = useNavigate();

  // Canonical router state: { file, columns, rows, target, sensitive, analysisId, metrics }
  // `metrics` is the raw /analyze/ response. (In the old merge it was ALSO the name of a local
  // summary object, so `metrics?.group_metrics` was always undefined.)
  const { file, rows, target, sensitive, analysisId, metrics } = location.state || {};

  const hasState = Boolean(target && sensitive && analysisId && Array.isArray(rows) && rows.length);

  const stats = useMemo(
    () => (hasState ? buildAuditStats({ rows, target, sensitive, metrics }) : null),
    [hasState, rows, target, sensitive, metrics]
  );
  const outcomes = useMemo(() => (hasState ? countOutcomes(rows, target) : null), [hasState, rows, target]);

  if (!hasState) return <EmptyState onBack={() => navigate("/")} />;

  // Back-navigation passes the whole state through, so nothing (notably `file`) is dropped.
  const backToColumns = () => navigate("/columns", { state: location.state });
  const generateReport = () => navigate("/report", { state: location.state });

  const rejectionRate = 100 - outcomes.selectionRate;

  return (
    <div className="app-shell">
      <div className="top-stripe" />

      <nav className="app-nav">
        <div className="page-container flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={backToColumns} className="icon-btn" title="Back to column mapping" aria-label="Back to column mapping">
              <ChevronLeftIcon className="h-4 w-4" strokeWidth={2.6} />
            </button>

            <div className="flex items-center gap-3">
              <ShieldLogo />
              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold leading-none tracking-[-0.03em] text-slate-950">BreakBias</p>
                <p className="mt-1 hidden text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-slate-400 sm:block">
                  Fairness Dashboard
                </p>
              </div>
            </div>
          </div>

          <div className="hidden items-center gap-3 lg:flex">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${step.active || step.done ? "opacity-100" : "opacity-45"}`}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-extrabold ${
                      step.done
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                        : step.active
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "border border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {step.done ? "✓" : step.number}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold leading-none text-slate-950">{step.title}</p>
                    <p className="mt-1 text-[0.68rem] font-semibold text-slate-400">{step.description}</p>
                  </div>
                </div>
                {index < STEPS.length - 1 && <div className={`h-px w-8 ${step.done ? "bg-emerald-200" : "bg-slate-200"}`} />}
              </div>
            ))}
          </div>

          <button type="button" onClick={generateReport} className="btn btn-primary">
            <ReportIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Generate report</span>
          </button>
        </div>
      </nav>

      <main className="page-container py-8 lg:py-10">
        <motion.section variants={stagger} initial="hidden" animate="show" className="hero-panel mb-7">
          <div className="relative z-10 grid gap-7 p-6 lg:grid-cols-[1fr_0.88fr] lg:p-8">
            <motion.div variants={fadeUp}>
              <div className="section-eyebrow">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                Audit complete
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-950 md:text-5xl">
                Fairness dashboard for your dataset.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Reviewing <span className="font-mono font-extrabold text-slate-950">{outcomes.total.toLocaleString()}</span>{" "}
                records to measure how <span className="font-mono font-extrabold text-indigo-700">{target}</span>{" "}
                outcomes differ across <span className="font-mono font-extrabold text-violet-700">{sensitive}</span>.
              </p>

              <div className="mt-6 flex flex-wrap gap-3">
                <ConfigPill label="Target" value={target} tone="indigo" />
                <ConfigPill label="Sensitive" value={sensitive} tone="violet" />
                <ConfigPill label="File" value={file?.name ?? "Uploaded CSV"} tone="indigo" />
              </div>
            </motion.div>

            <motion.div variants={fadeRight} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="metric-card">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Audit status</p>
                <div className="mt-3 flex items-center gap-3">
                  <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <CheckCircleIcon />
                  </span>
                  <div>
                    <p className="text-xl font-extrabold tracking-[-0.04em] text-slate-950">Complete</p>
                    <p className="text-sm font-semibold text-slate-500">Ready for report</p>
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Selection rate</p>
                  <p className="mt-3 font-mono text-3xl font-extrabold tracking-[-0.06em] text-slate-950">
                    {outcomes.selectionRate.toFixed(1)}%
                  </p>
                  <div className="mt-3 progress-track">
                    <div className="progress-fill" style={{ width: `${outcomes.selectionRate}%` }} />
                  </div>
                </div>

                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Rejection rate</p>
                  <p className="mt-3 font-mono text-3xl font-extrabold tracking-[-0.06em] text-slate-950">
                    {rejectionRate.toFixed(1)}%
                  </p>
                  <div className="mt-3 progress-track">
                    <div className="h-full rounded-full bg-rose-500" style={{ width: `${rejectionRate}%` }} />
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <motion.section variants={stagger} initial="hidden" animate="show" className="mb-7 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <motion.div variants={fadeUp}>
            <MetricCard
              title="Total Records"
              value={outcomes.total.toLocaleString()}
              sub="In the uploaded file"
              trend="Validated"
              trendDir="neutral"
              type="neutral"
              delay={0.05}
              icon={<DatabaseIcon />}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <MetricCard
              title="Selected"
              value={outcomes.selected.toLocaleString()}
              sub={`${outcomes.selectionRate.toFixed(1)}% selection rate`}
              trend="Positive outcomes"
              trendDir="up"
              type="success"
              delay={0.1}
              icon={<CheckCircleIcon />}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <MetricCard
              title="Rejected"
              value={outcomes.rejected.toLocaleString()}
              sub={`${rejectionRate.toFixed(1)}% rejection rate`}
              trendDir="down"
              trend="Negative outcomes"
              type="danger"
              delay={0.15}
              icon={<XCircleIcon />}
            />
          </motion.div>

          <motion.div variants={fadeUp}>
            <MetricCard
              title="Report Status"
              value="Ready"
              sub="Audit results prepared"
              trend="Generate anytime"
              trendDir="up"
              type="primary"
              delay={0.2}
              icon={<ReportIcon />}
            />
          </motion.div>
        </motion.section>

        <div className="grid items-start gap-7 xl:grid-cols-[1fr_390px]">
          <motion.section variants={fadeUp} initial="hidden" animate="show" className="min-w-0">
            <FairnessChart stats={stats} outcomes={outcomes} target={target} sensitive={sensitive} />
          </motion.section>

          <motion.aside variants={stagger} initial="hidden" animate="show" className="space-y-5">
            <motion.div variants={fadeRight}>
              <BiasWarningCard stats={stats} />
            </motion.div>

            <motion.div variants={fadeRight}>
              <MitigationPanel
                analysisId={analysisId}
                featuresAnalyzed={metrics?.dataset_summary?.features_analyzed || []}
                baselineGap={getSelectionRateGap(metrics?.disparity_summaries)}
              />
            </motion.div>
          </motion.aside>
        </div>

        <div className="mt-7">
          <ReportBanner onGenerateReport={generateReport} />
        </div>
      </main>
    </div>
  );
}
