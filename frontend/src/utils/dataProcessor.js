// Buckets a numeric "sensitive" column (e.g. age) into readable ranges for the DASHBOARD FALLBACK only.
// The backend always receives the raw file, so its group_metrics use the raw values.

const NUMERIC_SAMPLE = 100;
const SMALL_CARDINALITY = 8;

// "age" as a word: matches age, age_group, candidate_age; not language, page, wage, image, message.
const AGE_RE = /(^|[^a-z])age([^a-z]|$)/i;

const isBlank = (v) => v === "" || v === null || v === undefined || (typeof v === "string" && v.trim() === "");

function chooseBucketSize(colName, range) {
  if (AGE_RE.test(colName)) return range > 30 ? 3 : 2;
  if (range <= 10) return 2;
  if (range <= 50) return 5;
  if (range <= 100) return 10;
  if (range <= 500) return 50;
  if (range <= 1000) return 100;
  return Math.ceil(range / 10);
}

const fmt = (n) => Number(n.toFixed(2));

export const processRows = (rows, sensitiveCol) => {
  if (!rows?.length || !sensitiveCol) return rows;

  // 1. Numeric check on up to 100 NON-blank values (the old loop spent its budget on blanks).
  let checked = 0;
  for (let i = 0; i < rows.length && checked < NUMERIC_SAMPLE; i++) {
    const v = rows[i][sensitiveCol];
    if (isBlank(v)) continue;
    if (Number.isNaN(Number(v))) return rows;
    checked++;
  }
  if (checked === 0) return rows;

  // 2. Collect numeric values. Blanks are skipped: Number("") is 0, which the old code
  //    treated as a real value (dragging min to 0 and bucketing blanks into "0-9").
  const values = [];
  let min = Infinity;
  let max = -Infinity;
  let allInt = true;
  for (const r of rows) {
    const v = r[sensitiveCol];
    if (isBlank(v)) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    values.push(n);
    if (n < min) min = n;
    if (n > max) max = n;
    if (!Number.isInteger(n)) allInt = false;
  }
  if (values.length === 0) return rows;

  const name = sensitiveCol.toLowerCase();
  if (name.includes("experience") || new Set(values).size <= SMALL_CARDINALITY) return rows;

  // Loop-based min/max: Math.min(...values) throws RangeError past ~100k elements.
  const range = max - min;
  if (range === 0) return rows;

  const size = chooseBucketSize(name, range);

  return rows.map((row) => {
    const v = row[sensitiveCol];
    if (isBlank(v)) return row;
    const n = Number(v);
    if (!Number.isFinite(n)) return row;

    const start = Math.floor(n / size) * size;
    // Integers: "20-22". Decimals: half-open "2.5–4" so 3.5 is not labelled "2-4".
    const label = allInt ? `${start}-${start + size - 1}` : `${fmt(start)}–${fmt(start + size)}`;
    return { ...row, [sensitiveCol]: label };
  });
};