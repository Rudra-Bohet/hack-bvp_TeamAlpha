import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { MEDICINES, SCENARIOS, forecast } from "@/lib/forecast";

export const Route = createFileRoute("/explain")({
  head: () => ({
    meta: [
      { title: "How forecasts work — Stockout Shield" },
      {
        name: "description",
        content:
          "Plain-language explanation of how Stockout Shield builds each medicine demand forecast: baseline, seasonality, trend and scenario context.",
      },
      { property: "og:title", content: "How forecasts work — Stockout Shield" },
      {
        property: "og:description",
        content: "Plain-language explanation of how each medicine demand forecast is built.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ExplainPage,
});

const fmt = (n: number) => Math.round(n).toLocaleString();

function ExplainPage() {
  const [medId, setMedId] = useState(MEDICINES[0]?.id ?? "");
  const med = MEDICINES.find((m) => m.id === medId) ?? {
    id: "empty",
    name: "",
    category: "",
    base: 0,
    stock: 0,
    seasonAmp: 0,
    seasonPeak: 0,
    trend: 0,
  };
  const fc = useMemo(() => forecast(med, "none", 30), [med]);
  const avg = (k: "baseline" | "seasonal" | "trend") =>
    fc.reduce((s, f) => s + f[k], 0) / fc.length;

  const chart = fc.map((f) => ({
    day: f.day,
    Forecast: Math.round(f.forecast),
    "Baseline only": Math.round(f.baseline),
    "Baseline + season": Math.round(f.baseline + f.seasonal),
  }));

  const peakDate = new Date(2026, 0, 1 + med.seasonPeak).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
  });

  return (
    <div className="min-h-screen">
      <AppHeader active="/explain" />
      <main className="mx-auto max-w-4xl space-y-8 px-6 py-8">
        <section>
          <h2 className="text-2xl font-bold">How each forecast is built</h2>
          <p className="mt-2 text-muted-foreground">
            No blind numbers: every forecast on the Forecast tab is the sum of four parts you can
            inspect. Here is what each part means, in plain language.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <ExplainCard
            step="1"
            title="Baseline — the everyday level"
            body="The typical number of units dispensed per day when nothing unusual is happening. It comes from the long-run average of past sales (the ARIMA part of the model). If a shop sells about 120 units of a medicine on a normal day, the baseline is 120."
          />
          <ExplainCard
            step="2"
            title="Seasonal effect — the calendar pattern"
            body="Some medicines follow the seasons: antimalarials rise in the monsoon, cold remedies in winter. The model learns a yearly wave from history (the Prophet part) and adds or subtracts units depending on the time of year."
          />
          <ExplainCard
            step="3"
            title="Trend — slow growth or decline"
            body="If demand is gradually rising — say the catchment population grows — the model adds a small extra amount each day. This keeps the forecast from falling behind a steadily growing need."
          />
          <ExplainCard
            step="4"
            title="Context signal — the what-if scenario"
            body="When you pick a scenario like 'Seasonal malaria surge', an extra boost is layered on top for the affected medicines (the XGBoost part, using outside signals). It ramps up over the first week rather than jumping instantly, which is how real outbreaks behave."
          />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">See it for a medicine</h3>
          <p className="mb-4 text-xs text-muted-foreground">
            Watch the forecast being assembled layer by layer.
          </p>
          <div className="mb-4 flex flex-wrap gap-2">
            {MEDICINES.map((m) => (
              <Button
                variant="ghost"
                key={m.id}
                onClick={() => setMedId(m.id)}
                className={`rounded-md border px-3 py-1.5 text-sm ${m.id === medId ? "border-primary bg-secondary font-medium" : "bg-card hover:bg-muted"}`}
              >
                {m.name}
              </Button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chart}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => `+${d}`} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip />
              <Area
                dataKey="Baseline only"
                stroke="var(--chart-3)"
                fill="var(--chart-3)"
                fillOpacity={0.1}
              />
              <Line
                dataKey="Baseline + season"
                stroke="var(--chart-2)"
                dot={false}
                strokeWidth={1.5}
              />
              <Line dataKey="Forecast" stroke="var(--chart-1)" dot={false} strokeWidth={2.5} />
            </ComposedChart>
          </ResponsiveContainer>
          <ul className="mt-4 space-y-2 text-sm">
            <li>
              · Everyday level: <strong>{fmt(avg("baseline"))} units/day</strong>
            </li>
            <li>
              · Seasonal effect right now:{" "}
              <strong>
                {avg("seasonal") >= 0 ? "+" : ""}
                {fmt(avg("seasonal"))} units/day
              </strong>{" "}
              (this medicine peaks around {peakDate})
            </li>
            <li>
              · Daily growth from trend: <strong>+{fmt(avg("trend"))} units/day</strong> on average
              over the month
            </li>
          </ul>
        </section>

        <section className="grid gap-4 sm:grid-cols-2">
          <ExplainCard
            step="?"
            title="What the shaded band means"
            body="The band around the forecast is an 80% confidence interval: the model expects real demand to fall inside it about 8 days out of 10. The band widens the further ahead you look, because the distant future is genuinely less certain. The 'suggested reorder' uses the top of this band so you are covered even if demand runs high."
          />
          <ExplainCard
            step="?"
            title="What the accuracy numbers mean"
            body="MAE, RMSE and MAPE come from a holdout test: the model predicts the last 30 days of history it was not allowed to see, and we measure how far off it was. MAE is the average miss in units per day; MAPE is the same as a percentage. All current numbers are computed on demonstration data, so treat them as illustrative until real sales data is connected."
          />
        </section>

        <section className="rounded-lg border bg-card p-5">
          <h3 className="font-semibold">What the scenarios assume</h3>
          <ul className="mt-3 space-y-3 text-sm">
            {SCENARIOS.filter((s) => s.id !== "none").map((s) => (
              <li key={s.id} className="border-b pb-3 last:border-0">
                <div className="font-medium">{s.label}</div>
                <div className="text-muted-foreground">{s.description}</div>
                <div className="mt-1 font-mono text-xs text-muted-foreground">
                  {Object.entries(s.medicineBoost)
                    .map(([id, b]) => {
                      const m = MEDICINES.find((x) => x.id === id);
                      return `${m?.name ?? id}: +${Math.round(b * 100)}%`;
                    })
                    .join(" · ")}
                </div>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            Forecasts support — not replace — professional judgement. Always confirm critical stock
            decisions with a qualified pharmacist or supply-chain officer.
          </p>
        </section>
      </main>
    </div>
  );
}

function ExplainCard({ step, title, body }: { step: string; title: string; body: string }) {
  return (
    <div className="rounded-lg border bg-card p-5">
      <div className="mb-2 flex h-7 w-7 items-center justify-center rounded-full bg-secondary font-mono text-xs font-semibold text-secondary-foreground">
        {step}
      </div>
      <h3 className="font-semibold">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
