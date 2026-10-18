import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  Phone,
  Mail,
  MessageCircle,
  Clock,
  MapPin,
  Send,
  CheckCircle2,
  ArrowLeft,
} from "lucide-react";
import { SUPPLIERS, type OrderRequest } from "@/lib/suppliers";
import { MEDICINES } from "@/lib/forecast";
import { AppHeader } from "@/components/AppHeader";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Emergency Suppliers — Stockout Shield" },
      {
        name: "description",
        content:
          "Contact nearby pharmacies and wholesalers to place emergency stock orders when a stockout is forecast.",
      },
      { property: "og:title", content: "Emergency Suppliers — Stockout Shield" },
      {
        property: "og:description",
        content:
          "Reach nearby shops for urgent medicine stock when demand forecasts predict a stockout.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Suppliers,
});

function Suppliers() {
  const [medId, setMedId] = useState(MEDICINES[0]?.id ?? "");
  const [supplierId, setSupplierId] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(500);
  const [urgency, setUrgency] = useState<OrderRequest["urgency"]>("urgent");
  const [note, setNote] = useState("");
  const [sent, setSent] = useState<OrderRequest[]>([]);

  const med = MEDICINES.find((m) => m.id === medId) ?? MEDICINES[0];
  const matching = useMemo(() => SUPPLIERS, [med]);
  const selected = SUPPLIERS.find((s) => s.id === supplierId) ?? null;
  if (!med) return null;

  const sendRequest = () => {
    if (!selected) return;
    setSent((prev) => [
      {
        supplierId: selected.id,
        medicine: med.name,
        quantity,
        urgency,
        note,
        sentAt: new Date().toLocaleString(),
      },
      ...prev,
    ]);
    setSupplierId(null);
    setNote("");
  };

  return (
    <div className="min-h-screen">
      <AppHeader active="/suppliers" />

      <main className="mx-auto max-w-7xl px-6 py-8">
        <Link
          to="/dashboard"
          className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to forecast
        </Link>
        <PageHeading
          eyebrow="A connected supply chain"
          title="Emergency suppliers"
          description="Nearby pharmacies and wholesalers. Demo contacts and distances — no real messages are sent."
        />

        <div className="mt-6 grid gap-6 xl:grid-cols-[225px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <section>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Medicine needed
              </h3>
              <div className="space-y-2">
                {MEDICINES.map((m) => (
                  <Button
                    variant="ghost"
                    key={m.id}
                    onClick={() => {
                      setMedId(m.id);
                      setSupplierId(null);
                    }}
                    className={`h-auto w-full flex-col items-start gap-1 whitespace-normal rounded-md border p-3 text-left transition ${m.id === medId ? "border-primary bg-secondary" : "bg-card hover:bg-muted"}`}
                  >
                    <div className="text-sm font-medium">{m.name}</div>
                    <div className="text-xs text-muted-foreground">{m.category}</div>
                  </Button>
                ))}
              </div>
            </section>
          </aside>

          <div className="space-y-6">
            <section className="space-y-3">
              <h3 className="text-sm font-semibold">Nearby pharmacies & wholesalers</h3>
              {matching.length === 0 && (
                <p className="text-sm text-muted-foreground">
                  No nearby shops stock this category.
                </p>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                {matching.map((s) => (
                  <div
                    key={s.id}
                    className={`rounded-lg border bg-card p-4 ${supplierId === s.id ? "border-primary" : ""}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-medium">{s.name}</div>
                        <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {s.distanceKm} km
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" />~{s.typicalResponseMin} min response
                          </span>
                        </div>
                      </div>
                      <span
                        className={`rounded bg-secondary px-2 py-1 text-xs ${s.open24h ? "text-success" : "text-muted-foreground"}`}
                      >
                        {s.open24h ? "Open 24h" : "Day hours"}
                      </span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs">
                      <a
                        href={`tel:${s.phone.replace(/\s/g, "")}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
                      >
                        <Phone className="h-3 w-3" />
                        Call
                      </a>
                      <a
                        href={`https://wa.me/${s.whatsapp.replace(/[^0-9]/g, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
                      >
                        <MessageCircle className="h-3 w-3" />
                        WhatsApp
                      </a>
                      <a
                        href={`mailto:${s.email}`}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 hover:bg-muted"
                      >
                        <Mail className="h-3 w-3" />
                        Email
                      </a>
                    </div>
                    <Button
                      onClick={() => setSupplierId(s.id)}
                      className="mt-3 w-full rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                    >
                      Request stock
                    </Button>
                  </div>
                ))}
              </div>
            </section>

            {selected && (
              <section className="rounded-lg border border-primary bg-card p-5">
                <h3 className="font-semibold">Request from {selected.name}</h3>
                <div className="mt-4 grid gap-4 sm:grid-cols-3">
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      Quantity (units)
                    </span>
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </label>
                  <label className="text-sm">
                    <span className="mb-1 block text-xs text-muted-foreground">Urgency</span>
                    <select
                      value={urgency}
                      onChange={(e) => setUrgency(e.target.value as OrderRequest["urgency"])}
                      className="w-full rounded-md border bg-background px-3 py-2"
                    >
                      <option value="critical">Critical — stockout imminent</option>
                      <option value="urgent">Urgent — within days</option>
                      <option value="routine">Routine top-up</option>
                    </select>
                  </label>
                  <label className="text-sm sm:col-span-1">
                    <span className="mb-1 block text-xs text-muted-foreground">
                      Note (optional)
                    </span>
                    <input
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="e.g. deliver before Friday"
                      className="w-full rounded-md border bg-background px-3 py-2"
                    />
                  </label>
                </div>
                <div className="mt-4 flex gap-2">
                  <Button
                    onClick={sendRequest}
                    className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
                  >
                    <Send className="h-4 w-4" /> Send request
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSupplierId(null)}
                    className="rounded-md border px-4 py-2 text-sm hover:bg-muted"
                  >
                    Cancel
                  </Button>
                </div>
              </section>
            )}

            {sent.length > 0 && (
              <section className="rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Sent requests</h3>
                <ul className="mt-3 space-y-2 text-sm">
                  {sent.map((r, i) => {
                    const s = SUPPLIERS.find((x) => x.id === r.supplierId);
                    return (
                      <li key={i} className="flex items-start gap-2 rounded-md border p-3">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                        <div>
                          <span className="font-medium">
                            {r.quantity.toLocaleString()} × {r.medicine}
                          </span>{" "}
                          from {s?.name}
                          <span
                            className={`ml-2 rounded-full px-2 py-0.5 text-xs ${r.urgency === "critical" ? "bg-destructive/15 text-destructive" : r.urgency === "urgent" ? "bg-warning/15 text-warning" : "bg-muted text-muted-foreground"}`}
                          >
                            {r.urgency}
                          </span>
                          <div className="text-xs text-muted-foreground">
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
      </main>
    </div>
  );
}
