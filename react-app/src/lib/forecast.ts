// Demonstration forecasting engine (simulated ensemble of ARIMA / XGBoost / Prophet-style components).

export type Medicine = {
  id: string;
  name: string;
  category: string;
  base: number; // baseline daily units
  seasonAmp: number; // seasonal amplitude (fraction)
  seasonPeak: number; // day-of-year of peak
  trend: number; // daily growth fraction
  stock: number; // current stock units
};

export const MEDICINES: Medicine[] = [
  { id: "act", name: "Artemether-Lumefantrine", category: "Antimalarial", base: 120, seasonAmp: 0.45, seasonPeak: 220, trend: 0.0008, stock: 2900 },
  { id: "amox", name: "Amoxicillin 500mg", category: "Antibiotic", base: 210, seasonAmp: 0.18, seasonPeak: 20, trend: 0.0022, stock: 6100 },
  { id: "ors", name: "ORS Sachets", category: "Rehydration", base: 340, seasonAmp: 0.3, seasonPeak: 190, trend: 0.0004, stock: 9800 },
  { id: "para", name: "Paracetamol 500mg", category: "Analgesic", base: 520, seasonAmp: 0.12, seasonPeak: 350, trend: 0.0003, stock: 18500 },
];

export type Scenario = { id: string; label: string; description: string; medicineBoost: Record<string, number> };

export const SCENARIOS: Scenario[] = [
  { id: "none", label: "Baseline", description: "No disruption assumed.", medicineBoost: {} },
  { id: "malaria", label: "Seasonal malaria surge", description: "Monsoon-driven malaria cases rise above typical seasonality.", medicineBoost: { act: 0.4, para: 0.12 } },
  { id: "abx", label: "Rising antibiotic need", description: "Respiratory infections push antibiotic prescriptions upward.", medicineBoost: { amox: 0.35, para: 0.08 } },
  { id: "outbreak", label: "Outbreak response", description: "Hypothetical diarrhoeal outbreak in the district.", medicineBoost: { ors: 0.8, amox: 0.15, para: 0.15 } },
];

function rng(seed: number) {
  return () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
}

const HISTORY = 60;
const TODAY_DOY = 200;

function seasonal(m: Medicine, doy: number) {
  return m.base * m.seasonAmp * Math.cos(((doy - m.seasonPeak) / 365) * 2 * Math.PI);
}

export function history(m: Medicine) {
  const r = rng(m.id.charCodeAt(0) * 97 + m.base);
  return Array.from({ length: HISTORY }, (_, i) => {
    const t = i - HISTORY;
    const doy = (TODAY_DOY + t + 365) % 365;
    const v = m.base * (1 + m.trend * t) + seasonal(m, doy) + (r() - 0.5) * m.base * 0.25;
    return { day: t, actual: Math.max(0, Math.round(v)) };
  });
}

export type ForecastPoint = { day: number; baseline: number; seasonal: number; trend: number; context: number; forecast: number; lower: number; upper: number };

export function forecast(m: Medicine, scenarioId: string, horizon = 30, intensity = 1): ForecastPoint[] {
  const boost = (SCENARIOS.find((s) => s.id === scenarioId)?.medicineBoost[m.id] ?? 0) * intensity;
  return Array.from({ length: horizon }, (_, i) => {
    const d = i + 1;
    const baseline = m.base;
    const s = seasonal(m, (TODAY_DOY + d) % 365);
    const tr = m.base * m.trend * d;
    const ramp = Math.min(1, d / 7);
    const ctx = (baseline + s + tr) * boost * ramp;
    const f = baseline + s + tr + ctx;
    const spread = f * (0.08 + 0.006 * d) * (1 + boost * 0.5);
    return { day: d, baseline, seasonal: s, trend: tr, context: ctx, forecast: f, lower: Math.max(0, f - spread), upper: f + spread };
  });
}

/** First day on which cumulative forecast demand exceeds stock, or null. */
export function daysToStockout(stock: number, daily: number[]): number | null {
  let left = stock;
  for (let i = 0; i < daily.length; i++) {
    left -= daily[i] ?? 0;
    if (left < 0) return i + 1;
  }
  return null;
}

export function holdoutMetrics(m: Medicine) {
  const h = history(m).slice(-30);
  let ae = 0, ape = 0, se = 0;
  h.forEach(({ day, actual }) => {
    const doy = (TODAY_DOY + day + 365) % 365;
    const pred = m.base * (1 + m.trend * day) + seasonal(m, doy);
    ae += Math.abs(actual - pred);
    se += (actual - pred) ** 2;
    ape += Math.abs(actual - pred) / Math.max(1, actual);
  });
  return { mae: ae / h.length, rmse: Math.sqrt(se / h.length), mape: (ape / h.length) * 100 };
}
