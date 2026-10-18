import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, expect, it } from "vitest";
import { StockContext, type StockContextValue } from "@/hooks/stock-context";
import { useStock } from "@/hooks/use-stock";

afterEach(cleanup);

it("connects stock consumers to the shared provider context", () => {
  const value: StockContextValue = {
    user: null, guest: [], ready: true,
    rows: [{ id: "test", name: "Medicine", category: "", stock: 300, daily_usage: 10, expiry_date: null }],
    refresh: async () => {}, add: async () => {}, remove: async () => {},
    enterGuest: () => {}, leave: async () => {},
  };
  function Consumer() {
    const stock = useStock();
    return <output>{stock.rows[0]?.stock}</output>;
  }
  const view = render(<StockContext.Provider value={value}><Consumer /></StockContext.Provider>);
  expect(screen.getByRole("status")).toHaveTextContent("300");
  view.rerender(<StockContext.Provider value={{ ...value, rows: [{ ...value.rows[0], id: "test", name: "Medicine", category: "", stock: 120, daily_usage: 10, expiry_date: null }] }}><Consumer /></StockContext.Provider>);
  expect(screen.getByRole("status")).toHaveTextContent("120");
});