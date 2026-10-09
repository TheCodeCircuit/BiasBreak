// UploadPage.jsx
import UploadCard from "../components/UploadCard";
import { motion } from "framer-motion";

const container = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const item = {
  hidden: {
    opacity: 0,
    y: 22,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.52,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const itemRight = {
  hidden: {
    opacity: 0,
    x: 28,
    scale: 0.98,
  },
  show: {
    opacity: 1,
    x: 0,
    scale: 1,
    transition: {
      duration: 0.6,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

const FEATURES = [
  {
    color: "success",
    title: "Private by default",
    body: "CSV files are processed locally in the browser. Your dataset never needs to leave your machine.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    ),
  },
  {
    color: "primary",
    title: "Bias detection",
    body: "Automatically compare outcome rates across sensitive groups and surface fairness risk.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M3 3v18h18" />
        <path d="m7 15 4-4 3 3 5-7" />
      </svg>
    ),
  },
  {
    color: "violet",
    title: "Guided audit flow",
    body: "Upload, map columns, inspect metrics, and generate a structured audit report.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M9 11 12 14 22 4" />
        <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
      </svg>
    ),
  },
  {
    color: "warning",
    title: "Report-ready output",
    body: "Turn raw fairness metrics into clear, readable findings for teams and stakeholders.",
    icon: (
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <path d="M14 2v6h6" />
        <path d="M8 13h8" />
        <path d="M8 17h6" />
      </svg>
    ),
  },
];

const STEPS = [
  {
    number: "01",
    title: "Upload",
    description: "Import CSV data",
  },
  {
    number: "02",
    title: "Map",
    description: "Choose target and sensitive columns",
  },
  {
    number: "03",
    title: "Audit",
    description: "Review fairness signals",
  },
  {
    number: "04",
    title: "Report",
    description: "Generate findings",
  },
];

const PREVIEW_STATS = [
  {
    label: "Fairness Score",
    value: "82",
    suffix: "/100",
    badge: "Moderate",
    badgeClass: "badge-warning",
    bar: "82%",
  },
  {
    label: "Selection Gap",
    value: "14",
    suffix: "%",
    badge: "Watch",
    badgeClass: "badge-danger",
    bar: "64%",
  },
  {
    label: "Groups Audited",
    value: "6",
    suffix: "",
    badge: "Ready",
    badgeClass: "badge-success",
    bar: "92%",
  },
];

const featureStyles = {
  success: {
    shell: "bg-emerald-50 text-emerald-700 border-emerald-100",
    glow: "bg-emerald-400",
  },
  primary: {
    shell: "bg-indigo-50 text-indigo-700 border-indigo-100",
    glow: "bg-indigo-400",
  },
  violet: {
    shell: "bg-violet-50 text-violet-700 border-violet-100",
    glow: "bg-violet-400",
  },
  warning: {
    shell: "bg-amber-50 text-amber-700 border-amber-100",
    glow: "bg-amber-400",
  },
};

function LogoMark() {
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 via-violet-600 to-emerald-500 text-white shadow-lg shadow-indigo-500/25">
      <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2.6">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
    </div>
  );
}

function ProductPreview() {
  return (
    <motion.div variants={itemRight} className="relative">
      <div className="decorative-blob -right-8 top-10 h-44 w-44 bg-indigo-300" />
      <div className="decorative-blob -bottom-8 left-8 h-40 w-40 bg-emerald-300" />

      <div className="card card-glow relative z-10">
        <div className="top-stripe" />

        <div className="card-header flex items-center justify-between">
          <div>
            <p className="section-eyebrow">Live preview</p>
            <h3 className="mt-3 text-xl font-extrabold tracking-[-0.04em] text-slate-950">
              Bias Audit Snapshot
            </h3>
          </div>

          <div className="badge badge-success">Local</div>
        </div>

        <div className="card-body space-y-5">
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 via-white to-emerald-50 p-5">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-bold text-slate-500">Overall fairness signal</p>
                <div className="mt-2 flex items-end gap-2">
                  <span className="stat-value text-gradient-primary">82</span>
                  <span className="pb-1 text-sm font-extrabold text-slate-500">/100</span>
                </div>
              </div>

              <div className="rounded-2xl bg-white px-3 py-2 text-right shadow-sm">
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Risk</p>
                <p className="text-sm font-extrabold text-amber-600">Moderate</p>
              </div>
            </div>

            <div className="mt-5 progress-track">
              <div className="progress-fill" style={{ width: "82%" }} />
            </div>
          </div>

          <div className="grid gap-3">
            {PREVIEW_STATS.map((stat) => (
              <div
                key={stat.label}
                className="rounded-2xl border border-slate-200 bg-white/85 p-4 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                      {stat.label}
                    </p>
                    <div className="mt-1 flex items-end gap-1">
                      <span className="font-mono text-2xl font-extrabold leading-none tracking-[-0.05em] text-slate-950">
                        {stat.value}
                      </span>
                      {stat.suffix && (
                        <span className="text-sm font-bold text-slate-500">{stat.suffix}</span>
                      )}
                    </div>
                  </div>

                  <span className={stat.badgeClass}>{stat.badge}</span>
                </div>

                <div className="mt-3 progress-track h-2">
                  <div className="progress-fill" style={{ width: stat.bar }} />
                </div>
              </div>
            ))}
          </div>

          <div className="callout callout-primary">
            <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse-glow" />
            <div>
              <p className="text-sm font-extrabold">Suggested next step</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">
                Review the sensitive attribute mapping before generating the final audit.
              </p>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

export default function UploadPage() {
  return (
    <div className="app-shell">
      <div className="top-stripe" />

      <nav className="app-nav">
        <div className="page-container flex items-center justify-between">
          <div className="flex items-center gap-3">
            <LogoMark />

            <div>
              <p className="text-sm font-extrabold leading-none tracking-[-0.03em] text-slate-950">
                BiasBreak
              </p>
              <p className="mt-1 text-[0.66rem] font-extrabold uppercase tracking-[0.13em] text-slate-400">
                Fairness Audit Platform
              </p>
            </div>
          </div>

          <div className="hidden items-center gap-3 md:flex">
            {STEPS.map((step, index) => (
              <div key={step.number} className="flex items-center gap-3">
                <div className={`flex items-center gap-2 ${index === 0 ? "opacity-100" : "opacity-45"}`}>
                  <div
                    className={`flex h-8 w-8 items-center justify-center rounded-full text-[0.68rem] font-extrabold ${
                      index === 0
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                        : "border border-slate-200 bg-white text-slate-400"
                    }`}
                  >
                    {step.number}
                  </div>
                  <div>
                    <p className="text-xs font-extrabold leading-none text-slate-950">{step.title}</p>
                    <p className="mt-1 text-[0.68rem] font-semibold text-slate-400">{step.description}</p>
                  </div>
                </div>

                {index < STEPS.length - 1 && <div className="h-px w-8 bg-slate-200" />}
              </div>
            ))}
          </div>

          <div className="badge badge-primary">Beta</div>
        </div>
      </nav>

      <main className="page-container py-8 lg:py-12">
        <section className="hero-panel">
          <div className="relative z-10 grid gap-10 p-6 sm:p-8 lg:grid-cols-[1.08fr_0.92fr] lg:p-10 xl:p-12">
            <motion.div variants={container} initial="hidden" animate="show" className="flex flex-col justify-center">
              <motion.div variants={item} className="section-eyebrow">
                <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
                Private AI Fairness Audit
              </motion.div>

              <motion.h1 variants={item} className="section-title mt-6 max-w-3xl">
                Find bias before your model makes it real.
              </motion.h1>

              <motion.p variants={item} className="section-subtitle mt-6">
                Upload hiring or selection data, map the important columns, and instantly reveal
                fairness gaps through clean metrics, guided insights, and a report-ready audit flow.
              </motion.p>

              <motion.div variants={item} className="mt-8 flex flex-wrap gap-3">
                <a href="#upload-zone" className="btn btn-primary btn-lg">
                  Start audit
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M5 12h14" />
                    <path d="m12 5 7 7-7 7" />
                  </svg>
                </a>

                <div className="btn btn-secondary btn-lg">
                  No signup needed
                </div>
              </motion.div>

              <motion.div variants={item} className="mt-8 grid gap-3 sm:grid-cols-3">
                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Processing</p>
                  <p className="mt-3 font-mono text-2xl font-extrabold tracking-[-0.05em] text-slate-950">
                    Local
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Browser-only audit flow</p>
                </div>

                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Workflow</p>
                  <p className="mt-3 font-mono text-2xl font-extrabold tracking-[-0.05em] text-slate-950">
                    4-step
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Upload to report</p>
                </div>

                <div className="metric-card">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Output</p>
                  <p className="mt-3 font-mono text-2xl font-extrabold tracking-[-0.05em] text-slate-950">
                    Audit
                  </p>
                  <p className="mt-2 text-sm font-semibold text-slate-500">Stakeholder-ready</p>
                </div>
              </motion.div>
            </motion.div>

            <ProductPreview />
          </div>
        </section>

        <section className="grid gap-6 py-8 lg:grid-cols-[0.95fr_1.05fr] lg:py-10">
          <motion.div
            variants={container}
            initial="hidden"
            animate="show"
            className="grid gap-4 sm:grid-cols-2"
          >
            {FEATURES.map((feature) => {
              const style = featureStyles[feature.color];

              return (
                <motion.div key={feature.title} variants={item} className="card card-hover p-5">
                  <div className="flex items-start gap-4">
                    <div className={`relative flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${style.shell}`}>
                      <span className={`absolute -right-1 -top-1 h-3 w-3 rounded-full ${style.glow}`} />
                      {feature.icon}
                    </div>

                    <div>
                      <h3 className="text-base font-extrabold tracking-[-0.03em] text-slate-950">
                        {feature.title}
                      </h3>
                      <p className="mt-2 text-sm leading-6 text-slate-500">
                        {feature.body}
                      </p>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>

          <motion.div
            id="upload-zone"
            variants={itemRight}
            initial="hidden"
            animate="show"
            className="relative"
          >
            <div className="decorative-blob -left-8 top-12 h-36 w-36 bg-violet-300" />

            <div className="relative z-10">
              <UploadCard />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Format</p>
                <p className="mt-1 text-sm font-extrabold text-slate-950">CSV</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Privacy</p>
                <p className="mt-1 text-sm font-extrabold text-emerald-700">Local</p>
              </div>

              <div className="glass-card p-4">
                <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Next</p>
                <p className="mt-1 text-sm font-extrabold text-indigo-700">Map columns</p>
              </div>
            </div>
          </motion.div>
        </section>
      </main>

      <footer className="border-t border-slate-200 bg-white/80 py-5 backdrop-blur-xl">
        <div className="page-container flex flex-col items-center justify-between gap-3 text-center sm:flex-row sm:text-left">
          <p className="text-sm font-semibold text-slate-500">
            BiasBreak · Fairness Audit Platform
          </p>

          <div className="flex flex-wrap justify-center gap-2">
            <span className="badge badge-success">No server upload</span>
            <span className="badge badge-info">CSV compatible</span>
            <span className="badge badge-primary">Browser-based</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
