import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
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
import { useStock } from "@/hooks/use-stock";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutGrid },
  { to: "/dashboard", label: "Demand forecast", icon: ChartNoAxesCombined },
  { to: "/inventory", label: "Inventory", icon: Package },
  { to: "/import", label: "Import Excel", icon: FileSpreadsheet },
  { to: "/suppliers", label: "Emergency suppliers", icon: Truck },
  { to: "/explain", label: "How it works", icon: CircleHelp },
] as const;

export function AppHeader({ active }: { active: string }) {
  const { user, guest, leave } = useStock();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function handleSignOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await leave();
    navigate({ to: "/auth", replace: true });
  }

  return (
    <>
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
            <Link
              key={n.to}
              to={n.to}
              aria-current={active === n.to ? "page" : undefined}
              className={`sidebar-link ${active === n.to ? "is-active" : ""}`}
            >
              <n.icon />
              <span>{n.label}</span>
              {active === n.to && <span className="active-dot" />}
            </Link>
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
      <header className="app-topbar">
        <div className="topbar-location">
          Workspace <span>/</span>{" "}
          <strong>{NAV.find((n) => n.to === active)?.label ?? "Account"}</strong>
        </div>
        <div className="topbar-actions">
          <span className="demo-tag">
            <span /> {guest !== null ? "Guest workspace" : "Demo workspace"}
          </span>
          {user || guest !== null ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              title={user?.email ?? "Exit guest mode"}
            >
              <LogOut />
              {guest !== null ? "Exit guest" : "Sign out"}
            </Button>
          ) : (
            <Button size="sm" asChild>
              <Link to="/auth">
                Sign in <ArrowUpRight />
              </Link>
            </Button>
          )}
        </div>
      </header>
      {guest !== null && (
        <div className="guest-banner">
          <span className="workspace-dot" />
          Guest mode · Demo data only
        </div>
      )}
    </>
  );
}
