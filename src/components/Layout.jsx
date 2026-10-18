import { Link, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import {
  ShieldCheck,
  LogOut,
  LayoutGrid,
  ChartNoAxesCombined,
  Package,
  FileSpreadsheet,
  Truck,
  CircleHelp,
  ArrowUpRight,
  Plus,
} from "lucide-react";
import { useStock } from "../context/StockContext.jsx";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/dashboard", label: "Demand forecast", icon: ChartNoAxesCombined },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/import", label: "Import Excel", icon: FileSpreadsheet },
  { to: "/suppliers", label: "Emergency suppliers", icon: Truck },
  { to: "/explain", label: "How it works", icon: CircleHelp },
];

export default function Layout() {
  const { user, guest, leave } = useStock();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const current = NAV.find((n) => n.to === pathname)?.label ?? "Account";

  async function handleSignOut() {
    await leave();
    navigate("/auth", { replace: true });
  }

  return (
    <div className="shell">
      <aside className="app-sidebar">
        <Link to="/" className="brand">
          <span className="brand-mark">
            <ShieldCheck />
          </span>
          <span>
            stockout<span className="brand-light">shield</span>
            <small>MEDICINE. MANAGED.</small>
          </span>
        </Link>
        <div className="workspace-label">
          <span className="workspace-symbol">
            <Plus />
          </span>
          <div>
            Medicine workspace<small>Stockout Shield</small>
          </div>
          <span className="workspace-dot" />
        </div>
        <p className="nav-caption">WORKSPACE</p>
        <nav aria-label="Main navigation">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              end
              className={({ isActive }) => `sidebar-link ${isActive ? "is-active" : ""}`}
            >
              {({ isActive }) => (
                <>
                  <n.icon />
                  <span>{n.label}</span>
                  {isActive && <span className="active-dot" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="care-note">
            <ShieldCheck />
            <strong>
              A little foresight.
              <br />A healthier tomorrow.
            </strong>
            <span>Better supply. Better care.</span>
          </div>
          <div className="sidebar-foot">
            <span className="workspace-dot" /> Stockout Shield <span>v1.0</span>
          </div>
        </div>
      </aside>

      <div className="shell-main">
        <header className="app-topbar">
          <div className="topbar-location">
            Workspace <span>/</span> <strong>{current}</strong>
          </div>
          <div className="topbar-actions">
            <span className="demo-tag">
              <span /> {guest !== null ? "Guest workspace" : user ? user.email : "Demo workspace"}
            </span>
            {user || guest !== null ? (
              <button className="btn btn-ghost btn-sm" onClick={handleSignOut}>
                <LogOut />
                {guest !== null ? "Exit guest" : "Sign out"}
              </button>
            ) : (
              <Link className="btn btn-primary btn-sm" to="/auth">
                Sign in <ArrowUpRight />
              </Link>
            )}
          </div>
        </header>
        {guest !== null && (
          <div className="guest-banner">
            <span className="workspace-dot" />
            Guest mode · Demo data only
          </div>
        )}
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
