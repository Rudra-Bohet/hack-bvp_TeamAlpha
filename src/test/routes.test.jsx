import { describe, expect, it } from "vitest";
import { renderToString } from "react-dom/server";
import { MemoryRouter } from "react-router-dom";
import App from "../App.jsx";
import { StockProvider } from "../context/StockContext.jsx";

const render = (path) =>
  renderToString(
    <MemoryRouter initialEntries={[path]}>
      <StockProvider>
        <App />
      </StockProvider>
    </MemoryRouter>,
  );

describe("every route renders", () => {
  it.each([
    ["/", "A clearer view. Better prepared."],
    ["/dashboard", "Demand forecast"],
    ["/inventory", "Inventory"],
    ["/import", "Import from Excel"],
    ["/suppliers", "Sharma Medical Store"],
    ["/explain", "How each forecast is built"],
    ["/auth", "Continue as guest"],
    ["/reset-password", "Choose a new password."],
    ["/missing-page", "Page not found"],
  ])("%s", (path, text) => {
    expect(render(path)).toContain(text);
  });
});
