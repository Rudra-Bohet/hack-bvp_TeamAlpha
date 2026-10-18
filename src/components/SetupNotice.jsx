// Shown wherever an account feature is used before Supabase credentials are added to .env.
export default function SetupNotice() {
  return (
    <div className="notice notice-warning">
      <strong>Supabase is not connected yet.</strong>
      <p>
        Copy <code>.env.example</code> to <code>.env</code>, add your project's{" "}
        <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code>, then restart the dev
        server. Guest mode works without it.
      </p>
    </div>
  );
}
