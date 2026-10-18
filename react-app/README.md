# Stockout Shield — React refresh

A polished React workspace for medicine demand forecasting, inventory management, spreadsheet import, and emergency supplier discovery, based on [Team Alpha’s original project](https://github.com/Rudra-Bohet/hack-bvp_TeamAlpha).

## Branch and original source

The `react-glow-up` branch preserves the original HTML/CSS/JavaScript project at the repository root and adds the new application in `react-app/`. The original `main` branch is untouched. Within Lovable, the React application itself is the project root.

The redesign retains the original account, guest, import, inventory, supplier, and forecasting workflows. It adds a visual overview of existing data rather than replacing the original working pages.

## Technology

- **React 19 + TypeScript** — organized, reusable interface components.
- **TanStack Start + TanStack Router** — supported application runtime and file-based routing.
- **Vite + Tailwind CSS v4** — development tooling and semantic design tokens.
- **Recharts** — interactive demand and breakdown charts.
- **SheetJS (`xlsx`)** — spreadsheet parsing, loaded when a file is selected.
- **Lovable Cloud** — account authentication and owner-scoped inventory storage.
- **Vitest** — behavior regression tests.

## Getting started

Use a recent Node.js release (22 or newer recommended) and Bun, or npm.

```sh
git clone https://github.com/Rudra-Bohet/hack-bvp_TeamAlpha.git
cd hack-bvp_TeamAlpha
git switch react-glow-up
cd react-app
bun install
```

Create a local `.env` using the public settings for the **same account service as your intended deployment**:

```dotenv
VITE_SUPABASE_URL=<configured public account-service URL>
VITE_SUPABASE_PUBLISHABLE_KEY=<configured publishable key>
```

These placeholders are not credentials. Do not commit `.env`, private keys, account tokens, or connector secrets. Server-rendered deployments also require the matching server-side `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`, configured through the hosting environment. Managed Lovable deployments provide their environment settings.

```sh
bun run dev           # Local development
bun run test          # Regression tests
bun run lint          # Code conventions
bun run format        # Source formatting
bun run build         # Deployment build
bun run preview       # Preview build output
```

With npm, use `npm install` and `npm run <script>`. The React app requires its supported application runtime; do not open it by double-clicking an HTML file. The preserved original static version remains separately available at the repository root.

## Project organization

```text
react-app/
  src/
    assets/                   Pharmacy photography
    components/
      AppHeader.tsx           Shared navigation, account actions, guest banner
      PageHeading.tsx         Consistent page headings
      ui/                     Reusable accessible controls
    hooks/use-stock.tsx       Shared account stock and isolated guest sessions
    integrations/             Managed account/database clients
    lib/
      forecast.ts             Deterministic forecasting engine
      excel-import.ts         Spreadsheet header detection and row mapping
      suppliers.ts            Original demo supplier directory
    routes/                   React pages and page-specific metadata
    test/                     Logic and routing regression tests
    styles.css                Semantic palette, typography and page layouts
  drizzle/migrations/         Existing profile/inventory schema documentation
  AGENTS.md                   Architecture and maintenance rules
  package.json
```

Presentation is separate from calculation and spreadsheet logic. Inventory and import share one stock source, so a saved or deleted row is reflected on both pages. Guest inventory is deliberately isolated from account inventory.

## Pages and workflows

| Path              | Contents                                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------------------------- |
| `/`               | Overview, medicine photography, stock summary, demand chart, watchlist and workflow links                           |
| `/dashboard`      | Medicine selection, four scenarios, 7–90-day forecast horizon, historical observations, bounds and reorder estimate |
| `/inventory`      | Account or guest stock, manual medicine addition, deletion, daily usage, days of cover and expiry                   |
| `/import`         | Excel/CSV upload, automatic/manual header mapping, preview, save and saved-stock deletion                           |
| `/suppliers`      | All four original demo suppliers, opening-hour labels, Call and WhatsApp                                            |
| `/auth`           | Email sign-in/signup, Google, guest entry, active-account view and password reset request                           |
| `/reset-password` | Recovery-link checking and new password submission                                                                  |
| `/explain`        | Supplementary forecast component explanation from the existing React app                                            |

Existing supplementary React features, including scenario intensity, breakdown charts, Lovable sign-in, supplier email links and simulated request history, remain available. These additions do not transmit actual orders.

## Account behavior and persistence

Email/password sign-in opens inventory. Sign-up retains optional name/address metadata, the three original shop types, and a minimum six-character password. Account inventory is read from and written to the existing `medicine_stock` table.

The existing migrations document `profiles`, `medicine_stock`, and owner-scoped row-level access policies. No schema or permission changes were introduced for the refresh. Do not reapply create-table migrations to an existing database. Point this application at the intended existing account service; this branch does not copy accounts or inventory between deployments.

Google and Lovable providers must be enabled in the deployed account configuration. Confirmation and password-reset links need authorized same-origin public redirect URLs. Password-reset emails target `/reset-password`. Browser UI and source review alone do not establish email delivery or social-provider configuration.

## Guest mode

“Continue as guest” creates the original four demo medicines with expiry `2027-12-31`. Changes are stored in the tab’s `sessionStorage` under `stockout-shield-guest-v1`. Manual additions, imports, deletions, navigation and reload retain the guest session. Exiting clears guest data. Guest writes never affect real account inventory.

Guest forecasts use guest rows’ stock and daily usage. Exact medicine-name matches retain the original seasonal/trend parameters and canonical IDs. Unknown medicines inherit the first original medicine’s seasonal/trend parameters while retaining their own name, stock, usage and ID. Empty guest inventory shows no medicine selection and a zero-stock forecast.

As in the original project, real-account forecasts use the fixed demonstration medicines rather than automatically reading saved account stock.

## Spreadsheet import rules

- Accept `.xlsx`, `.xls` and `.csv`, reading all sheets in workbook order.
- Recognize original aliases for medicine name, category, stock, daily usage and expiry.
- Normalize header case, whitespace, underscores and hyphens; allow manual remapping.
- Remove commas before parsing numbers; invalid/non-finite numbers become zero.
- Convert Excel numeric dates with the original serial-date calculation; blank/invalid dates become null.
- Trim medicine names and omit blank-name rows.
- Preview at most 50 rows, but save every mapped row.
- Preserve unmapped columns in account-row `extra`; guest imports omit them, as originally.
- Keep original insert behavior: no deduplication, upsert or additional row-validation rules.

Manual inventory addition requires a trimmed medicine name and nonnegative stock/usage. Import validation is intentionally not replaced with manual-add validation.

## Forecast calculations

This is an **illustrative deterministic engine**, not a trained ARIMA, Prophet or XGBoost model. The simulated day-of-year remains **200**, independent of the actual calendar date. History retains 60 seeded observations.

For baseline `B`, seasonal amplitude `A`, peak `P`, daily trend `T`, boost `b` and forecast day `d`:

```text
seasonal = B × A × cos((((200 + d) % 365 − P) / 365) × 2π)
base     = B + seasonal + B × T × d
forecast = base × (1 + b × min(1, d / 7))
spread   = forecast × (0.08 + 0.006 × d) × (1 + b × 0.5)
lower    = max(0, forecast − spread)
upper    = forecast + spread
```

| Scenario               | Original boosts                                |
| ---------------------- | ---------------------------------------------- |
| Baseline               | None                                           |
| Seasonal malaria surge | Artemether-Lumefantrine +40%, paracetamol +12% |
| Rising antibiotic need | Amoxicillin +35%, paracetamol +8%              |
| Outbreak response      | ORS +80%, amoxicillin +15%, paracetamol +15%   |

The existing intensity slider multiplies the boost. Intensity 1 preserves original calculations. Stockout is the first day cumulative demand **strictly exceeds** stock; exact depletion does not trigger it. Reorder uses `max(0, sum(upper bounds) − stock)`.

Inventory cover is a separate calculation based on entered `stock / daily_usage`. Under 7 days is critical, under 30 is warning, and 30 or more is healthy. Nonpositive daily usage displays no estimate.

Shaded bounds and existing accuracy summaries are illustrative, not calibrated clinical or statistical guarantees. Forecasts support, rather than replace, professional judgement.

## Supplier directory

All original suppliers retain their order, distances, numbers and opening-hour labels:

1. Sharma Medical Store — 1.2 km, open 24 hours.
2. City Pharma Wholesale — 3.8 km, day hours.
3. Green Cross Pharmacy — 2.4 km, open 24 hours.
4. District Drug Depot — 6.5 km, day hours.

These are **unverified demonstration contacts and distances**, not a live stock or location service. Call and WhatsApp open external applications. Simulated requests remain local UI history; no purchases or messages are automatically sent.

## Testing

`bun run test` runs route and behavior regression tests. Original-parity tests cover forecast equations, seeded history, strict stockout boundaries, spreadsheet aliases and conversion, guest forecast inputs, supplier values, and inventory-cover thresholds.

Browser verification includes guest entry, medicine addition, spreadsheet import, inventory readback, session persistence after reload, forecast controls, complete supplier availability, and phone-sized layout. Authenticated inventory checks use a real managed session where available. External email delivery, social OAuth completion and receipt of recovery emails require their external services and mailbox access and must be verified separately.

## Deployment and compatibility

Deploy the `react-app/` directory with a TanStack Start-compatible target and its configured environment settings. Keep the original static files intact. Existing `.html` URLs continue to refer to the preserved static pages rather than React aliases. The React app has its own paths listed above.

The refresh is isolated on `react-glow-up`. Review it before merging; `main` and the original source are not overwritten. Avoid committing dependencies, build output, `.env`, Git metadata or private credentials.

## Scope and limitations

This refresh improves visual presentation, shared navigation, organization and documentation, while retaining the original workflows. It does not add live supplier ordering, trained forecasting, clinical validation, geolocation, automatic stock replenishment, or cross-deployment data migration.
