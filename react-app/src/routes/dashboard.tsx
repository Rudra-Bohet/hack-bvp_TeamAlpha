import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, CheckCircle2, Activity } from "lucide-react";
import { Slider } from "@/components/ui/slider";
import { AppHeader } from "@/components/AppHeader";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { guestMedicines, useStock } from "@/hooks/use-stock";
import {
  MEDICINES,
  SCENARIOS,
  daysToStockout,
  forecast,
  history,
  holdoutMetrics,
} from "@/lib/forecast";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Stockout Shield — Explainable Medicine Demand Forecasting" },
      {
        name: "description",
        content:
          "Forecast medicine demand 30 days ahead with explainable components, confidence intervals and what-if scenarios.",
      },
      {
        property: "og:title",
        content: "Stockout Shield — Explainable Medicine Demand Forecasting",
      },
      {
        property: "og:description",
        content:
          "Explainable 30-day medicine demand forecasts and scenario analysis for resilient supply chains.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

const fmt = (n: number) => Math.round(n).toLocaleString();

function Index() {
  const { guest } = useStock();
  const medicines = guestMedicines(guest);
  const [medId, setMedId] = useState(MEDICINES[0]?.id ?? "");
  const [scenario, setScenario] = useState("none");
  const [intensity, setIntensity] = useState(1);
  const [horizon, setHorizon] = useState(30);
  const med = medicines.find((m) => m.id === medId) ??
    medicines[0] ?? {
      id: "empty",
      name: "No medicines",
      category: "",
      base: 0,
      stock: 0,
      seasonAmp: 0.45,
      seasonPeak: 220,
      trend: 0.0008,
    };

  const hist = useMemo(() => history(med).slice(-60), [med]);
  const fc = useMemo(
    () => forecast(med, scenario, horizon, intensity),
    [med, scenario, horizon, intensity],
  );
  const base = useMemo(() => forecast(med, "none", horizon), [med, horizon]);
  const metrics = useMemo(() => holdoutMetrics(med), [med]);

  const chart = [
    ...hist.map((h) => ({ day: h.day, actual: h.actual })),
    ...fc.map((f, i) => ({
      day: f.day,
      forecast: f.forecast,
      baseline: base[i]?.forecast ?? 0,
      band: [f.lower, f.upper],
    })),
  ];
  const total = fc.reduce((s, f) => s + f.forecast, 0);
  const stockout = daysToStockout(
    med.stock,
    fc.map((f) => f.forecast),
  );
  const stockoutHigh = daysToStockout(
    med.stock,
    fc.map((f) => f.upper),
  );
  const comp = fc
    .filter((_, i) => i % 3 === 2)
    .map((f) => ({
      day: `D+${f.day}`,
      Baseline: Math.round(f.baseline),
      Seasonal: Math.round(f.seasonal),
      Trend: Math.round(f.trend),
      Context: Math.round(f.context),
    }));
  const avg = (k: "baseline" | "seasonal" | "trend" | "context") =>
    fc.reduce((s, f) => s + f[k], 0) / fc.length;

  return (
    <div className="min-h-screen">
      <AppHeader active="/dashboard" />

      <main className="forecast-layout mx-auto grid max-w-7xl gap-6 px-6 py-8 xl:grid-cols-[235px_minmax(0,1fr)]">
        <div className="xl:col-span-2">
          <PageHeading
            eyebrow="Plan ahead with confidence"
            title="Demand forecast"
            description="A clear outlook for essential medicines, with the reasons behind every number."
          />
        </div>
        <aside className="space-y-6">
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Medicine
            </h2>
            <div className="space-y-2">
              {medicines.length === 0 && (
                <p className="text-sm text-muted-foreground">No medicines</p>
              )}
              {medicines.map((m) => (
                <Button
                  variant="ghost"
                  key={m.id}
                  onClick={() => setMedId(m.id)}
                  className={`h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-md border p-3 text-left transition ${m.id === med.id ? "border-primary bg-secondary" : "bg-card hover:bg-muted"}`}
                >
                  <div className="text-sm font-medium">{m.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {m.category} · {fmt(m.stock)} in stock
                  </div>
                </Button>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              What-if scenario
            </h2>
            <div className="space-y-2">
              {SCENARIOS.map((s) => (
                <Button
                  variant="ghost"
                  key={s.id}
                  onClick={() => setScenario(s.id)}
                  className={`h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-md border p-3 text-left transition ${s.id === scenario ? "border-primary bg-secondary" : "bg-card hover:bg-muted"}`}
                >
                  <div className="text-sm font-medium">{s.label}</div>
                  <div className="text-xs text-muted-foreground">{s.description}</div>
                </Button>
              ))}
            </div>
          </section>
          <section className="space-y-4 rounded-md border bg-card p-4">
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span>Scenario intensity</span>
                <span className="font-mono">{intensity.toFixed(1)}×</span>
              </div>
              <Slider
                min={0}
                max={2}
                step={0.1}
                value={[intensity]}
                onValueChange={(v) => setIntensity(v[0] ?? 1)}
                disabled={scenario === "none"}
              />
            </div>
            <div>
              <div className="mb-2 flex justify-between text-xs">
                <span>Horizon</span>
                <span className="font-mono">{horizon} days</span>
              </div>
              <Slider
                min={7}
                max={90}
                step={1}
                value={[horizon]}
                onValueChange={(v) => setHorizon(v[0] ?? 30)}
              />
            </div>
          </section>
        </aside>

        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-4">
            <Stat label={`Demand next ${horizon}d`} value={fmt(total)} sub="units (ensemble)" />
            <Stat label="Current stock" value={fmt(med.stock)} sub="units on hand" />
            <div
              className={`rounded-lg border p-4 ${stockout ? "border-destructive bg-destructive/10" : stockoutHigh ? "border-warning bg-warning/15" : "border-success bg-success/10"}`}
            >
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {stockout ? (
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 text-success" />
                )}{" "}
                Stockout risk
              </div>
              <div className="mt-1 font-display text-2xl font-bold">
                {stockout
                  ? `Day ${stockout}`
                  : stockoutHigh
                    ? `Possible D${stockoutHigh}`
                    : "Covered"}
              </div>
              <div className="text-xs text-muted-foreground">
                {stockout
                  ? "expected forecast"
                  : stockoutHigh
                    ? "at upper bound"
                    : `through ${horizon} days`}
              </div>
            </div>
            <Stat
              label="Suggested reorder"
              value={fmt(Math.max(0, fc.reduce((s, f) => s + f.upper, 0) - med.stock))}
              sub="to cover upper bound"
            />
          </div>

          <Card
            title="Demand forecast"
            subtitle="Last 60 days actual · forecast with 80% confidence band"
          >
            <ResponsiveContainer width="100%" height={320}>
              <ComposedChart data={chart}>
                <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fontSize: 11 }}
                  tickFormatter={(d) => (d > 0 ? `+${d}` : `${d}`)}
                />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  dataKey="band"
                  name="Confidence"
                  fill="var(--chart-1)"
                  fillOpacity={0.15}
                  stroke="none"
                />
                <Line
                  dataKey="actual"
                  name="Actual"
                  stroke="var(--chart-5)"
                  dot={false}
                  strokeWidth={1.5}
                />
                {scenario !== "none" && (
                  <Line
                    dataKey="baseline"
                    name="No-scenario"
                    stroke="var(--chart-5)"
                    strokeDasharray="4 4"
                    dot={false}
                  />
                )}
                <Line
                  dataKey="forecast"
                  name="Forecast"
                  stroke="var(--chart-1)"
                  dot={false}
                  strokeWidth={2.5}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid gap-6 2xl:grid-cols-[minmax(0,1fr)_260px]">
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
              <ul className="space-y-3 text-sm">
                <Driver label="Baseline demand" v={avg("baseline")} note="Long-run level (ARIMA)" />
                <Driver
                  label="Seasonal effect"
                  v={avg("seasonal")}
                  note="Calendar pattern (Prophet)"
                />
                <Driver label="Trend" v={avg("trend")} note="Growth over time (Prophet)" />
                <Driver
                  label="Context signal"
                  v={avg("context")}
                  note="Scenario features (XGBoost)"
                />
              </ul>
            </Card>
          </div>

          <Card
            title="Holdout evaluation"
            subtitle="Last 30 days of history held out and compared against model predictions"
          >
            <div className="grid grid-cols-3 gap-4">
              <Stat label="MAE" value={metrics.mae.toFixed(1)} sub="units/day" />
              <Stat label="RMSE" value={metrics.rmse.toFixed(1)} sub="units/day" />
              <Stat label="MAPE" value={`${metrics.mape.toFixed(1)}%`} sub="mean abs. % error" />
            </div>
            <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
              <Activity className="mt-0.5 h-4 w-4 shrink-0" />
              Metrics are computed on demonstration data. Real-world reductions in stockouts or
              waste require deployment and measured validation. Forecasts support — not replace —
              professional judgement.
            </p>
          </Card>

          <footer className="pb-4 text-center text-xs text-muted-foreground">
            PS-6 · Health & Well-being · SDG 3 · SDG 9 · SDG 12
          </footer>
        </div>
      </main>
    </div>
  );
}

function Stat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-2xl font-bold">{value}</div>
      <div className="text-xs text-muted-foreground">{sub}</div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-lg border bg-card p-5">
      <h2 className="font-semibold">{title}</h2>
      {subtitle && <p className="mb-4 text-xs text-muted-foreground">{subtitle}</p>}
      {!subtitle && <div className="mb-4" />}
      {children}
    </section>
  );
}

function Driver({ label, v, note }: { label: string; v: number; note: string }) {
  return (
    <li className="flex items-start justify-between gap-2 border-b pb-2 last:border-0">
      <div>
        <div className="font-medium">{label}</div>
        <div className="text-xs text-muted-foreground">{note}</div>
      </div>
      <span className={`font-mono ${v < 0 ? "text-destructive" : ""}`}>
        {v >= 0 ? "+" : ""}
        {fmt(v)}
      </span>
    </li>
  );
}
