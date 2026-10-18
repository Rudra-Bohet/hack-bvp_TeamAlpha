import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Reset your password — Stockout Shield" },
      { name: "description", content: "Securely reset your Stockout Shield account password." },
      { property: "og:title", content: "Reset your password — Stockout Shield" },
      { property: "og:description", content: "Recover access to your medicine workspace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});
function ResetPassword() {
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState("Checking your reset link…");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  useEffect(() => {
    let recovery = window.location.hash.includes("type=recovery");
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        recovery = true;
        setValid(true);
        setMessage("");
      }
    });
    const timer = window.setTimeout(() => {
      setValid(recovery);
      setMessage(
        recovery
          ? ""
          : "This reset link is invalid or expired. Request a new one from the sign-in page.",
      );
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate({ to: "/inventory" });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="min-h-screen">
      <AppHeader active="/auth" />
      <main>
        <div className="auth-content">
          <p className="eyebrow">ACCOUNT RECOVERY</p>
          <h1>Choose a new password.</h1>
          <p role="status">{message}</p>
          {valid && (
            <form onSubmit={submit} className="space-y-4">
              <Label htmlFor="new-password">New password</Label>
              <Input
                id="new-password"
                type="password"
                required
                minLength={6}
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Button disabled={busy} className="w-full">
                {busy ? "Updating…" : "Update password"}
              </Button>
            </form>
          )}
          <Button asChild variant="link" className="mt-4 px-0">
            <Link to="/auth">Back to sign in</Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
