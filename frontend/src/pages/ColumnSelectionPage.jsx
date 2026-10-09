// ColumnSelectionPage.jsx
import { useLocation, useNavigate } from "react-router-dom";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import ColumnSelector from "../components/ColumnSelector";

const fadeLeft = {
  hidden: { opacity: 0, x: -24 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
  },
};

const fadeUp = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.08 },
  },
};

const stagger = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.42, ease: [0.16, 1, 0.3, 1] },
  },
};

const STEPS = [
  { number: "01", title: "Upload", description: "Dataset added", done: true },
  { number: "02", title: "Map", description: "Configure audit", active: true },
  { number: "03", title: "Audit", description: "Review metrics" },
  { number: "04", title: "Report", description: "Generate output" },
];

const TYPE_META = {
  binary: {
    label: "Binary",
    icon: "01",
    badgeClass: "badge-success",
    chipClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    barClass: "bg-emerald-500",
  },
  numeric: {
    label: "Numeric",
    icon: "##",
    badgeClass: "badge-info",
    chipClass: "bg-blue-50 text-blue-700 border-blue-100",
    barClass: "bg-blue-500",
  },
  categorical: {
    label: "Categorical",
    icon: "Aα",
    badgeClass: "badge-primary",
    chipClass: "bg-indigo-50 text-indigo-700 border-indigo-100",
    barClass: "bg-indigo-500",
  },
  text: {
    label: "Text",
    icon: "Aa",
    badgeClass: "badge-warning",
    chipClass: "bg-amber-50 text-amber-700 border-amber-100",
    barClass: "bg-amber-500",
  },
  unknown: {
    label: "Unknown",
    icon: "??",
    badgeClass: "badge",
    chipClass: "bg-slate-50 text-slate-500 border-slate-200",
    barClass: "bg-slate-400",
  },
};

function ShieldLogo() {
  return (
    <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-500 text-white shadow-lg shadow-indigo-500/25">
      <svg
        viewBox="0 0 24 24"
        className="h-4.5 w-4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  );
}

function BackIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m15 18-6-6 6-6" />
    </svg>
  );
}

function DatabaseIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
      <path d="M3 12c0 1.66 4 3 9 3s9-1.34 9-3" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8h.01" />
      <path d="M11 12h1v4h1" />
    </svg>
  );
}

function inferColumnType(column, rows) {
  const sample = rows
    .slice(0, 80)
    .map((row) => row?.[column])
    .filter((value) => value !== undefined && value !== null && String(value).trim() !== "");

  if (!sample.length) return "unknown";

  const numericValues = sample.filter((value) => !Number.isNaN(Number(value)));

  if (numericValues.length > sample.length * 0.8) {
    const uniqueNumbers = [...new Set(numericValues.map(Number))];

    if (
      uniqueNumbers.length <= 4 &&
      uniqueNumbers.every((number) => number === 0 || number === 1)
    ) {
      return "binary";
    }

    return "numeric";
  }

  const uniqueValues = [...new Set(sample.map((value) => String(value).trim()))];

  if (uniqueValues.length <= 12) return "categorical";

  return "text";
}

function getUniqueValues(column, rows, max = 7) {
  const values = [
    ...new Set(
      rows
        .slice(0, 250)
        .map((row) => row?.[column])
        .filter((value) => value !== undefined && value !== null && String(value).trim() !== "")
        .map((value) => String(value))
    ),
  ];

  return {
    values: values.slice(0, max),
    total: values.length,
  };
}

function EmptyState({ onBack }) {
  return (
    <div className="app-shell">
      <div className="top-stripe" />

      <main className="page-container flex min-h-[calc(100vh-4px)] items-center justify-center py-10">
        <div className="card card-glow max-w-xl p-8 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-rose-50 text-rose-600">
            <InfoIcon />
          </div>

          <h1 className="mt-6 text-3xl font-extrabold tracking-[-0.05em] text-slate-950">
            No dataset found
          </h1>

          <p className="mt-3 text-sm leading-7 text-slate-500">
            This page needs column data from the upload step. Please go back and upload a CSV file first.
          </p>

          <button type="button" onClick={onBack} className="btn btn-primary btn-lg mt-6">
            Back to upload
          </button>
        </div>
      </main>
    </div>
  );
}

export default function ColumnSelectionPage() {
  const location = useLocation();
  const navigate = useNavigate();

  const columns = location.state?.columns || [];
  const rows = location.state?.rows || [];
  const file = location.state?.file;
  const fileName = file?.name || "Uploaded dataset";

  const [expandedColumn, setExpandedColumn] = useState(null);

  const colMeta = useMemo(() => {
    const meta = {};

    columns.forEach((column) => {
      meta[column] = {
        type: inferColumnType(column, rows),
        ...getUniqueValues(column, rows),
      };
    });

    return meta;
  }, [columns, rows]);

  const typeCounts = useMemo(() => {
    const counts = {
      binary: 0,
      numeric: 0,
      categorical: 0,
      text: 0,
      unknown: 0,
    };

    Object.values(colMeta).forEach((meta) => {
      counts[meta.type] = (counts[meta.type] || 0) + 1;
    });

    return counts;
  }, [colMeta]);

  const detectedTypeEntries = Object.entries(typeCounts).filter(([, count]) => count > 0);

  if (!columns.length) {
    return <EmptyState onBack={() => navigate("/")} />;
  }

  return (
    <div className="app-shell">
      <div className="top-stripe" />

      <nav className="app-nav">
        <div className="page-container flex items-center justify-between gap-5">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => navigate("/")}
              className="icon-btn"
              title="Back to upload"
              aria-label="Back to upload"
            >
              <BackIcon />
            </button>

            <div className="flex items-center gap-3">
              <ShieldLogo />

              <div className="min-w-0">
                <p className="truncate text-sm font-extrabold leading-none tracking-[-0.03em] text-slate-950">
                  BiasBreak
                </p>
                <p className="mt-1 hidden text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-slate-400 sm:block">
                  Configure Analysis
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

                {index < STEPS.length - 1 && (
                  <div className={`h-px w-8 ${step.done ? "bg-emerald-200" : "bg-slate-200"}`} />
                )}
              </div>
            ))}
          </div>

          <div className="badge badge-primary">Step 2 of 4</div>
        </div>
      </nav>

      <main className="page-container py-8 lg:py-10">
        <motion.section
          variants={stagger}
          initial="hidden"
          animate="show"
          className="hero-panel mb-7"
        >
          <div className="relative z-10 grid gap-6 p-6 lg:grid-cols-[1fr_0.9fr] lg:p-8">
            <motion.div variants={item}>
              <div className="section-eyebrow">
                <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-glow" />
                Column Mapping
              </div>

              <h1 className="mt-5 max-w-3xl text-4xl font-extrabold leading-[0.98] tracking-[-0.065em] text-slate-950 md:text-5xl">
                Tell the audit engine what to measure.
              </h1>

              <p className="mt-5 max-w-2xl text-base leading-8 text-slate-600">
                Choose the decision outcome and the sensitive attribute. This creates the fairness lens
                used in your dashboard, charts, recommendations, and generated report.
              </p>
            </motion.div>

            <motion.div variants={item} className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              <div className="metric-card">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Dataset</p>
                <p className="mt-3 truncate text-lg font-extrabold tracking-[-0.04em] text-slate-950">
                  {fileName}
                </p>
                <p className="mt-2 text-sm font-semibold text-slate-500">Ready for configuration</p>
              </div>

              <div className="grid gap-3 sm:col-span-2 sm:grid-cols-2 lg:col-span-1">
                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Records</p>
                  <p className="mt-3 font-mono text-3xl font-extrabold tracking-[-0.06em] text-slate-950">
                    {rows.length.toLocaleString()}
                  </p>
                </div>

                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Columns</p>
                  <p className="mt-3 font-mono text-3xl font-extrabold tracking-[-0.06em] text-slate-950">
                    {columns.length}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.section>

        <div className="grid items-start gap-7 lg:grid-cols-[340px_1fr]">
          <motion.aside
            variants={fadeLeft}
            initial="hidden"
            animate="show"
            className="hidden space-y-5 lg:block"
          >
            <div className="card card-hover">
              <div className="card-header flex items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-700">
                    <DatabaseIcon />
                  </div>

                  <div>
                    <p className="text-sm font-extrabold text-slate-950">Dataset intelligence</p>
                    <p className="text-xs font-semibold text-slate-400">Auto-detected column structure</p>
                  </div>
                </div>
                <span className="badge badge-success">Valid</span>
              </div>

              <div className="card-body space-y-5">
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Rows</p>
                    <p className="mt-2 font-mono text-2xl font-extrabold tracking-[-0.06em] text-slate-950">
                      {rows.length.toLocaleString()}
                    </p>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Fields</p>
                    <p className="mt-2 font-mono text-2xl font-extrabold tracking-[-0.06em] text-slate-950">
                      {columns.length}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">
                    Type breakdown
                  </p>

                  <div className="mt-3 space-y-3">
                    {detectedTypeEntries.map(([type, count]) => {
                      const meta = TYPE_META[type] || TYPE_META.unknown;
                      const percent = columns.length ? Math.round((count / columns.length) * 100) : 0;

                      return (
                        <div key={type}>
                          <div className="mb-1.5 flex items-center gap-2">
                            <span className={`rounded-lg border px-2 py-1 font-mono text-[0.65rem] font-extrabold ${meta.chipClass}`}>
                              {meta.icon}
                            </span>

                            <span className="flex-1 text-sm font-bold text-slate-600">{meta.label}</span>

                            <span className="font-mono text-xs font-extrabold text-slate-500">
                              {count}
                            </span>
                          </div>

                          <div className="progress-track h-2">
                            <div className={`h-full rounded-full ${meta.barClass}`} style={{ width: `${percent}%` }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-header flex items-center justify-between">
                <div>
                  <p className="text-sm font-extrabold text-slate-950">All fields</p>
                  <p className="text-xs font-semibold text-slate-400">Click a field to preview values</p>
                </div>

                <span className="badge badge-info">{columns.length} total</span>
              </div>

              <div className="max-h-[430px] overflow-y-auto py-2">
                {columns.map((column) => {
                  const meta = colMeta[column] || {};
                  const typeMeta = TYPE_META[meta.type] || TYPE_META.unknown;
                  const isOpen = expandedColumn === column;

                  return (
                    <div key={column}>
                      <button
                        type="button"
                        onClick={() => setExpandedColumn(isOpen ? null : column)}
                        className={`flex w-full items-center gap-3 border-l-2 px-5 py-2.5 text-left transition ${
                          isOpen
                            ? "border-indigo-500 bg-indigo-50"
                            : "border-transparent hover:bg-slate-50"
                        }`}
                      >
                        <span className={`shrink-0 rounded-lg border px-2 py-1 font-mono text-[0.65rem] font-extrabold ${typeMeta.chipClass}`}>
                          {typeMeta.icon}
                        </span>

                        <span
                          className={`min-w-0 flex-1 truncate font-mono text-xs font-bold ${
                            isOpen ? "text-indigo-700" : "text-slate-600"
                          }`}
                        >
                          {column}
                        </span>

                        <svg
                          viewBox="0 0 24 24"
                          className={`h-4 w-4 shrink-0 transition ${
                            isOpen ? "rotate-90 text-indigo-600" : "text-slate-400"
                          }`}
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </button>

                      <AnimatePresence>
                        {isOpen && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden border-l-2 border-indigo-500 bg-indigo-50"
                          >
                            <div className="px-5 pb-4 pl-12 pt-1">
                              <p className="text-[0.68rem] font-extrabold uppercase tracking-wider text-slate-400">
                                Sample values
                              </p>

                              <div className="mt-2 flex flex-wrap gap-2">
                                {(meta.values || []).map((value) => (
                                  <span
                                    key={value}
                                    className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[0.7rem] font-bold text-slate-600 shadow-sm"
                                  >
                                    {String(value)}
                                  </span>
                                ))}

                                {meta.total > 7 && (
                                  <span className="rounded-lg border border-indigo-100 bg-indigo-100 px-2.5 py-1 text-[0.7rem] font-extrabold text-indigo-700">
                                    +{meta.total - 7} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="callout callout-primary">
              <InfoIcon className="mt-0.5 h-5 w-5 shrink-0" />

              <div>
                <p className="text-sm font-extrabold">How to choose columns</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">
                  The target column should be your decision outcome. The sensitive column should represent a group attribute like gender, age group, ethnicity, or department.
                </p>
              </div>
            </div>
          </motion.aside>

          <motion.section variants={fadeUp} initial="hidden" animate="show" className="min-w-0">
            <div className="mb-5 grid gap-4 md:grid-cols-3">
              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Current step</p>
                <p className="mt-1 text-sm font-extrabold text-indigo-700">Map columns</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Required</p>
                <p className="mt-1 text-sm font-extrabold text-slate-950">Target + sensitive</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Next</p>
                <p className="mt-1 text-sm font-extrabold text-emerald-700">Fairness dashboard</p>
              </div>
            </div>

            <ColumnSelector
              columns={columns} 
              rows={rows} 
              file={file} 
              colMeta={colMeta}
            />
          </motion.section>
        </div>
      </main>
    </div>
  );
}
