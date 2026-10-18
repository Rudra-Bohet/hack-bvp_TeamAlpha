import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { AppHeader } from "@/components/AppHeader";
import { useStock } from "@/hooks/use-stock";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "@tanstack/react-router";
import { stockCover } from "@/lib/inventory";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Medicine Inventory — Stockout Shield" },
      {
        name: "description",
        content: "Manage saved medicine stock, daily usage, expiry dates and days of cover.",
      },
      { property: "og:title", content: "Medicine Inventory — Stockout Shield" },
      {
        property: "og:description",
        content: "Track your medicine stock and days of cover in one workspace.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SavedInventory,
});

const fmt = (n: number) => Math.round(n).toLocaleString();

function SavedInventory() {
  const { rows, user, guest, ready, add, remove } = useStock();
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function onAdd(e: React.FormEvent<HTMLFormElement>) {
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
  async function onRemove(id: string) {
    try {
      await remove(id);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not delete medicine");
    }
  }
  return (
    <div className="min-h-screen">
      <AppHeader active="/inventory" />
      <main>
        <PageHeading
          eyebrow="Stock management"
          title="Inventory"
          description="Essential medicines. Every unit accounted for."
          action={
            <Button variant="outline" asChild>
              <Link to="/import">
                Import Excel <Plus />
              </Link>
            </Button>
          }
        />
        {!ready ? (
          <p className="text-sm text-muted-foreground">Loading inventory…</p>
        ) : !user && guest === null ? (
          <div className="panel p-6 text-sm">
            Please{" "}
            <Link to="/auth" className="text-primary underline">
              sign in or continue as guest
            </Link>{" "}
            to manage your stock.
          </div>
        ) : (
          <>
            <section className="form-band">
              <h3>Add a medicine</h3>
              <form
                onSubmit={onAdd}
                className="grid items-end gap-4 sm:grid-cols-2 xl:grid-cols-[1.4fr_1fr_0.7fr_0.7fr_auto]"
              >
                {[
                  { key: "name", label: "Medicine name", type: "text", required: true },
                  { key: "category", label: "Category", type: "text" },
                  { key: "stock", label: "Stock", type: "number", required: true },
                  { key: "daily_usage", label: "Daily usage", type: "number" },
                ].map((f) => (
                  <label key={f.key} className="space-y-2 text-xs text-muted-foreground">
                    <span>{f.label}</span>
                    <Input
                      name={f.key}
                      type={f.type}
                      required={f.required}
                      min={f.type === "number" ? 0 : undefined}
                      defaultValue={f.type === "number" ? 0 : undefined}
                    />
                  </label>
                ))}
                <Button disabled={busy}>
                  <Plus />
                  {busy ? "Adding…" : "Add medicine"}
                </Button>
              </form>
            </section>
            <div className="section-label">
              <h3>
                Your saved stock <span>({rows.length})</span>
              </h3>
              <span>Days of cover based on daily usage</span>
            </div>
            <div className="panel overflow-x-auto">
              <table className="inventory-table">
                <thead>
                  <tr>
                    {[
                      "Medicine",
                      "Category",
                      "Stock",
                      "Daily usage",
                      "Days of cover",
                      "Expiry",
                      "",
                    ].map((h, i) => (
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
                          <td className="text-muted-foreground">{r.category || "—"}</td>
                          <td className="font-mono">{fmt(r.stock)}</td>
                          <td className="font-mono">{fmt(r.daily_usage)}</td>
                          <td>
                            <span
                              className={
                                status === "unknown"
                                  ? "text-muted-foreground"
                                  : status === "critical"
                                    ? "text-destructive"
                                    : status === "warning"
                                      ? "text-warning"
                                      : "text-success"
                              }
                            >
                              {cover === null ? "—" : `${Math.floor(cover)} days`}
                            </span>
                          </td>
                          <td className="text-muted-foreground">{r.expiry_date ?? "—"}</td>
                          <td>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => onRemove(r.id)}
                              aria-label={`Delete ${r.name}`}
                              title={`Delete ${r.name}`}
                            >
                              <Trash2 />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} className="text-muted-foreground">
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
          <p role="status" className="mt-4 text-sm text-destructive">
            {message}
          </p>
        )}
      </main>
    </div>
  );
}
