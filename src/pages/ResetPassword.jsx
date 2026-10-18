import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase.js";
import SetupNotice from "../components/SetupNotice.jsx";

export default function ResetPassword() {
  const [valid, setValid] = useState(false);
  const [message, setMessage] = useState("Checking your reset link…");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    if (!supabase) return;
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
      setMessage(recovery ? "" : "This reset link is invalid or expired. Request a new one from the sign-in page.");
    }, 1500);
    return () => {
      data.subscription.unsubscribe();
      window.clearTimeout(timer);
    };
  }, []);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      navigate("/inventory");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-content">
      <p className="eyebrow">ACCOUNT RECOVERY</p>
      <h1>Choose a new password.</h1>
      {!supabase ? <SetupNotice /> : <p role="status">{message}</p>}
      {valid && (
        <form onSubmit={submit} className="stack-md">
          <label className="field">
            <span>New password</span>
            <input
              className="input"
              type="password"
              required
              minLength={6}
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          <button className="btn btn-primary btn-block" disabled={busy}>
            {busy ? "Updating…" : "Update password"}
          </button>
        </form>
      )}
      <Link className="btn btn-link" to="/auth">
        Back to sign in
      </Link>
    </div>
  );
}
