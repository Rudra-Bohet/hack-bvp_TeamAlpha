import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { StockProvider } from "./context/StockContext.jsx";
import "./styles.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <BrowserRouter>
      <StockProvider>
        <App />
      </StockProvider>
    </BrowserRouter>
  </StrictMode>,
);
