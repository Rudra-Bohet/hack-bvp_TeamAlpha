import { useMemo, useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { MEDICINES, SCENARIOS, forecast, fmt } from "../lib/forecast.js";

export default function Explain() {
  const [medId, setMedId] = useState(MEDICINES[0].id);
  const med = MEDICINES.find((m) => m.id === medId) ?? MEDICINES[0];
  const fc = useMemo(() => forecast(med, "none", 30), [med]);
  const avg = (k) => fc.reduce((s, f) => s + f[k], 0) / fc.length;

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
    <div className="narrow-page stack-xl">
      <section>
        <h2 className="title-lg">How each forecast is built</h2>
        <p className="muted lead">
          No blind numbers: every forecast on the Forecast tab is the sum of four parts you can
          inspect. Here is what each part means, in plain language.
        </p>
      </section>

      <section className="two-grid">
        <ExplainCard
          step="1"
          title="Baseline — the everyday level"
          body="The typical number of units dispensed per day when nothing unusual is happening. It comes from the long-run average of past sales. If a shop sells about 120 units of a medicine on a normal day, the baseline is 120."
        />
        <ExplainCard
          step="2"
          title="Seasonal effect — the calendar pattern"
          body="Some medicines follow the seasons: antimalarials rise in the monsoon, cold remedies in winter. The model learns a yearly wave from history and adds or subtracts units depending on the time of year."
        />
        <ExplainCard
          step="3"
          title="Trend — slow growth or decline"
          body="If demand is gradually rising — say the catchment population grows — the model adds a small extra amount each day. This keeps the forecast from falling behind a steadily growing need."
        />
        <ExplainCard
          step="4"
          title="Context signal — the what-if scenario"
          body="When you pick a scenario like 'Seasonal malaria surge', an extra boost is layered on top for the affected medicines. It ramps up over the first week rather than jumping instantly, which is how real outbreaks behave."
        />
      </section>

      <section className="card">
        <h3 className="card-title">See it for a medicine</h3>
        <p className="card-subtitle">Watch the forecast being assembled layer by layer.</p>
        <div className="pill-row">
          {MEDICINES.map((m) => (
            <button key={m.id} onClick={() => setMedId(m.id)} className={`choice inline ${m.id === medId ? "is-selected" : ""}`}>
              {m.name}
            </button>
          ))}
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart data={chart}>
            <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
            <XAxis dataKey="day" tick={{ fontSize: 11 }} tickFormatter={(d) => `+${d}`} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip />
            <Area dataKey="Baseline only" stroke="var(--chart-3)" fill="var(--chart-3)" fillOpacity={0.1} />
            <Line dataKey="Baseline + season" stroke="var(--chart-2)" dot={false} strokeWidth={1.5} />
            <Line dataKey="Forecast" stroke="var(--chart-1)" dot={false} strokeWidth={2.5} />
          </ComposedChart>
        </ResponsiveContainer>
        <ul className="plain-list">
          <li>
            Everyday level: <strong>{fmt(avg("baseline"))} units/day</strong>
          </li>
          <li>
            Seasonal effect right now:{" "}
            <strong>
              {avg("seasonal") >= 0 ? "+" : ""}
              {fmt(avg("seasonal"))} units/day
            </strong>{" "}
            (this medicine peaks around {peakDate})
          </li>
          <li>
            Daily growth from trend: <strong>+{fmt(avg("trend"))} units/day</strong> on average over
            the month
          </li>
        </ul>
      </section>

      <section className="two-grid">
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

      <section className="card">
        <h3 className="card-title">What the scenarios assume</h3>
        <ul className="scenario-list">
          {SCENARIOS.filter((s) => s.id !== "none").map((s) => (
            <li key={s.id}>
              <div className="strong">{s.label}</div>
              <div className="muted">{s.description}</div>
              <div className="mono muted small">
                {Object.entries(s.medicineBoost)
                  .map(([id, b]) => `${MEDICINES.find((x) => x.id === id)?.name ?? id}: +${Math.round(b * 100)}%`)
                  .join(" · ")}
              </div>
            </li>
          ))}
        </ul>
        <p className="muted small">
          Forecasts support — not replace — professional judgement. Always confirm critical stock
          decisions with a qualified pharmacist or supply-chain officer.
        </p>
      </section>
    </div>
  );
}

function ExplainCard({ step, title, body }) {
  return (
    <div className="card">
      <div className="step-badge">{step}</div>
      <h3 className="card-title">{title}</h3>
      <p className="muted small body">{body}</p>
    </div>
  );
}
