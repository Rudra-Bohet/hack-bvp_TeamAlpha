import { describe, expect, it } from "vitest";
import { MEDICINES, forecast, history, daysToStockout, guestMedicines } from "../lib/forecast.js";
import { detectColumns, mapRows } from "../lib/excel-import.js";
import { SUPPLIERS } from "../lib/suppliers.js";
import { stockCover } from "../lib/inventory.js";

describe("Stockout Shield logic", () => {
  it("keeps inventory cover thresholds at 7 and 30 days", () => {
    expect(stockCover(60, 10)).toEqual({ days: 6, status: "critical" });
    expect(stockCover(70, 10)).toEqual({ days: 7, status: "warning" });
    expect(stockCover(290, 10)).toEqual({ days: 29, status: "warning" });
    expect(stockCover(300, 10)).toEqual({ days: 30, status: "healthy" });
    expect(stockCover(300, 0)).toEqual({ days: null, status: "unknown" });
  });

  it("keeps the forward forecast equations for every scenario", () => {
    const boosts = {
      none: {},
      malaria: { act: 0.4, para: 0.12 },
      abx: { amox: 0.35, para: 0.08 },
      outbreak: { ors: 0.8, amox: 0.15, para: 0.15 },
    };
    for (const med of MEDICINES)
      for (const [scenario, values] of Object.entries(boosts)) {
        const result = forecast(med, scenario, 90);
        expect(result).toHaveLength(90);
        for (const point of result) {
          const d = point.day;
          const b = values[med.id] ?? 0;
          const base =
            med.base +
            med.base * med.seasonAmp * Math.cos(((((200 + d) % 365) - med.seasonPeak) / 365) * 2 * Math.PI) +
            med.base * med.trend * d;
          const f = base + base * b * Math.min(1, d / 7);
          const spread = f * (0.08 + 0.006 * d) * (1 + b * 0.5);
          expect(point.forecast).toBeCloseTo(f, 10);
          expect(point.lower).toBeCloseTo(Math.max(0, f - spread), 10);
          expect(point.upper).toBeCloseTo(f + spread, 10);
        }
      }
  });

  it("retains 60 seeded history observations", () => {
    const med = MEDICINES[0];
    const seed = (med.id.charCodeAt(0) * 97 + med.base) * 1664525 + 1013904223;
    const random = (seed % 4294967296) / 4294967296;
    const expected = Math.max(
      0,
      Math.round(
        120 * (1 + 0.0008 * -60) +
          120 * 0.45 * Math.cos(((140 - 220) / 365) * 2 * Math.PI) +
          (random - 0.5) * 120 * 0.25,
      ),
    );
    expect(history(med)).toHaveLength(60);
    expect(history(med)[0]).toEqual({ day: -60, actual: expected });
  });

  it("flags stockout only when demand strictly exceeds stock", () => {
    expect(daysToStockout(200, [100, 100])).toBeNull();
    expect(daysToStockout(200, [100, 100, 1])).toBe(3);
  });

  it("maps spreadsheet aliases, numbers, dates and extra columns", () => {
    const mapping = detectColumns(["Medicine Name", "Qty", "Daily_Usage", "Expiry", "Batch"]);
    const rows = mapRows(
      [
        { "Medicine Name": "  Sample medicine ", Qty: "1,200", Daily_Usage: "12", Expiry: 25569, Batch: "B1" },
        { "Medicine Name": "" },
      ],
      mapping,
    );
    expect(rows).toEqual([
      { name: "Sample medicine", category: "", stock: 1200, daily_usage: 12, expiry_date: "1970-01-01", extra: { Batch: "B1" } },
    ]);
  });

  it("uses guest stock/usage with matching medicine parameters", () => {
    const result = guestMedicines([
      { id: "guest-id", name: "Amoxicillin 500mg", category: "Antibiotic", stock: 45, daily_usage: 3, expiry_date: null },
    ]);
    expect(result[0]).toMatchObject({ id: "amox", stock: 45, base: 3, seasonAmp: 0.18 });
    expect(guestMedicines([])).toEqual([]);
  });

  it("keeps all four supplier entries in order", () => {
    expect(SUPPLIERS.map((s) => [s.name, s.distanceKm, s.phone, s.open24h])).toEqual([
      ["Sharma Medical Store", 1.2, "+91 98220 12345", true],
      ["City Pharma Wholesale", 3.8, "+91 98220 67890", false],
      ["Green Cross Pharmacy", 2.4, "+91 98220 24680", true],
      ["District Drug Depot", 6.5, "+91 98220 13579", false],
    ]);
  });
});
