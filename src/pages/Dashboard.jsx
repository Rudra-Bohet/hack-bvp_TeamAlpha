import { useMemo, useState } from "react";
import { Area, Bar, BarChart, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import PageHeading from "../components/PageHeading.jsx";
import { useStock } from "../context/StockContext.jsx";
import {
  MEDICINES,
  SCENARIOS,
  EMPTY_MEDICINE,
  daysToStockout,
  forecast,
  history,
  holdoutMetrics,
  guestMedicines,
  fmt,
} from "../lib/forecast.js";

export default function Dashboard() {
  const { guest } = useStock();
  const medicines = useMemo(() => guestMedicines(guest), [guest]);
  const [medId, setMedId] = useState(MEDICINES[0].id);
  const [scenario, setScenario] = useState("none");
  const [intensity, setIntensity] = useState(1);
  const [horizon, setHorizon] = useState(30);
  const med = medicines.find((m) => m.id === medId) ?? medicines[0] ?? EMPTY_MEDICINE;

  const hist = useMemo(() => history(med).slice(-60), [med]);
  const fc = useMemo(() => forecast(med, scenario, horizon, intensity), [med, scenario, horizon, intensity]);
  const base = useMemo(() => forecast(med, "none", horizon), [med, horizon]);
  const metrics = useMemo(() => holdoutMetrics(med), [med]);

  const chart = [
    ...hist.map((h) => ({ day: h.day, actual: h.actual })),
    ...fc.map((f, i) => ({
      day: f.day,
      forecast: Math.round(f.forecast),
      baseline: Math.round(base[i]?.forecast ?? 0),
      band: [Math.round(f.lower), Math.round(f.upper)],
    })),
  ];
  const total = fc.reduce((s, f) => s + f.forecast, 0);
  const stockout = daysToStockout(med.stock, fc.map((f) => f.forecast));
  const stockoutHigh = daysToStockout(med.stock, fc.map((f) => f.upper));
  const comp = fc
    .filter((_, i) => i % 3 === 2)
    .map((f) => ({
      day: `D+${f.day}`,
      Baseline: Math.round(f.baseline),
      Seasonal: Math.round(f.seasonal),
      Trend: Math.round(f.trend),
      Context: Math.round(f.context),
    }));
  const avg = (k) => fc.reduce((s, f) => s + f[k], 0) / fc.length;
  const riskClass = stockout ? "is-danger" : stockoutHigh ? "is-warning" : "is-success";

  return (
    <>
      <PageHeading
        eyebrow="Plan ahead with confidence"
        title="Demand forecast"
        description="A clear outlook for essential medicines, with the reasons behind every number."
      />
      <div className="side-layout">
        <aside className="stack-lg">
          <section>
            <h4 className="side-caption">Medicine</h4>
            <div className="stack-sm">
              {medicines.length === 0 && <p className="muted small">No medicines</p>}
              {medicines.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setMedId(m.id)}
                  className={`choice ${m.id === med.id ? "is-selected" : ""}`}
                >
                  <span className="choice-title">{m.name}</span>
                  <span className="choice-sub">
                    {m.category} · {fmt(m.stock)} in stock
                  </span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <h4 className="side-caption">What-if scenario</h4>
            <div className="stack-sm">
              {SCENARIOS.map((s) => (
                <button
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`choice ${s.id === scenario ? "is-selected" : ""}`}
                >
                  <span className="choice-title">{s.label}</span>
                  <span className="choice-sub">{s.description}</span>
                </button>
              ))}
            </div>
          </section>
          <section className="card stack-md">
            <label className="range">
              <span className="range-head">
                <span>Scenario intensity</span>
                <span className="mono">{intensity.toFixed(1)}×</span>
              </span>
              <input
                type="range"
                min={0}
                max={2}
                step={0.1}
                value={intensity}
                disabled={scenario === "none"}
                onChange={(e) => setIntensity(Number(e.target.value))}
              />
            </label>
            <label className="range">
              <span className="range-head">
                <span>Horizon</span>
                <span className="mono">{horizon} days</span>
              </span>
              <input
                type="range"
                min={7}
                max={90}
                step={1}
                value={horizon}
                onChange={(e) => setHorizon(Number(e.target.value))}
              />
            </label>
          </section>
        </aside>

        <div className="stack-lg min-w-0">
          <div className="stat-grid">
            <Stat label={`Demand next ${horizon}d`} value={fmt(total)} sub="units (ensemble)" />
            <Stat label="Current stock" value={fmt(med.stock)} sub="units on hand" />
            <div className={`card stat-card risk-card ${riskClass}`}>
              <div className="stat-label">
                {stockout ? <AlertTriangle className="icon-danger" /> : <CheckCircle2 className="icon-success" />}
                Stockout risk
              </div>
              <div className="stat-value">
                {stockout ? `Day ${stockout}` : stockoutHigh ? `Possible D${stockoutHigh}` : "Covered"}
              </div>
              <div className="stat-sub">
                {stockout ? "expected forecast" : stockoutHigh ? "at upper bound" : `through ${horizon} days`}
              </div>
            </div>
            <Stat
              label="Suggested reorder"
              value={fmt(Math.max(0, fc.reduce((s, f) => s + f.upper, 0) - med.stock))}
              sub="to cover upper bound"
            />
          </div>

          <Card title="Demand forecast" subtitle="Last 60 days actual · forecast with 80% confidence band">
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => (d > 0 ? `+${d}` : `${d}`)} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area dataKey="band" name="Confidence" fill="var(--chart-1)" fillOpacity={0.15} stroke="none" />
                <Line dataKey="actual" name="Actual" stroke="var(--chart-5)" dot={false} strokeWidth={1.5} />
                {scenario !== "none" && (
                  <Line dataKey="baseline" name="No-scenario" stroke="var(--chart-5)" strokeDasharray="4 4" dot={false} />
                )}
                <Line dataKey="forecast" name="Forecast" stroke="var(--chart-1)" dot={false} strokeWidth={2.5} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <div className="drivers-grid">
            <Card title="Why this forecast?" subtitle="Component-wise breakdown of daily demand">
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={comp}>
                  <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                  <XAxis dataKey="day" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Baseline" stackId="a" fill="var(--chart-1)" />
                  <Bar dataKey="Seasonal" stackId="a" fill="var(--chart-2)" />
                  <Bar dataKey="Trend" stackId="a" fill="var(--chart-3)" />
                  <Bar dataKey="Context" stackId="a" fill="var(--chart-4)" />
                </BarChart>
              </ResponsiveContainer>
            </Card>
            <Card title="Average daily drivers">
              <ul className="driver-list">
                <Driver label="Baseline demand" v={avg("baseline")} note="Long-run level" />
                <Driver label="Seasonal effect" v={avg("seasonal")} note="Calendar pattern" />
                <Driver label="Trend" v={avg("trend")} note="Growth over time" />
                <Driver label="Context signal" v={avg("context")} note="Scenario features" />
              </ul>
            </Card>
          </div>

          <Card title="Holdout evaluation" subtitle="Last 30 days of history held out and compared against model predictions">
            <div className="stat-grid three">
              <Stat label="MAE" value={metrics.mae.toFixed(1)} sub="units/day" />
              <Stat label="RMSE" value={metrics.rmse.toFixed(1)} sub="units/day" />
              <Stat label="MAPE" value={`${metrics.mape.toFixed(1)}%`} sub="mean abs. % error" />
            </div>
            <p className="footnote">
              <Activity />
              Metrics are computed on demonstration data. Real-world reductions in stockouts or waste
              require deployment and measured validation. Forecasts support — not replace —
              professional judgement.
            </p>
          </Card>

          <footer className="center muted small">PS-6 · Health &amp; Well-being · SDG 3 · SDG 9 · SDG 12</footer>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value, sub }) {
  return (
    <div className="card stat-card">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      <div className="stat-sub">{sub}</div>
    </div>
  );
}

function Card({ title, subtitle, children }) {
  return (
    <section className="card">
      <h3 className="card-title">{title}</h3>
      <p className="card-subtitle">{subtitle}</p>
      {children}
    </section>
  );
}

function Driver({ label, v, note }) {
  return (
    <li>
      <div>
        <div className="strong">{label}</div>
        <div className="muted small">{note}</div>
      </div>
      <span className={`mono ${v < 0 ? "text-danger" : ""}`}>
        {v >= 0 ? "+" : ""}
        {fmt(v)}
      </span>
    </li>
  );
}
