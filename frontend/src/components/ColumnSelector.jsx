// ColumnSelector.jsx
import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { analyzeDataset } from "../api/BiasBreakApi";
import {
  AlertIcon,
  ArrowRightIcon,
  CheckIcon,
  ChevronDownIcon,
  DashboardIcon,
  GroupIcon,
  SparkIcon,
  Spinner,
  TargetIcon,
} from "./Icons";

const TARGET_KEYWORDS = ["hired", "rejected", "selected", "approved", "accepted", "status", "outcome", "decision", "label", "result", "pass", "fail"];
const SENSITIVE_KEYWORDS = ["gender", "sex", "race", "ethnicity", "age", "nationality", "religion", "disability", "group", "demographic", "category"];

const IDENTIFIER_EXACT = new Set([
  "candidate", "candidateid", "userid", "employeeid", "applicantid", "personid", "recordid", "rowid", "index", "serial",
]);

const TYPE_META = {
  binary: { label: "Binary", short: "BIN", chipClass: "bg-emerald-50 text-emerald-700 border-emerald-100", badgeClass: "badge-success" },
  numeric: { label: "Numeric", short: "NUM", chipClass: "bg-blue-50 text-blue-700 border-blue-100", badgeClass: "badge-info" },
  categorical: { label: "Categorical", short: "CAT", chipClass: "bg-indigo-50 text-indigo-700 border-indigo-100", badgeClass: "badge-primary" },
  text: { label: "Text", short: "TXT", chipClass: "bg-amber-50 text-amber-700 border-amber-100", badgeClass: "badge-warning" },
  unknown: { label: "Unknown", short: "UNK", chipClass: "bg-slate-50 text-slate-500 border-slate-200", badgeClass: "badge" },
};

function normalizeColumnName(column) {
  return String(column || "").trim().toLowerCase().replace(/[\s-]+/g, "_");
}

// Short keywords must match a whole "_" token (so "age" matches age_group but not language/page/package);
// longer ones can match as substrings (so "hired" still matches "HiredStatus").
function matchesKeyword(column, keywords) {
  const name = normalizeColumnName(column);
  const parts = name.split("_");
  return keywords.some((kw) => (kw.length >= 5 ? name.includes(kw) : parts.includes(kw)));
}

function isIdentifierColumn(column) {
  const name = normalizeColumnName(column);
  if (!name) return false;
  if (IDENTIFIER_EXACT.has(name)) return true;
  return name.split("_").some((part) => part === "id" || part === "uuid");
}

const getSuggested = (columns, keywords) =>
  columns.filter((c) => !isIdentifierColumn(c) && matchesKeyword(c, keywords));

const getTypeMeta = (type) => TYPE_META[type] || TYPE_META.unknown;

function ColumnDropdown({ value, onChange, options, suggestedOptions, placeholder, colMeta }) {
  const [open, setOpen] = useState(false);

  const suggestedSet = new Set(suggestedOptions);
  const otherOptions = options.filter((option) => !suggestedSet.has(option));
  const selectedMeta = value ? getTypeMeta(colMeta?.[value]?.type) : null;

  const pick = (column) => {
    onChange(column);
    setOpen(false);
  };

  return (
    <div className="relative z-[120] overflow-visible">
      {open && (
        <button
          type="button"
          aria-label="Close dropdown"
          className="fixed inset-0 z-[80] cursor-default bg-transparent"
          onClick={() => setOpen(false)}
        />
      )}

      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`relative z-[90] flex min-h-[54px] w-full items-center justify-between gap-3 rounded-2xl border bg-white px-4 text-left shadow-sm transition ${
          value || open ? "border-indigo-300 ring-4 ring-indigo-500/10" : "border-slate-200 hover:border-indigo-200"
        } cursor-pointer`}
      >
        <div className="flex min-w-0 flex-1 items-center gap-3">
          {value ? (
            <>
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-indigo-100 bg-indigo-50 text-indigo-700">
                <DashboardIcon />
              </div>
              <div className="min-w-0">
                <p className="truncate font-mono text-sm font-extrabold text-slate-950">{value}</p>
                {selectedMeta && <p className="mt-0.5 text-xs font-bold text-slate-400">{selectedMeta.label} column</p>}
              </div>
            </>
          ) : (
            <span className="text-sm font-semibold text-slate-400">{placeholder}</span>
          )}
        </div>

        <span className={`shrink-0 text-slate-400 transition ${open ? "rotate-180 text-indigo-600" : ""}`}>
          <ChevronDownIcon className="h-4 w-4" strokeWidth={2.6} />
        </span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="absolute left-0 right-0 top-[calc(100%+10px)] z-[999] max-h-[360px] overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15"
          >
            {suggestedOptions.length > 0 && (
              <div>
                <div className="flex items-center gap-2 border-b border-indigo-100 bg-indigo-50 px-4 py-2.5 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-indigo-700">
                  <SparkIcon className="h-4 w-4" />
                  Suggested
                </div>
                {suggestedOptions.map((column) => (
                  <DropdownItem key={column} column={column} isSelected={value === column} onSelect={() => pick(column)} colMeta={colMeta} />
                ))}
              </div>
            )}

            <div className="max-h-[250px] overflow-y-auto">
              {suggestedOptions.length > 0 && otherOptions.length > 0 && (
                <div className="border-b border-slate-100 px-4 py-2 text-[0.68rem] font-extrabold uppercase tracking-[0.12em] text-slate-400">
                  All columns
                </div>
              )}
              {otherOptions.map((column) => (
                <DropdownItem key={column} column={column} isSelected={value === column} onSelect={() => pick(column)} colMeta={colMeta} />
              ))}
              {options.length === 0 && (
                <div className="px-4 py-5 text-sm font-semibold text-slate-500">No selectable columns available.</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function DropdownItem({ column, isSelected, onSelect, colMeta }) {
  const typeMeta = getTypeMeta(colMeta?.[column]?.type);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition ${
        isSelected ? "border-indigo-500 bg-indigo-50" : "border-transparent hover:bg-slate-50"
      }`}
    >
      <span className={`shrink-0 rounded-lg border px-2 py-1 font-mono text-[0.65rem] font-extrabold ${typeMeta.chipClass}`}>
        {typeMeta.short}
      </span>
      <span className={`min-w-0 flex-1 truncate font-mono text-xs font-bold ${isSelected ? "text-indigo-700" : "text-slate-700"}`}>
        {column}
      </span>
      {isSelected && (
        <span className="shrink-0 text-indigo-600">
          <CheckIcon className="h-4 w-4" strokeWidth={2.8} />
        </span>
      )}
    </button>
  );
}

const TONES = {
  indigo: {
    icon: "bg-indigo-50 text-indigo-700 border-indigo-100",
    activeIcon: "bg-indigo-600 text-white shadow-indigo-500/25",
    panel: "from-indigo-50 via-white to-white",
    ring: "border-indigo-300 shadow-indigo-500/10",
  },
  violet: {
    icon: "bg-violet-50 text-violet-700 border-violet-100",
    activeIcon: "bg-violet-600 text-white shadow-violet-500/25",
    panel: "from-violet-50 via-white to-white",
    ring: "border-violet-300 shadow-violet-500/10",
  },
};

function MappingCard({ step, title, description, value, onChange, options, suggestedOptions, placeholder, colMeta, tone = "indigo", icon }) {
  const isComplete = Boolean(value);
  const toneClass = TONES[tone] || TONES.indigo;
  const selectedTypeMeta = value ? getTypeMeta(colMeta?.[value]?.type) : null;

  return (
    <motion.div
      layout
      style={{ overflow: "visible" }}
      className={`card card-hover overflow-visible ${isComplete ? toneClass.ring : ""}`}
    >
      <div className={`card-header bg-gradient-to-br ${isComplete ? toneClass.panel : "from-slate-50 to-white"}`}>
        <div className="flex items-start gap-4">
          <div
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-lg transition ${
              isComplete ? toneClass.activeIcon : toneClass.icon
            }`}
          >
            {isComplete ? <CheckIcon className="h-5 w-5" /> : icon}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="badge badge-primary">Field {step}</span>
              {isComplete && <span className="badge badge-success">Mapped</span>}
              {selectedTypeMeta && <span className={selectedTypeMeta.badgeClass}>{selectedTypeMeta.label}</span>}
            </div>
            <h2 className="mt-3 text-xl font-extrabold tracking-[-0.045em] text-slate-950">{title}</h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{description}</p>
          </div>
        </div>
      </div>

      <div className="card-body overflow-visible" style={{ overflow: "visible" }}>
        <label className="label">Select column</label>

        <ColumnDropdown
          value={value}
          onChange={onChange}
          options={options}
          suggestedOptions={suggestedOptions}
          placeholder={placeholder}
          colMeta={colMeta}
        />

        <AnimatePresence>
          {value && colMeta?.[value] && (
            <motion.div
              initial={{ opacity: 0, height: 0, marginTop: 0 }}
              animate={{ opacity: 1, height: "auto", marginTop: 16 }}
              exit={{ opacity: 0, height: 0, marginTop: 0 }}
              transition={{ duration: 0.22 }}
              className="overflow-hidden"
            >
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Sample values</p>
                  {/* colMeta only scans the first 250 rows, so this is a sample count, not the file's. */}
                  <span className="font-mono text-xs font-bold text-slate-400">{colMeta[value].total} unique in sample</span>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {(colMeta[value].values || []).map((sampleValue) => (
                    <span
                      key={String(sampleValue)}
                      className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 font-mono text-[0.72rem] font-bold text-slate-700 shadow-sm"
                    >
                      {String(sampleValue)}
                    </span>
                  ))}
                  {colMeta[value].total > 7 && (
                    <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.72rem] font-extrabold text-indigo-700">
                      +{colMeta[value].total - 7} more
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

function ReadinessPanel({ target, sensitive, rows }) {
  const ready = Boolean(target && sensitive);

  return (
    <div className={`callout ${ready ? "callout-success" : "callout-warning"}`}>
      <div
        className={`mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${
          ready ? "bg-emerald-500 text-white" : "bg-amber-100 text-amber-700"
        }`}
      >
        {ready ? <CheckIcon className="h-4 w-4" /> : <SparkIcon className="h-4 w-4" />}
      </div>

      <div>
        <p className="text-sm font-extrabold">{ready ? "Ready to run the analysis" : "Complete both mappings"}</p>
        <p className="mt-1 text-sm leading-6 text-slate-600">
          {ready ? (
            <>
              Target <span className="font-mono font-extrabold text-slate-950">{target}</span> will be compared across{" "}
              <span className="font-mono font-extrabold text-slate-950">{sensitive}</span> using{" "}
              {rows.length.toLocaleString()} records.
            </>
          ) : (
            "Select one outcome column and one sensitive attribute before continuing."
          )}
        </p>
      </div>
    </div>
  );
}

export default function ColumnSelector({ columns, rows, file, colMeta = {} }) {
  const [target, setTarget] = useState("");
  const [sensitive, setSensitive] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();

  const selectableColumns = useMemo(() => columns.filter((c) => !isIdentifierColumn(c)), [columns]);
  const suggestedTargets = useMemo(() => getSuggested(selectableColumns, TARGET_KEYWORDS), [selectableColumns]);
  const suggestedSensitive = useMemo(() => getSuggested(selectableColumns, SENSITIVE_KEYWORDS), [selectableColumns]);
  const sensitiveOptions = useMemo(() => selectableColumns.filter((c) => c !== target), [selectableColumns, target]);

  const bothSelected = Boolean(target && sensitive);

  const handleTargetChange = (column) => {
    setTarget(column);
    if (sensitive === column) setSensitive("");
  };

  const handleContinue = async () => {
    if (!bothSelected || loading) return;
    if (!file) {
      setError("The original file is no longer in memory (the page was reloaded). Go back and upload it again.");
      return;
    }

    // Identifier columns are excluded from the model too: a row id can correlate with the outcome
    // purely through file ordering. (The old code sent every column except target + sensitive.)
    const features = columns.filter((c) => c !== target && c !== sensitive && !isIdentifierColumn(c));
    if (features.length === 0) {
      setError("No feature columns left after removing the target, sensitive and identifier columns.");
      return;
    }

    setLoading(true);
    setError("");
    try {
      const data = await analyzeDataset({ file, target, sensitive, features });
      if (!data?.analysis_id) throw new Error("The API response had no analysis_id.");

      navigate("/dashboard", {
        state: { file, columns, rows, target, sensitive, analysisId: data.analysis_id, metrics: data },
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-5 overflow-visible">
      <div className="grid gap-5 overflow-visible xl:grid-cols-2">
        <MappingCard
          step="01"
          title="Target outcome column"
          description="Choose the final decision column, such as hired, approved, selected, status, or outcome. Identifier fields like candidate_id are excluded."
          value={target}
          onChange={handleTargetChange}
          options={selectableColumns}
          suggestedOptions={suggestedTargets}
          placeholder="Select outcome column..."
          colMeta={colMeta}
          tone="indigo"
          icon={<TargetIcon />}
        />

        <MappingCard
          step="02"
          title="Sensitive attribute"
          description="Choose the group attribute to compare across, such as gender, age group, ethnicity, department, race, or nationality. Identifier fields are excluded."
          value={sensitive}
          onChange={setSensitive}
          options={sensitiveOptions}
          suggestedOptions={suggestedSensitive.filter((c) => c !== target)}
          placeholder="Select sensitive attribute..."
          colMeta={colMeta}
          tone="violet"
          icon={<GroupIcon />}
        />
      </div>

      {columns.length !== selectableColumns.length && (
        <div className="callout callout-primary">
          <SparkIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <div>
            <p className="text-sm font-extrabold">Identifier columns excluded</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Columns like <span className="font-mono font-extrabold text-slate-950">candidate_id</span> or{" "}
              <span className="font-mono font-extrabold text-slate-950">user_id</span> can&apos;t be the outcome or the
              sensitive attribute, and are also left out of the model&apos;s features.
            </p>
          </div>
        </div>
      )}

      <ReadinessPanel target={target} sensitive={sensitive} rows={rows} />

      {error && (
        <div className="callout callout-danger">
          <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="text-sm font-bold">{error}</p>
        </div>
      )}

      <div className="card">
        <div className="card-body flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <div className="section-eyebrow">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse-glow" />
              Run the audit
            </div>
            <h3 className="mt-3 text-2xl font-extrabold tracking-[-0.05em] text-slate-950">Generate your fairness dashboard</h3>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">
              This sends your file to the audit API, trains a baseline model, and opens the dashboard with group
              selection rates, fairness gaps and mitigation options. Training can take a few seconds.
            </p>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!bothSelected || loading}
            className="btn btn-primary btn-lg min-w-full disabled:cursor-not-allowed disabled:opacity-50 sm:min-w-[260px]"
          >
            {loading ? (
              <>
                <Spinner className="h-5 w-5" />
                Training and auditing…
              </>
            ) : (
              <>
                <DashboardIcon />
                Run fairness analysis
                <ArrowRightIcon className="h-4 w-4" strokeWidth={2.6} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
