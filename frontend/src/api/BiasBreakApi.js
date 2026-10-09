// All backend calls live here. Endpoints and payloads match what the FastAPI backend
// already accepts: POST /analyze/ (multipart), POST /mitigate/ (json), POST /report/ (json).
// Keep the trailing slashes: FastAPI redirects without them, and a redirected POST loses CORS headers.

const API_URL = (import.meta.env.VITE_API_URL || "http://localhost:8000").replace(/\/$/, "");

async function parseResponse(res, fallback) {
  let data = null;
  try {
    data = await res.json();
  } catch {
    // non-JSON error body (proxy error page, 500 traceback, ...)
  }

  if (!res.ok) {
    // FastAPI sends `detail` as a string for HTTPException but as an ARRAY of
    // {loc, msg, type} objects for 422 validation errors. `new Error(array)` prints "[object Object]".
    const detail = data?.detail;
    const message =
      typeof detail === "string"
        ? detail
        : Array.isArray(detail)
        ? detail.map((d) => d.msg).join("; ")
        : fallback;
    throw new Error(message || fallback);
  }

  return data;
}

async function request(path, options, fallback) {
  let res;
  try {
    res = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(`Cannot reach the API at ${API_URL}. Is the backend running and is CORS enabled for this origin?`);
  }
  return parseResponse(res, fallback);
}

export function analyzeDataset({ file, target, sensitive, features }) {
  const body = new FormData();
  body.append("file", file);
  body.append("target_column", target);
  body.append("sensitive_column", sensitive);
  // The backend takes a comma-separated string, so column names containing commas will break it.
  body.append("feature_columns", features.join(","));
  return request("/analyze/", { method: "POST", body }, "Analysis failed");
}

export function runMitigation({ analysisId, method, featureToRemove }) {
  const payload = { analysis_id: analysisId, method };
  if (method === "feature_removal") payload.params = { feature_to_remove: featureToRemove };

  return request(
    "/mitigate/",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
    "Mitigation failed"
  );
}

// Dedupes in-flight requests: React StrictMode runs effects twice in dev, and /report/ is the
// expensive call (it generates the written report). Same analysis id -> one request.
const inflightReports = new Map();

export function fetchReport(analysisId) {
  if (!inflightReports.has(analysisId)) {
    const promise = request(
      "/report/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysisId, include_mitigation: true }),
      },
      "Failed to generate report"
    ).finally(() => inflightReports.delete(analysisId));
    inflightReports.set(analysisId, promise);
  }
  return inflightReports.get(analysisId);
}