import { useEffect } from "react";
import { Route, Routes, useLocation } from "react-router-dom";
import Layout from "./components/Layout.jsx";
import Home from "./pages/Home.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Inventory from "./pages/Inventory.jsx";
import ImportPage from "./pages/Import.jsx";
import Suppliers from "./pages/Suppliers.jsx";
import Explain from "./pages/Explain.jsx";
import Auth from "./pages/Auth.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import NotFound from "./pages/NotFound.jsx";

const TITLES = {
  "/": "Stockout Shield — Never run out of essential medicines",
  "/dashboard": "Demand forecast — Stockout Shield",
  "/inventory": "Medicine inventory — Stockout Shield",
  "/import": "Import Excel — Stockout Shield",
  "/suppliers": "Emergency suppliers — Stockout Shield",
  "/explain": "How forecasts work — Stockout Shield",
  "/auth": "Sign in — Stockout Shield",
  "/reset-password": "Reset your password — Stockout Shield",
};

export default function App() {
  const { pathname } = useLocation();
  useEffect(() => {
    document.title = TITLES[pathname] ?? "Page not found — Stockout Shield";
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="inventory" element={<Inventory />} />
        <Route path="import" element={<ImportPage />} />
        <Route path="suppliers" element={<Suppliers />} />
        <Route path="explain" element={<Explain />} />
        <Route path="auth" element={<Auth />} />
        <Route path="reset-password" element={<ResetPassword />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
