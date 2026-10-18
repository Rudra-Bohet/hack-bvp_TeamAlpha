import { createContext, type Context } from "react";
import type { User } from "@supabase/supabase-js";
import type { StockRow } from "@/lib/excel-import";

export type SavedStock = Omit<StockRow, "extra"> & { id: string };
export type StockContextValue = {
  user: User | null;
  guest: SavedStock[] | null;
  ready: boolean;
  rows: SavedStock[];
  refresh: () => Promise<void>;
  add: (rows: StockRow[]) => Promise<void>;
  remove: (id: string) => Promise<void>;
  enterGuest: () => void;
  leave: () => Promise<void>;
};

// Keep provider and consumers on the same context, even during live code updates.
export const StockContext: Context<StockContextValue | null> =
  import.meta.hot?.data?.stockContext ?? createContext<StockContextValue | null>(null);

if (import.meta.hot) {
  import.meta.hot.dispose?.((data) => {
    data.stockContext = StockContext;
  });
}