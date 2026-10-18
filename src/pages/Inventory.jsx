import { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import PageHeading from "../components/PageHeading.jsx";
import { useStock } from "../context/StockContext.jsx";
import { stockCover } from "../lib/inventory.js";
import { fmt } from "../lib/forecast.js";

const FORM_FIELDS = [
  { key: "name", label: "Medicine name", type: "text", required: true },
  { key: "category", label: "Category", type: "text" },
  { key: "stock", label: "Stock", type: "number", required: true },
  { key: "daily_usage", label: "Daily usage", type: "number" },
];

const COVER_CLASS = { unknown: "muted", critical: "text-danger", warning: "text-warning", healthy: "text-success" };

export default function Inventory() {
  const { rows, user, guest, ready, add, remove } = useStock();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function onAdd(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const row = {
      name: String(data.get("name") ?? "").trim(),
      category: String(data.get("category") ?? ""),
      stock: Number(data.get("stock")),
      daily_usage: Number(data.get("daily_usage") ?? 0),
      expiry_date: null,
      extra: {},
    };
    if (!row.name || row.stock < 0 || row.daily_usage < 0) return;
    setBusy(true);
    try {
      await add([row]);
      form.reset();
      setMessage("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not add medicine");
    } finally {
      setBusy(false);
    }
  }

  async function onRemove(id) {
    try {
      await remove(id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete medicine");
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Stock management"
        title="Inventory"
        description="Essential medicines. Every unit accounted for."
        action={
          <Link className="btn btn-outline" to="/import">
            Import Excel <Plus />
          </Link>
        }
      />
      {!ready ? (
        <p className="muted small">Loading inventory…</p>
      ) : !user && guest === null ? (
        <div className="card">
          Please <Link to="/auth" className="link">sign in or continue as guest</Link> to manage your stock.
        </div>
      ) : (
        <>
          <section className="form-band">
            <h3>Add a medicine</h3>
            <form onSubmit={onAdd} className="add-form">
              {FORM_FIELDS.map((f) => (
                <label key={f.key} className="field">
                  <span>{f.label}</span>
                  <input
                    className="input"
                    name={f.key}
                    type={f.type}
                    required={f.required}
                    min={f.type === "number" ? 0 : undefined}
                    defaultValue={f.type === "number" ? 0 : undefined}
                  />
                </label>
              ))}
              <button className="btn btn-primary" disabled={busy}>
                <Plus />
                {busy ? "Adding…" : "Add medicine"}
              </button>
            </form>
          </section>
          <div className="section-label">
            <h3>
              Your saved stock <span>({rows.length})</span>
            </h3>
            <span>Days of cover based on daily usage</span>
          </div>
          <div className="panel table-wrap">
            <table className="inventory-table">
              <thead>
                <tr>
                  {["Medicine", "Category", "Stock", "Daily usage", "Days of cover", "Expiry", ""].map((h, i) => (
                    <th key={i}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.length ? (
                  rows.map((r) => {
                    const { days: cover, status } = stockCover(r.stock, r.daily_usage);
                    return (
                      <tr key={r.id}>
                        <td>{r.name}</td>
                        <td className="muted">{r.category || "—"}</td>
                        <td className="mono">{fmt(r.stock)}</td>
                        <td className="mono">{fmt(r.daily_usage)}</td>
                        <td>
                          <span className={COVER_CLASS[status]}>
                            {cover === null ? "—" : `${Math.floor(cover)} days`}
                          </span>
                        </td>
                        <td className="muted">{r.expiry_date ?? "—"}</td>
                        <td>
                          <button
                            className="btn btn-ghost btn-icon"
                            onClick={() => onRemove(r.id)}
                            aria-label={`Delete ${r.name}`}
                            title={`Delete ${r.name}`}
                          >
                            <Trash2 />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={7} className="muted">
                      No medicines yet — add one or import an Excel sheet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {message && (
        <p role="status" className="message text-danger">
          {message}
        </p>
      )}
    </>
  );
}
