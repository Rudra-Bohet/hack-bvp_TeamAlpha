import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import PageHeading from "../components/PageHeading.jsx";
import { useStock } from "../context/StockContext.jsx";
import { FIELDS, FIELD_LABELS, detectColumns, mapRows } from "../lib/excel-import.js";

export default function ImportPage() {
  const { user, guest, rows: saved, add, remove } = useStock();
  const signedIn = !!user || guest !== null;
  const [headers, setHeaders] = useState([]);
  const [raw, setRaw] = useState([]);
  const [map, setMap] = useState({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef(null);

  async function onFile(file) {
    setMsg("");
    try {
      // Loaded only when a file is chosen, keeping the initial page light.
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const rows = [];
      for (const sheet of wb.SheetNames) {
        const worksheet = wb.Sheets[sheet];
        if (worksheet) rows.push(...XLSX.utils.sheet_to_json(worksheet, { defval: "" }));
      }
      const h = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      setHeaders(h);
      setRaw(rows);
      setMap(detectColumns(h));
    } catch (error) {
      setMsg(`Could not read spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  }

  const preview = mapRows(raw, map);

  async function save() {
    setBusy(true);
    try {
      await add(preview);
      setMsg(`Imported ${preview.length} medicines. See the Inventory page.`);
      setRaw([]);
      setHeaders([]);
      if (fileInput.current) fileInput.current.value = "";
    } catch (error) {
      setMsg(error instanceof Error ? error.message : "Could not save medicines");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageHeading
        eyebrow="Keep your stock connected"
        title="Import from Excel"
        description="Your existing spreadsheets, a fresh start. Upload .xlsx, .xls or .csv stock sheets."
      />

      {!signedIn ? (
        <div className="card">
          Please <Link to="/auth" className="link">sign in</Link> to import and save your stock.
        </div>
      ) : (
        <>
          <label className="dropzone">
            <FileSpreadsheet />
            <span className="strong">Choose a spreadsheet</span>
            <input
              ref={fileInput}
              type="file"
              accept=".xlsx,.xls,.csv"
              hidden
              onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
            />
          </label>

          {headers.length > 0 && (
            <section className="card spaced">
              <h3 className="card-title">Match columns</h3>
              <div className="mapping-grid">
                {FIELDS.map((f) => (
                  <label key={f} className="field">
                    <span>{FIELD_LABELS[f]}</span>
                    <select
                      className="input"
                      value={map[f] ?? ""}
                      onChange={(e) => setMap({ ...map, [f]: e.target.value || undefined })}
                    >
                      <option value="">— none —</option>
                      {headers.map((h) => (
                        <option key={h} value={h}>
                          {h}
                        </option>
                      ))}
                    </select>
                  </label>
                ))}
              </div>
              <p className="message">
                {preview.length} medicines ready{!map.name && " — pick the medicine name column"}.
              </p>
              <div className="preview-scroll">
                <StockTable rows={preview.slice(0, 50)} />
              </div>
              <button className="btn btn-primary spaced-sm" disabled={busy || !preview.length} onClick={save}>
                {busy ? "Saving…" : `Save ${preview.length} medicines`}
              </button>
            </section>
          )}
          {msg && <p className="message">{msg}</p>}

          <section className="spaced-lg">
            <h3 className="card-title">Your saved stock ({saved.length})</h3>
            <div className="panel table-wrap spaced-sm">
              <StockTable
                rows={saved}
                onDelete={(id) => {
                  remove(id).catch((error) =>
                    setMsg(error instanceof Error ? error.message : "Could not delete medicine"),
                  );
                }}
              />
            </div>
          </section>
        </>
      )}
    </>
  );
}

function StockTable({ rows, onDelete }) {
  if (!rows.length) return <p className="muted small pad">Nothing yet.</p>;
  return (
    <table className="simple-table">
      <thead>
        <tr>
          {FIELDS.map((f) => (
            <th key={f}>{FIELD_LABELS[f]}</th>
          ))}
          {onDelete && <th />}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={r.id ?? i}>
            <td className="strong">{r.name}</td>
            <td>{r.category}</td>
            <td>{r.stock}</td>
            <td>{r.daily_usage}</td>
            <td>{r.expiry_date ?? ""}</td>
            {onDelete && r.id && (
              <td>
                <button className="btn btn-ghost btn-icon" onClick={() => onDelete(r.id)} aria-label={`Delete ${r.name}`}>
                  <Trash2 className="icon-danger" />
                </button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
