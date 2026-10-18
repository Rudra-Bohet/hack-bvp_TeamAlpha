import { createFileRoute, Link } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { FileSpreadsheet, Trash2 } from "lucide-react";
import { useStock } from "@/hooks/use-stock";
import { PageHeading } from "@/components/PageHeading";
import { Button } from "@/components/ui/button";
import { AppHeader } from "@/components/AppHeader";
import { detectColumns, mapRows, type StockRow } from "@/lib/excel-import";

export const Route = createFileRoute("/import")({
  head: () => ({
    meta: [
      { title: "Import Excel — Stockout Shield" },
      {
        name: "description",
        content: "Upload your existing Excel or CSV stock sheets to add medicines in bulk.",
      },
      { property: "og:title", content: "Import Excel — Stockout Shield" },
      { property: "og:description", content: "Bulk-import medicine stock from Excel sheets." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ImportPage,
});

type Saved = {
  id: string;
  name: string;
  category: string;
  stock: number;
  daily_usage: number;
  expiry_date: string | null;
};
const FIELDS = ["name", "category", "stock", "daily_usage", "expiry_date"] as const;
const LABEL: Record<(typeof FIELDS)[number], string> = {
  name: "Medicine name",
  category: "Category",
  stock: "Stock",
  daily_usage: "Daily usage",
  expiry_date: "Expiry date",
};

function ImportPage() {
  const { user, guest, rows: saved, add, remove } = useStock();
  const signedIn = !!user || guest !== null;
  const [headers, setHeaders] = useState<string[]>([]);
  const [raw, setRaw] = useState<Record<string, unknown>[]>([]);
  const [map, setMap] = useState<ReturnType<typeof detectColumns>>({});
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  async function onFile(file: File) {
    setMsg("");
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const rows: Record<string, unknown>[] = [];
      for (const sheet of wb.SheetNames) {
        const worksheet = wb.Sheets[sheet];
        if (worksheet)
          rows.push(
            ...XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "" }),
          );
      }
      const h = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
      setHeaders(h);
      setRaw(rows);
      setMap(detectColumns(h));
    } catch (error) {
      setMsg(
        `Could not read spreadsheet: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  }

  const preview: StockRow[] = mapRows(raw, map);

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
    <div className="min-h-screen">
      <AppHeader active="/import" />
      <main className="mx-auto max-w-7xl px-6 py-8">
        <PageHeading
          eyebrow="Keep your stock connected"
          title="Import from Excel"
          description="Your existing spreadsheets, a fresh start. Upload .xlsx, .xls or .csv stock sheets."
        />

        {signedIn === false ? (
          <div className="mt-6 rounded-lg border bg-card p-6">
            Please{" "}
            <Link to="/auth" className="font-medium text-primary underline">
              sign in
            </Link>{" "}
            to import and save your stock.
          </div>
        ) : (
          <>
            <label className="mt-6 flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed bg-card p-10 text-center hover:border-primary">
              <FileSpreadsheet className="h-8 w-8 text-primary" />
              <span className="font-medium">Choose a spreadsheet</span>
              <input
                ref={fileInput}
                type="file"
                accept=".xlsx,.xls,.csv"
                className="hidden"
                onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])}
              />
            </label>

            {headers.length > 0 && (
              <section className="mt-6 rounded-lg border bg-card p-5">
                <h3 className="font-semibold">Match columns</h3>
                <div className="mt-3 grid gap-3 sm:grid-cols-5">
                  {FIELDS.map((f) => (
                    <label key={f} className="text-xs">
                      {LABEL[f]}
                      <select
                        value={map[f] ?? ""}
                        onChange={(e) => setMap({ ...map, [f]: e.target.value || undefined })}
                        className="mt-1 h-9 w-full rounded-md border border-input bg-background px-2 text-sm"
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
                <p className="mt-4 text-sm">
                  {preview.length} medicines ready{!map.name && " — pick the medicine name column"}.
                </p>
                <div className="mt-2 max-h-72 overflow-auto">
                  <Table rows={preview.slice(0, 50)} />
                </div>
                <Button
                  disabled={busy || !preview.length}
                  onClick={save}
                  className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-50"
                >
                  {busy ? "Saving…" : `Save ${preview.length} medicines`}
                </Button>
              </section>
            )}
            {msg && <p className="mt-3 text-sm">{msg}</p>}

            <section className="mt-8">
              <h3 className="font-semibold">Your saved stock ({saved.length})</h3>
              <div className="mt-2 overflow-auto rounded-lg border bg-card">
                <Table
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
      </main>
    </div>
  );
}

function Table({
  rows,
  onDelete,
}: {
  rows: (StockRow | Saved)[];
  onDelete?: (id: string) => void;
}) {
  if (!rows.length) return <p className="p-4 text-sm text-muted-foreground">Nothing yet.</p>;
  return (
    <table className="w-full text-sm">
      <thead className="text-left text-xs text-muted-foreground">
        <tr>
          {FIELDS.map((f) => (
            <th key={f} className="p-2">
              {LABEL[f]}
            </th>
          ))}
          {onDelete && <th />}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={"id" in r ? r.id : i} className="border-t">
            <td className="p-2 font-medium">{r.name}</td>
            <td className="p-2">{r.category}</td>
            <td className="p-2">{r.stock}</td>
            <td className="p-2">{r.daily_usage}</td>
            <td className="p-2">{r.expiry_date ?? ""}</td>
            {onDelete && "id" in r && (
              <td className="p-2">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onDelete(r.id)}
                  aria-label="Delete"
                >
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
