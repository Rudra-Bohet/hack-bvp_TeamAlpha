import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Shield } from "lucide-react";
import { supabase, isSupabaseConfigured, googleSignInEnabled } from "../lib/supabase.js";
import { useStock } from "../context/StockContext.jsx";
import SetupNotice from "../components/SetupNotice.jsx";

const SHOP_TYPES = [
  { id: "seller", label: "Seller / Distributor" },
  { id: "medical_shop", label: "Medical shop" },
  { id: "hospital", label: "Hospital" },
];

const errorText = (err, fallback) => (err instanceof Error ? err.message : fallback);

export default function Auth() {
  const navigate = useNavigate();
  const { enterGuest, guest, user, leave } = useStock();
  const [mode, setMode] = useState("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [shopType, setShopType] = useState("medical_shop");
  const [address, setAddress] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  async function handleEmail(e) {
    e.preventDefault();
    if (!supabase) return;
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
          navigate("/inventory");
          return;
        }
        setMessage({ kind: "info", text: "Check your email to confirm your account, then sign in." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate("/inventory");
      }
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err, "Something went wrong") });
    } finally {
      setBusy(false);
    }
  }

  async function handleGoogle() {
    if (!supabase) return;
    setBusy(true);
    setMessage(null);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth` },
    });
    if (error) {
      setMessage({ kind: "error", text: error.message || "Sign-in failed" });
      setBusy(false);
    }
  }

  async function forgotPassword() {
    if (!supabase) return;
    if (!email) {
      setMessage({ kind: "error", text: "Enter your account email above first, then click “Forgot your password?”." });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });
      if (error) throw error;
      setMessage({ kind: "info", text: "Password reset email requested — check your inbox." });
    } catch (err) {
      setMessage({ kind: "error", text: errorText(err, "Could not request reset email") });
    } finally {
      setBusy(false);
    }
  }

  if (user || guest !== null) {
    return (
      <div className="auth-content">
        <p className="eyebrow">YOUR MEDICINE WORKSPACE</p>
        <h1>You're in.</h1>
        <p>{guest !== null ? "Guest demo session" : `Signed in as ${user.email}`}</p>
        <div className="button-row">
          <Link className="btn btn-primary" to="/inventory">
            Open inventory
          </Link>
          <button className="btn btn-outline" onClick={() => leave()}>
            {guest !== null ? "Exit guest mode" : "Sign out"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-content">
      <p className="eyebrow">YOUR MEDICINE WORKSPACE</p>
      <h1>{mode === "signin" ? "Welcome back." : "Better care starts here."}</h1>
      <p>{mode === "signin" ? "Sign in to keep your supply a step ahead." : "Create your Stockout Shield account."}</p>

      {!isSupabaseConfigured && <SetupNotice />}

      <div className="auth-brand">
        <div className="auth-brand-mark">
          <Shield />
        </div>
        <div>
          <div className="strong">Stockout Shield</div>
          <div className="muted small">{mode === "signin" ? "Sign in to your account" : "Create your account"}</div>
        </div>
      </div>

      <div className="segmented" role="tablist">
        <button role="tab" aria-selected={mode === "signin"} className={mode === "signin" ? "is-active" : ""} onClick={() => setMode("signin")}>
          Sign in
        </button>
        <button role="tab" aria-selected={mode === "signup"} className={mode === "signup" ? "is-active" : ""} onClick={() => setMode("signup")}>
          Sign up
        </button>
      </div>

      <form onSubmit={handleEmail} className="stack-md">
        {mode === "signup" && (
          <>
            <label className="field">
              <span>Full name</span>
              <input className="input" value={fullName} onChange={(e) => setFullName(e.target.value)} />
            </label>
            <label className="field">
              <span>Shop type</span>
              <select className="input" value={shopType} onChange={(e) => setShopType(e.target.value)}>
                {SHOP_TYPES.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Address</span>
              <input className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
            </label>
          </>
        )}
        <label className="field">
          <span>Email</span>
          <input className="input" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label className="field">
          <span>Password</span>
          <input
            className="input"
            type="password"
            autoComplete={mode === "signin" ? "current-password" : "new-password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
          />
        </label>
        {message && (
          <p role="status" className={message.kind === "error" ? "text-danger small" : "text-success small"}>
            {message.text}
          </p>
        )}
        <button type="submit" className="btn btn-primary btn-block" disabled={busy || !isSupabaseConfigured}>
          {busy ? "Please wait…" : mode === "signin" ? "Sign in" : "Create account"}
        </button>
      </form>
      <button className="btn btn-link" onClick={forgotPassword} disabled={busy || !isSupabaseConfigured}>
        Forgot your password?
      </button>

      <div className="divider">or</div>

      <div className="stack-sm">
        {googleSignInEnabled && (
          <button className="btn btn-outline btn-block" onClick={handleGoogle} disabled={busy || !isSupabaseConfigured}>
            Continue with Google
          </button>
        )}
        <button
          className="btn btn-outline btn-block"
          onClick={() => {
            enterGuest();
            navigate("/inventory");
          }}
          disabled={busy}
        >
          Continue as guest
        </button>
      </div>
    </div>
  );
}
