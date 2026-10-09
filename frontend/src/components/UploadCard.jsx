// UploadCard.jsx
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { AnimatePresence, motion } from "framer-motion";
import { AlertIcon, ArrowRightIcon, CheckIcon, ReportIcon, Spinner, UploadIcon, XIcon } from "./Icons";

const MAX_FILE_SIZE = 50 * 1024 * 1024;

const dropZoneMotion = {
  idle: { scale: 1 },
  dragging: { scale: 1.015 },
  ready: { scale: 1 },
  error: { scale: 1 },
};

const contentMotion = {
  initial: { opacity: 0, y: 10, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -8, scale: 0.98 },
  transition: { duration: 0.25, ease: [0.16, 1, 0.3, 1] },
};

function formatBytes(bytes) {
  if (!bytes && bytes !== 0) return "Unknown size";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

// meta.fields is the header row; it survives header-only files and doesn't depend on the first data row.
const headerFields = (result) => (result.meta?.fields ?? []).filter((f) => f && f.trim().length > 0);

export default function UploadCard() {
  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [parseInfo, setParseInfo] = useState(null);

  const inputRef = useRef(null);
  const navigate = useNavigate();

  const clearInput = () => {
    if (inputRef.current) inputRef.current.value = "";
  };

  const reject = (message) => {
    setFile(null);
    setParseInfo(null);
    setError(message);
    clearInput();
  };

  const clearFile = (event) => {
    event.stopPropagation();
    setFile(null);
    setError("");
    setParseInfo(null);
    clearInput();
  };

  const processFile = (selected) => {
    setError("");
    setParseInfo(null);
    if (!selected) return;

    // Extension only. The old check also accepted type "application/vnd.ms-excel", which is what a binary .xls reports.
    if (!/\.csv$/i.test(selected.name)) return reject("Please upload a valid .csv file.");
    if (selected.size > MAX_FILE_SIZE) return reject("This file is larger than 50 MB. Try a smaller CSV.");

    setFile(selected);

    // Preview only: just enough rows to read the header.
    Papa.parse(selected, {
      header: true,
      preview: 5,
      skipEmptyLines: true,
      complete: (result) => {
        const columns = headerFields(result);
        if (!columns.length) return reject("No usable columns were found. Check your CSV header row.");
        setParseInfo({ columns, previewRows: result.data?.length || 0 });
      },
      error: () => reject("Could not read the file preview. Please check the CSV format."),
    });
  };

  const handleDragOver = (event) => {
    event.preventDefault();
    setDragging(true);
  };

  const handleDragLeave = (event) => {
    event.preventDefault();
    setDragging(false);
  };

  const handleDrop = (event) => {
    event.preventDefault();
    setDragging(false);
    processFile(event.dataTransfer.files?.[0]);
  };

  const handleContinue = () => {
    if (!file || loading) return;

    setLoading(true);
    setError("");

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows = result.data || [];
        const columns = headerFields(result);

        if (!rows.length || !columns.length) {
          setError("The CSV appears empty or malformed.");
          setLoading(false);
          return;
        }

        // `file` travels with the rows: the dashboard flow uploads the original file to the API.
        navigate("/columns", { state: { file, columns, rows } });
      },
      error: () => {
        setError("Failed to parse the CSV. Please check the file format.");
        setLoading(false);
      },
    });
  };

  const zoneState = dragging ? "dragging" : error ? "error" : file ? "ready" : "idle";

  const zoneClass = {
    idle: "border-slate-300 bg-gradient-to-br from-slate-50 via-white to-indigo-50/60 hover:border-indigo-300 hover:shadow-lg hover:shadow-indigo-500/10",
    dragging: "border-indigo-500 bg-indigo-50 shadow-xl shadow-indigo-500/20",
    ready: "border-emerald-400 bg-gradient-to-br from-emerald-50 via-white to-indigo-50/60 shadow-xl shadow-emerald-500/10",
    error: "border-rose-400 bg-gradient-to-br from-rose-50 via-white to-amber-50 shadow-xl shadow-rose-500/10",
  };

  return (
    <div className="card card-glow">
      <div className="top-stripe" />

      <div className="card-header">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="section-eyebrow">
              <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse-glow" />
              Step 1 of 4
            </div>
            <h2 className="mt-4 text-2xl font-extrabold tracking-[-0.045em] text-slate-950">Upload dataset</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-slate-500">
              Start with a CSV containing historical decisions, outcomes, and demographic attributes.
            </p>
          </div>

          <div className="hidden rounded-2xl border border-indigo-100 bg-indigo-50 p-3 text-indigo-700 sm:flex">
            <UploadIcon className="h-5 w-5" strokeWidth={2.2} />
          </div>
        </div>
      </div>

      <div className="card-body space-y-5">
        <motion.div
          animate={zoneState}
          variants={dropZoneMotion}
          onClick={() => inputRef.current?.click()}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`relative flex min-h-[240px] cursor-pointer flex-col items-center justify-center overflow-hidden rounded-3xl border-2 border-dashed p-6 text-center transition-all duration-200 ${zoneClass[zoneState]}`}
        >
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-indigo-300/20 blur-2xl" />
          <div className="absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-emerald-300/20 blur-2xl" />

          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => processFile(event.target.files?.[0])}
          />

          <AnimatePresence mode="wait">
            {dragging && (
              <motion.div key="dragging" {...contentMotion} className="relative z-10 flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white shadow-xl shadow-indigo-500/30">
                  <UploadIcon className="h-7 w-7" strokeWidth={2.2} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold tracking-[-0.03em] text-indigo-700">Drop your CSV here</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">Release to attach the dataset.</p>
              </motion.div>
            )}

            {!dragging && file && (
              <motion.div key="ready" {...contentMotion} className="relative z-10 w-full">
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-xl shadow-emerald-500/25">
                  <CheckIcon strokeWidth={2.8} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold tracking-[-0.03em] text-slate-950">Dataset ready</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">Review the detected structure before continuing.</p>

                <div className="mt-5 rounded-2xl border border-slate-200 bg-white/90 p-4 text-left shadow-sm">
                  <div className="flex items-center gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-emerald-100 bg-emerald-50 text-emerald-700">
                      <ReportIcon className="h-6 w-6" strokeWidth={2.2} />
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-950">{file.name}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold text-slate-500">{formatBytes(file.size)}</span>
                        {parseInfo?.columns?.length > 0 && (
                          <span className="badge badge-success">{parseInfo.columns.length} columns</span>
                        )}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={clearFile}
                      className="icon-btn h-9 w-9 rounded-full hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove selected file"
                    >
                      <XIcon className="h-4 w-4" strokeWidth={2.8} />
                    </button>
                  </div>

                  {parseInfo?.columns?.length > 0 && (
                    <div className="mt-4">
                      <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Detected columns</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {parseInfo.columns.slice(0, 9).map((column) => (
                          <span
                            key={column}
                            className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 font-mono text-[0.7rem] font-bold text-slate-600"
                          >
                            {column}
                          </span>
                        ))}
                        {parseInfo.columns.length > 9 && (
                          <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2.5 py-1 text-[0.7rem] font-extrabold text-indigo-700">
                            +{parseInfo.columns.length - 9} more
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {!dragging && !file && error && (
              <motion.div key="error" {...contentMotion} className="relative z-10 flex flex-col items-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-rose-100 text-rose-600">
                  <AlertIcon className="h-6 w-6" strokeWidth={2.4} />
                </div>
                <h3 className="mt-5 text-lg font-extrabold tracking-[-0.03em] text-rose-700">Upload issue</h3>
                <p className="mt-2 max-w-xs text-sm font-semibold leading-6 text-slate-600">{error}</p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">Click to try again</p>
              </motion.div>
            )}

            {!dragging && !file && !error && (
              <motion.div key="idle" {...contentMotion} className="relative z-10 flex flex-col items-center">
                <div className="relative">
                  <div className="absolute inset-0 rounded-3xl bg-indigo-500/20 blur-xl" />
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-3xl border border-indigo-100 bg-white text-indigo-600 shadow-xl shadow-indigo-500/10">
                    <UploadIcon className="h-7 w-7" strokeWidth={2.2} />
                  </div>
                </div>
                <h3 className="mt-5 text-lg font-extrabold tracking-[-0.03em] text-slate-950">Drop your CSV here</h3>
                <p className="mt-2 text-sm font-semibold text-slate-500">
                  or{" "}
                  <span className="font-extrabold text-indigo-700 underline decoration-indigo-300 underline-offset-4">
                    browse files
                  </span>{" "}
                  from your computer
                </p>
                <p className="mt-3 text-xs font-bold uppercase tracking-wider text-slate-400">CSV only · Max 50 MB</p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="glass-card p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">File type</p>
            <p className="mt-1 text-sm font-extrabold text-slate-950">CSV</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Limit</p>
            <p className="mt-1 text-sm font-extrabold text-slate-950">50 MB</p>
          </div>
          <div className="glass-card p-4">
            <p className="text-xs font-extrabold uppercase tracking-wider text-slate-400">Upload</p>
            <p className="mt-1 text-sm font-extrabold text-indigo-700">On analysis</p>
          </div>
        </div>

        <div className="callout callout-primary">
          <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-indigo-500 animate-pulse-glow" />
          <div>
            <p className="text-sm font-extrabold">What should your CSV include?</p>
            <p className="mt-1 text-sm leading-6 text-slate-600">
              Ideally one outcome column, one or more sensitive attributes, and the features used during selection.
            </p>
          </div>
        </div>

        {error && file && (
          <div className="callout callout-danger">
            <AlertIcon className="mt-0.5 h-5 w-5 shrink-0" strokeWidth={2.4} />
            <p className="text-sm font-bold">{error}</p>
          </div>
        )}

        <button
          type="button"
          onClick={handleContinue}
          disabled={!file || loading}
          className="btn btn-primary btn-lg w-full disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <>
              <Spinner className="h-5 w-5" />
              Preparing dataset...
            </>
          ) : (
            <>
              Continue to column mapping
              <ArrowRightIcon className="h-4 w-4" strokeWidth={2.6} />
            </>
          )}
        </button>
      </div>

      <div className="card-footer flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-slate-500">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
            <CheckIcon className="h-4 w-4" strokeWidth={2.8} />
          </span>
          Previewed in your browser; sent to the audit API when you run the analysis
        </div>
        <span className="badge badge-info">API connected</span>
      </div>
    </div>
  );
}
