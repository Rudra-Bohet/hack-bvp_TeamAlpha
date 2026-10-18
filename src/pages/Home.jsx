import { Link } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  ChartNoAxesCombined,
  Package,
  FileSpreadsheet,
  Truck,
  ShieldCheck,
  Activity,
  TriangleAlert,
} from "lucide-react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import PageHeading from "../components/PageHeading.jsx";
import { MEDICINES, forecast, history, daysToStockout, guestMedicines } from "../lib/forecast.js";
import { SUPPLIERS } from "../lib/suppliers.js";
import { useStock } from "../context/StockContext.jsx";
import hero from "../assets/hero.jpg";

const FEATURES = [
  { icon: FileSpreadsheet, title: "Bring your stock up to date", text: "Import your existing Excel or CSV sheets.", to: "/import" },
  { icon: Package, title: "Keep an eye on inventory", text: "Review stock levels and days of cover.", to: "/inventory" },
  { icon: Truck, title: "Find stock nearby", text: "Connect with emergency suppliers.", to: "/suppliers" },
];

export default function Home() {
  const { guest } = useStock();
  const medicines = guestMedicines(guest);
  const stock = medicines.reduce((sum, med) => sum + med.stock, 0);
  const demand = medicines.reduce(
    (sum, med) => sum + forecast(med, "none", 30).reduce((s, p) => s + p.forecast, 0),
    0,
  );
  const risk = medicines.filter(
    (m) => daysToStockout(m.stock, forecast(m, "none", 30).map((p) => p.forecast)) !== null,
  ).length;
  const hist = MEDICINES.map((m) => history(m).slice(-30));
  const fc = MEDICINES.map((m) => forecast(m, "none", 30));
  const chart = [
    ...Array.from({ length: 30 }, (_, i) => ({
      day: i - 30,
      actual: hist.reduce((s, h) => s + (h[i]?.actual ?? 0), 0),
    })),
    ...Array.from({ length: 30 }, (_, i) => ({
      day: i + 1,
      predicted: Math.round(fc.reduce((s, f) => s + (f[i]?.forecast ?? 0), 0)),
    })),
  ];
  const stats = [
    { label: "Medicines monitored", value: medicines.length.toString().padStart(2, "0"), detail: "Across your medicine categories", icon: Package },
    { label: "Total units in stock", value: stock.toLocaleString(), detail: "Current stock on hand", icon: Activity },
    { label: "Stockout alerts", value: risk.toString().padStart(2, "0"), detail: "Within the next 30 days", icon: TriangleAlert, warn: true },
    { label: "30-day forecast demand", value: Math.round(demand).toLocaleString(), detail: "Units · baseline scenario", icon: ChartNoAxesCombined },
  ];

  return (
    <>
      <PageHeading
        eyebrow="Your medicine workspace"
        title="A clearer view. Better prepared."
        description="Your stock, demand and next steps — all in one place."
        action={
          <Link className="btn btn-outline" to="/import">
            <FileSpreadsheet /> Import spreadsheet
          </Link>
        }
      />

      <section className="overview-hero">
        <img src={hero} alt="Well-organized shelves of medicine in a pharmacy" />
        <div className="hero-copy">
          <div className="hero-label">
            <ShieldCheck /> CONTINUITY OF CARE STARTS HERE
          </div>
          <h1>Stockout Shield</h1>
          <p>
            Keep essential medicines within reach.
            <br />
            Know what’s needed, before it’s needed.
          </p>
          <Link className="btn hero-btn" to="/dashboard">
            Explore demand forecast <ArrowRight />
          </Link>
        </div>
        <div className="hero-badge">
          <ShieldCheck />
          <span>
            Better prepared.
            <br />
            Better patient care.
          </span>
        </div>
      </section>

      <section className="overview-stats" aria-label="Medicine overview">
        {stats.map((s) => (
          <div key={s.label} className="overview-stat">
            <div className="stat-top">
              <span>{s.label}</span>
              <s.icon />
            </div>
            <div className="stat-number">{s.value}</div>
            <div className={`stat-detail ${s.warn ? "is-warning" : ""}`}>{s.detail}</div>
          </div>
        ))}
      </section>

      <div className="overview-grid">
        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Demand at a glance</h3>
              <p>All demo medicines · 30-day outlook</p>
            </div>
            <Link to="/dashboard">
              Full forecast <ArrowUpRight />
            </Link>
          </div>
          <div className="chart-legend">
            <span><i /> Forecast demand</span>
            <span><i /> Historical demand</span>
          </div>
          <div className="overview-chart">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chart}>
                <CartesianGrid vertical={false} stroke="var(--border)" strokeDasharray="3 4" />
                <XAxis dataKey="day" tickFormatter={(d) => (d < 0 ? `${d}d` : `+${d}d`)} tick={{ fontSize: 9 }} tickLine={false} axisLine={false} minTickGap={22} />
                <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} width={43} />
                <Tooltip />
                <Area dataKey="predicted" name="Forecast" fill="var(--chart-fill)" stroke="var(--primary)" strokeWidth={2} />
                <Line dataKey="actual" name="Historical" stroke="var(--chart-5)" strokeWidth={1.5} dot={false} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Stock watchlist</h3>
              <p>Ahead of demand, not behind it.</p>
            </div>
            <Link to="/inventory">
              View all <ArrowUpRight />
            </Link>
          </div>
          <div className="watchlist">
            {medicines.length === 0 && <p className="muted small">No medicines yet.</p>}
            {medicines.map((m) => {
              const day = daysToStockout(m.stock, forecast(m, "none", 30).map((p) => p.forecast));
              return (
                <Link to="/dashboard" key={m.id} className="watch-item">
                  <div>
                    <strong>{m.name}</strong>
                    <p>{m.stock.toLocaleString()} units in stock</p>
                  </div>
                  <span className={`risk-chip ${day ? "" : "is-covered"}`}>
                    {day ? `Day ${day} risk` : "Covered"}
                  </span>
                </Link>
              );
            })}
          </div>
        </section>
      </div>

      <section className="quick-section">
        <div className="section-label">
          <h3>Your next steps</h3>
          <span>{SUPPLIERS.length} nearby suppliers in the demo directory</span>
        </div>
        <div className="quick-grid">
          {FEATURES.map((f) => (
            <Link key={f.to} to={f.to} className="quick-link">
              <span className="quick-icon">
                <f.icon />
              </span>
              <div>
                <strong>{f.title}</strong>
                <p>{f.text}</p>
              </div>
              <ArrowUpRight className="quick-arrow" />
            </Link>
          ))}
        </div>
      </section>

      <footer className="app-footer">
        <span>Stockout Shield · Thoughtful supply. Uninterrupted care.</span>
        <span>Demonstration data · Forecasts support professional judgement.</span>
      </footer>
    </>
  );
}
