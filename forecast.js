const MEDICINES = [
  {
    id: "act",
    name: "Artemether-Lumefantrine",
    base: 120,
    amp: 0.45,
    peak: 220,
    trend: 0.0008,
    stock: 2900,
  },
  {
    id: "amox",
    name: "Amoxicillin 500mg",
    base: 210,
    amp: 0.18,
    peak: 20,
    trend: 0.0022,
    stock: 6100,
  },
  {
    id: "ors",
    name: "ORS Sachets",
    base: 340,
    amp: 0.3,
    peak: 190,
    trend: 0.0004,
    stock: 9800,
  },
  {
    id: "para",
    name: "Paracetamol 500mg",
    base: 520,
    amp: 0.12,
    peak: 350,
    trend: 0.0003,
    stock: 18500,
  },
];
const SCENARIOS = [
  { id: "none", label: "Baseline", boost: {} },
  {
    id: "malaria",
    label: "Seasonal malaria surge",
    boost: { act: 0.4, para: 0.12 },
  },
  {
    id: "abx",
    label: "Rising antibiotic need",
    boost: { amox: 0.35, para: 0.08 },
  },
  {
    id: "outbreak",
    label: "Outbreak response",
    boost: { ors: 0.8, amox: 0.15, para: 0.15 },
  },
];
const TODAY = 200;
const seasonal = (m, d) =>
  m.base * m.amp * Math.cos(((d - m.peak) / 365) * 2 * Math.PI);
function rng(seed) {
  return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
}
function pastDemand(m) {
  const r = rng(m.id.charCodeAt(0) * 97 + m.base);
  return Array.from({ length: 60 }, (_, i) => {
    const t = i - 60;
    const v =
      m.base * (1 + m.trend * t) +
      seasonal(m, (TODAY + t + 365) % 365) +
      (r() - 0.5) * m.base * 0.25;
    return { day: t, v: Math.max(0, Math.round(v)) };
  });
}
function forecast(m, scen, h) {
  const b = SCENARIOS.find((s) => s.id === scen).boost[m.id] || 0;
  return Array.from({ length: h }, (_, i) => {
    const d = i + 1,
      base = m.base + seasonal(m, (TODAY + d) % 365) + m.base * m.trend * d;
    const f = base + base * b * Math.min(1, d / 7),
      sp = f * (0.08 + 0.006 * d) * (1 + b * 0.5);
    return { day: d, f, lo: Math.max(0, f - sp), hi: f + sp };
  });
}
function stockoutDay(stock, daily) {
  let l = stock;
  for (let i = 0; i < daily.length; i++) {
    l -= daily[i];
    if (l < 0) return i + 1;
  }
  return null;
}
