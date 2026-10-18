// Supabase browser client. Credentials come from .env (see .env.example).
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes("YOUR_PROJECT_REF"),
);

export const googleSignInEnabled = import.meta.env.VITE_ENABLE_GOOGLE_SIGNIN === "true";

// null when credentials are missing, so guest mode still works and pages can show a setup notice.
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
    })
  : null;
