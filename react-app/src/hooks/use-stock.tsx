import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { MEDICINES, type Medicine } from "@/lib/forecast";
import type { StockRow } from "@/lib/excel-import";
import type { Json } from "@/integrations/supabase/types";

export type SavedStock = Omit<StockRow, "extra"> & { id: string };
const GUEST_KEY = "stockout-shield-guest-v1";
type StockContextValue = {
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
const StockContext = createContext<StockContextValue | null>(null);

export function StockProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [guest, setGuest] = useState<SavedStock[] | null>(null);
  const [rows, setRows] = useState<SavedStock[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const stored: unknown = JSON.parse(sessionStorage.getItem(GUEST_KEY) ?? "null");
      if (Array.isArray(stored)) setGuest(stored);
    } catch {
      /* Ignore invalid guest storage. */
    }
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
      setReady(true);
    });
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (event === "PASSWORD_RECOVERY" && window.location.pathname !== "/reset-password")
        window.location.assign(`/reset-password${window.location.hash}`);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  async function refresh() {
    if (!user) {
      setRows([]);
      return;
    }
    const { data, error } = await supabase
      .from("medicine_stock")
      .select("id,name,category,stock,daily_usage,expiry_date")
      .order("name");
    if (error) throw error;
    setRows(data ?? []);
  }
  useEffect(() => {
    refresh().catch(() => setRows([]));
  }, [user]);
  function updateGuest(next: SavedStock[]) {
    sessionStorage.setItem(GUEST_KEY, JSON.stringify(next));
    setGuest(next);
  }
  async function add(incoming: StockRow[]) {
    if (guest !== null) {
      updateGuest([
        ...guest,
        ...incoming.map(({ extra: _extra, ...row }) => ({ ...row, id: crypto.randomUUID() })),
      ]);
      return;
    }
    const payload = incoming.map((row) => ({
      ...row,
      extra: JSON.parse(JSON.stringify(row.extra)) as Json,
    }));
    const { error } = await supabase.from("medicine_stock").insert(payload);
    if (error) throw error;
    await refresh();
  }
  async function remove(id: string) {
    if (guest !== null) {
      updateGuest(guest.filter((row) => row.id !== id));
      return;
    }
    const { error } = await supabase.from("medicine_stock").delete().eq("id", id);
    if (error) throw error;
    await refresh();
  }
  function enterGuest() {
    updateGuest(
      MEDICINES.map((m) => ({
        id: m.id,
        name: m.name,
        category: m.id === "para" ? "Pain relief" : m.category,
        stock: m.stock,
        daily_usage: m.base,
        expiry_date: "2027-12-31",
      })),
    );
  }
  async function leave() {
    if (guest !== null) {
      sessionStorage.removeItem(GUEST_KEY);
      setGuest(null);
    } else {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
    }
  }
  return (
    <StockContext.Provider
      value={{ user, guest, ready, rows: guest ?? rows, refresh, add, remove, enterGuest, leave }}
    >
      {children}
    </StockContext.Provider>
  );
}

export function useStock() {
  const value = useContext(StockContext);
  if (!value) throw new Error("StockProvider is required");
  return value;
}
export function guestMedicines(guest: SavedStock[] | null): Medicine[] {
  if (guest === null) return MEDICINES;
  const fallback = MEDICINES[0];
  if (!fallback) return [];
  return guest.map((row) => {
    const match = MEDICINES.find((m) => m.name === row.name);
    return {
      ...(match ?? fallback),
      id: match?.id ?? row.id,
      name: row.name,
      stock: row.stock,
      base: row.daily_usage || 0,
    };
  });
}
