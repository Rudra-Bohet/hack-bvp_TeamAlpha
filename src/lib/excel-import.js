// Maps arbitrary spreadsheet headers to medicine stock fields.

export const FIELDS = ["name", "category", "stock", "daily_usage", "expiry_date"];

export const FIELD_LABELS = {
  name: "Medicine name",
  category: "Category",
  stock: "Stock",
  daily_usage: "Daily usage",
  expiry_date: "Expiry date",
};

const ALIASES = {
  name: ["name", "medicine", "medicine name", "drug", "item", "product", "item name"],
  category: ["category", "type", "class", "group"],
  stock: ["stock", "quantity", "qty", "units", "on hand", "current stock", "balance"],
  daily_usage: ["daily usage", "usage", "daily", "consumption", "avg daily", "per day", "daily demand"],
  expiry_date: ["expiry", "expiry date", "exp", "exp date", "expires"],
};

const norm = (s) => s.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();

export function detectColumns(headers) {
  const map = {};
  for (const key of Object.keys(ALIASES)) {
    const hit =
      headers.find((h) => ALIASES[key].includes(norm(h))) ??
      headers.find((h) => ALIASES[key].some((a) => norm(h).includes(a)));
    if (hit && !Object.values(map).includes(hit)) map[key] = hit;
  }
  return map;
}

const num = (v) => {
  const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
};

function toDate(v) {
  if (v == null || v === "") return null;
  if (typeof v === "number") return new Date(Math.round((v - 25569) * 86400000)).toISOString().slice(0, 10);
  const d = new Date(String(v));
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

export function mapRows(rows, map) {
  const used = new Set(Object.values(map));
  return rows
    .map((r) => ({
      name: String(map.name ? r[map.name] ?? "" : "").trim(),
      category: String(map.category ? r[map.category] ?? "" : "").trim(),
      stock: num(map.stock ? r[map.stock] : 0),
      daily_usage: num(map.daily_usage ? r[map.daily_usage] : 0),
      expiry_date: toDate(map.expiry_date ? r[map.expiry_date] : null),
      extra: Object.fromEntries(Object.entries(r).filter(([k]) => !used.has(k))),
    }))
    .filter((r) => r.name);
}
