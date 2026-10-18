import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Shield } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import "@lovable.dev/cloud-auth-js/styles.css";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AppHeader } from "@/components/AppHeader";
import { useStock } from "@/hooks/use-stock";
import { Link } from "@tanstack/react-router";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Stockout Shield" },
      {
        name: "description",
        content: "Sign in to Stockout Shield to manage your medicine inventory and orders.",
      },
      { property: "og:title", content: "Sign in — Stockout Shield" },
      {
        property: "og:description",
        content: "Sign in to Stockout Shield to manage your medicine inventory and orders.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

const SHOP_TYPES = [
  { id: "seller", label: "Seller / Distributor" },
  { id: "medical_shop", label: "Medical shop" },
  { id: "hospital", label: "Hospital" },
];

function AuthPage() {
  const navigate = useNavigate();
  const { enterGuest, guest, user, leave } = useStock();
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [shopType, setShopType] = useState("medical_shop");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ kind: "error" | "info"; text: string } | null>(null);

  async function handleEmail(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth`,
            data: { full_name: fullName, shop_type: shopType, address },
          },
        });
        if (error) throw error;
        if (data.session) {
          navigate({ to: "/inventory" });
          return;
        }
        setMessage({
          kind: "info",
          text: "Check your email to confirm your account, then sign in.",
        });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/inventory" });
      }
    } catch (err) {
      setMessage({
        kind: "error",
        text: err instanceof Error ? err.message : "Something went wrong",
      });
    } finally {
      setBusy(false);
    }
  }

  async function handleOAuth(provider: "google" | "lovable") {
    setBusy(true);
    setMessage(null);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: `${window.location.origin}/auth`,
      });
      if (result.error) {
        setMessage({ kind: "error", text: result.error.message ?? "Sign-in failed" });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      navigate({ to: "/inventory" });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Sign-in failed",
      });
    } finally {
      setBusy(false);
    }
  }

  async function forgotPassword() {
    const accountEmail = email || window.prompt("Enter your account email:");
    if (!accountEmail) return;
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(accountEmail, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ kind: "info", text: "Password reset email requested — check your inbox." });
    } catch (error) {
      setMessage({
        kind: "error",
        text: error instanceof Error ? error.message : "Could not request reset email",
      });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader active="/auth" />
      <main>
        <div className="auth-content">
          <p className="eyebrow">YOUR MEDICINE WORKSPACE</p>
          <h1>{mode === "signin" ? "Welcome back." : "Better care starts here."}</h1>
          <p>
            {mode === "signin"
              ? "Sign in to keep your supply a step ahead."
              : "Create your Stockout Shield account."}
          </p>
          {user || guest !== null ? (
            <div className="space-y-4">
              <p className="text-sm">
                {guest !== null ? "Guest demo session" : `Signed in as ${user?.email}`}
              </p>
              <Button asChild>
                <Link to="/inventory">Open inventory</Link>
              </Button>
              <Button
                variant="outline"
                onClick={async () => {
                  await leave();
                }}
              >
                {guest !== null ? "Exit guest mode" : "Sign out"}
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-6 flex items-center gap-3">
                <div className="rounded-md bg-primary p-2 text-primary-foreground">
                  <Shield className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-lg font-bold">Stockout Shield</h1>
                  <p className="text-xs text-muted-foreground">
                    {mode === "signin" ? "Sign in to your account" : "Create your account"}
                  </p>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-1 rounded-md bg-muted p-1 text-sm">
                <Button
                  variant="ghost"
                  onClick={() => setMode("signin")}
                  className={`rounded px-3 py-1.5 ${mode === "signin" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
                >
                  Sign in
                </Button>
                <Button
                  variant="ghost"
                  onClick={() => setMode("signup")}
                  className={`rounded px-3 py-1.5 ${mode === "signup" ? "bg-card font-medium shadow-sm" : "text-muted-foreground"}`}
                >
                  Sign up
                </Button>
              </div>

              <form onSubmit={handleEmail} className="space-y-4">
                {mode === "signup" && (
                  <>
                    <div className="space-y-1.5">
                      <Label htmlFor="name">Full name</Label>
                      <Input
                        id="name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="shoptype">Shop type</Label>
                      <select
                        id="shoptype"
                        value={shopType}
                        onChange={(e) => setShopType(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      >
                        {SHOP_TYPES.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="address">Address</Label>
                      <Input
                        id="address"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                      />
                    </div>
                  </>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                {message && (
                  <p
                    className={`text-sm ${message.kind === "error" ? "text-destructive" : "text-success"}`}
                  >
                    {message.text}
                  </p>
                )}
                <Button type="submit" className="w-full" disabled={busy}>
                  {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
                </Button>
              </form>
              <Button
                variant="link"
                className="mt-2 px-0 text-xs"
                onClick={forgotPassword}
                disabled={busy}
              >
                Forgot your password?
              </Button>

              <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
                <div className="h-px flex-1 bg-border" /> or{" "}
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="space-y-2">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuth("google")}
                  disabled={busy}
                >
                  Continue with Google
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => handleOAuth("lovable")}
                  disabled={busy}
                >
                  Continue with Lovable
                </Button>
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    enterGuest();
                    navigate({ to: "/inventory" });
                  }}
                  disabled={busy}
                >
                  Continue as guest
                </Button>
              </div>
            </>
          )}
        </div>
      </main>
    </div>
  );
}
