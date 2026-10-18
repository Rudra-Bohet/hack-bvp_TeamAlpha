import { useState } from "react";
import { Link } from "react-router-dom";
import { Phone, Mail, MessageCircle, Clock, MapPin, Send, CheckCircle2, ArrowLeft } from "lucide-react";
import PageHeading from "../components/PageHeading.jsx";
import { SUPPLIERS } from "../lib/suppliers.js";
import { MEDICINES } from "../lib/forecast.js";

const URGENCY_CLASS = { critical: "is-danger", urgent: "is-warning", routine: "" };

export default function Suppliers() {
  const [medId, setMedId] = useState(MEDICINES[0].id);
  const [supplierId, setSupplierId] = useState(null);
  const [quantity, setQuantity] = useState(500);
  const [urgency, setUrgency] = useState("urgent");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState([]);

  const med = MEDICINES.find((m) => m.id === medId) ?? MEDICINES[0];
  const selected = SUPPLIERS.find((s) => s.id === supplierId) ?? null;

  function sendRequest() {
    if (!selected) return;
    setSent((prev) => [
      { supplierId: selected.id, medicine: med.name, quantity, urgency, note, sentAt: new Date().toLocaleString() },
      ...prev,
    ]);
    setSupplierId(null);
    setNote("");
  }

  return (
    <>
      <Link to="/dashboard" className="back-link">
        <ArrowLeft /> Back to forecast
      </Link>
      <PageHeading
        eyebrow="A connected supply chain"
        title="Emergency suppliers"
        description="Nearby pharmacies and wholesalers. Demo contacts and distances — no real messages are sent."
      />

      <div className="side-layout narrow">
        <aside>
          <h4 className="side-caption">Medicine needed</h4>
          <div className="stack-sm">
            {MEDICINES.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setMedId(m.id);
                  setSupplierId(null);
                }}
                className={`choice ${m.id === medId ? "is-selected" : ""}`}
              >
                <span className="choice-title">{m.name}</span>
                <span className="choice-sub">{m.category}</span>
              </button>
            ))}
          </div>
        </aside>

        <div className="stack-lg min-w-0">
          <section>
            <h3 className="card-title">Nearby pharmacies &amp; wholesalers</h3>
            <div className="supplier-grid">
              {SUPPLIERS.map((s) => (
                <div key={s.id} className={`card supplier ${supplierId === s.id ? "is-selected" : ""}`}>
                  <div className="supplier-head">
                    <div>
                      <div className="strong">{s.name}</div>
                      <div className="supplier-meta">
                        <span><MapPin /> {s.distanceKm} km</span>
                        <span><Clock /> ~{s.typicalResponseMin} min response</span>
                      </div>
                    </div>
                    <span className={`tag ${s.open24h ? "text-success" : "muted"}`}>
                      {s.open24h ? "Open 24h" : "Day hours"}
                    </span>
                  </div>
                  <div className="contact-row">
                    <a className="chip-link" href={`tel:${s.phone.replace(/\s/g, "")}`}>
                      <Phone /> Call
                    </a>
                    <a className="chip-link" href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                      <MessageCircle /> WhatsApp
                    </a>
                    <a className="chip-link" href={`mailto:${s.email}`}>
                      <Mail /> Email
                    </a>
                  </div>
                  <button className="btn btn-primary btn-block" onClick={() => setSupplierId(s.id)}>
                    Request stock
                  </button>
                </div>
              ))}
            </div>
          </section>

          {selected && (
            <section className="card is-selected">
              <h3 className="card-title">Request {med.name} from {selected.name}</h3>
              <div className="request-grid">
                <label className="field">
                  <span>Quantity (units)</span>
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                  />
                </label>
                <label className="field">
                  <span>Urgency</span>
                  <select className="input" value={urgency} onChange={(e) => setUrgency(e.target.value)}>
                    <option value="critical">Critical — stockout imminent</option>
                    <option value="urgent">Urgent — within days</option>
                    <option value="routine">Routine top-up</option>
                  </select>
                </label>
                <label className="field">
                  <span>Note (optional)</span>
                  <input
                    className="input"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. deliver before Friday"
                  />
                </label>
              </div>
              <div className="button-row">
                <button className="btn btn-primary" onClick={sendRequest}>
                  <Send /> Send request
                </button>
                <button className="btn btn-outline" onClick={() => setSupplierId(null)}>
                  Cancel
                </button>
              </div>
            </section>
          )}

          {sent.length > 0 && (
            <section className="card">
              <h3 className="card-title">Sent requests</h3>
              <ul className="request-list">
                {sent.map((r, i) => {
                  const s = SUPPLIERS.find((x) => x.id === r.supplierId);
                  return (
                    <li key={i}>
                      <CheckCircle2 className="icon-success" />
                      <div>
                        <span className="strong">
                          {r.quantity.toLocaleString()} × {r.medicine}
                        </span>{" "}
                        from {s?.name}
                        <span className={`pill ${URGENCY_CLASS[r.urgency]}`}>{r.urgency}</span>
                        <div className="muted small">
                          {r.sentAt}
                          {r.note ? ` · “${r.note}”` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </div>
      </div>
    </>
  );
}
