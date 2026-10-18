import { describe, it, expect } from "vitest";
import { daysToStockout } from "@/lib/forecast";

describe("daysToStockout", () => {
  it("returns the day cumulative demand exceeds stock", () => {
    expect(daysToStockout(250, [100, 100, 100])).toBe(3);
  });
  it("returns null when stock lasts the horizon", () => {
    expect(daysToStockout(500, [100, 100])).toBeNull();
  });
});
