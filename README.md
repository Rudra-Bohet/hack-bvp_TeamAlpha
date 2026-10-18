# Stockout Shield

Medicine demand forecasting, inventory tracking, spreadsheet import and emergency supplier discovery for medical shops, hospitals and distributors.

Built with **HTML, plain CSS and React (JavaScript)**, bundled by Vite, with **Supabase** for sign-in and per-user inventory storage.

---

## 1. Run it locally

You need Node.js 18 or newer.

```sh
cd stockout-shield-react
npm install
npm run dev        # opens http://localhost:5173
```

Other scripts:

```sh
npm test           # logic + route render tests
npm run build      # production build into dist/
npm run preview    # serve the production build locally
```

Guest mode (“Continue as guest”) works even before Supabase is connected.

---

## 2. Connect your own Supabase account

### a. Create the project

1. Sign in at **supabase.com** → **New project**.
2. Pick an organisation, a project name (e.g. `stockout-shield`), a strong database password, and the region closest to your users. Wait ~1 minute for it to provision.

### b. Create the tables and security rules

1. In the project dashboard open **SQL Editor → New query**.
2. Paste the full contents of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**.

This creates:

| Object | Purpose |
| --- | --- |
| `profiles` table | One row per user (name, shop type, address), auto-created on sign-up by a trigger |
| `medicine_stock` table | Each user's medicines, stock, daily usage and expiry |
| Row-level security policies | Each user can read/write **only their own** rows |

### c. Copy your API keys into the app

1. Go to **Project Settings → API** (or **Data API**).
2. Copy the **Project URL** and the **anon / public** key.
3. In this folder, copy `.env.example` to `.env` and fill them in:

```dotenv
VITE_SUPABASE_URL=https://abcdefghijklmnop.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGciOi...
VITE_ENABLE_GOOGLE_SIGNIN=false
```

4. Restart `npm run dev`.

> The anon key is designed to be public: row-level security is what protects the data. **Never** put the `service_role` key or your database password in this app or in `.env`.

### d. Configure authentication

In **Authentication → URL Configuration**:

| Setting | Local development | After publishing |
| --- | --- | --- |
| **Site URL** | `http://localhost:5173` | `https://your-domain.com` |
| **Redirect URLs** (add all) | `http://localhost:5173/auth`, `http://localhost:5173/reset-password` | `https://your-domain.com/auth`, `https://your-domain.com/reset-password` |

These are where Supabase sends people back after confirming their email or resetting a password. If a URL is missing from this list, the email links will fail.

In **Authentication → Providers → Email**:

- Email/password is on by default.
- **Confirm email** on (recommended): new users must click a link before signing in.
- Supabase's built-in mailer is rate-limited and meant for testing. For real users, set up your own SMTP server under **Authentication → Emails → SMTP Settings**.

### e. Optional: Google sign-in

1. Create an OAuth client (type *Web application*) in your Google Cloud console. As the authorised redirect URI, use the **Callback URL** shown in Supabase under **Authentication → Providers → Google**.
2. Paste the client ID and secret into that Supabase provider page and enable it.
3. Set `VITE_ENABLE_GOOGLE_SIGNIN=true` in `.env` and restart. The **Continue with Google** button only appears when this is `true`.

### f. Check it works

1. Open `/auth` → **Sign up**, then confirm the email.
2. Sign in, add a medicine on **Inventory**.
3. In Supabase, open **Table Editor → medicine_stock**: your row should be there with your `user_id`.

---

## 3. Publish the website

`npm run build` creates a static site in `dist/`: just HTML, CSS, JS and images. You can host it on any static hosting service, your own server, or a CDN. Every host needs the same four settings:

| Setting | Value |
| --- | --- |
| Root / base directory | `stockout-shield-react` (if the repo contains other folders) |
| Build command | `npm run build` |
| Output / publish directory | `dist` |
| Environment variables | `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally `VITE_ENABLE_GOOGLE_SIGNIN` |

**Single-page-app fallback (required).** The app uses clean URLs like `/inventory` and `/reset-password`. Your host must serve `index.html` for any path that isn't a real file. Otherwise refreshing a page, or opening a password-reset link, gives a 404. Look in your host's settings for “rewrites”, “SPA mode” or “fallback document” and point every path at `/index.html`.

On your own server with **nginx**:

```nginx
server {
  listen 80;
  server_name your-domain.com;
  root /var/www/stockout-shield/dist;
  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

On **Apache**, put this `.htaccess` in `dist/`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule . /index.html [L]
```

**After the first deploy:**

1. Go back to Supabase **Authentication → URL Configuration**. Set **Site URL** to your live address and add `https://your-domain.com/auth` and `https://your-domain.com/reset-password` to **Redirect URLs**.
2. If Google sign-in is on, add your live domain under *Authorised JavaScript origins* in the Google OAuth client.
3. Vite builds the environment variables into the bundle at build time. After changing them, **redeploy**.

---

## 4. Project structure

```text
stockout-shield-react/
  index.html                 HTML shell, fonts, favicon
  public/                    Static files copied as-is (favicon, robots.txt)
  supabase/schema.sql        Database tables + security policies (run once)
  src/
    main.jsx                 App entry: router + stock provider
    App.jsx                  Route table and page titles
    styles.css               All styling (plain CSS, design tokens at the top)
    assets/hero.jpg          Overview photo
    components/
      Layout.jsx             Sidebar, top bar, guest banner, page outlet
      PageHeading.jsx        Shared page heading
      SetupNotice.jsx        Shown when Supabase keys are missing
    context/StockContext.jsx Session, saved stock, guest-mode storage
    lib/
      supabase.js            Supabase client (reads .env)
      forecast.js            Deterministic forecast engine
      excel-import.js        Spreadsheet header detection + row mapping
      inventory.js           Days-of-cover calculation
      suppliers.js           Demo supplier directory
    pages/                   One file per route
    test/                    Vitest tests
```

## 5. Pages

| Path | What it does |
| --- | --- |
| `/` | Overview: stock summary, demand chart, watchlist, next steps |
| `/dashboard` | Per-medicine forecast, what-if scenarios, 7–90 day horizon, reorder estimate |
| `/inventory` | Saved stock, add/delete medicines, days of cover |
| `/import` | Upload `.xlsx` / `.xls` / `.csv`, map columns, preview and save |
| `/suppliers` | Demo emergency supplier directory with call / message / email links |
| `/explain` | Plain-language explanation of how forecasts are built |
| `/auth` | Email sign-in & sign-up, optional Google, guest mode, password reset request |
| `/reset-password` | Set a new password from the emailed link |

## 6. Notes and limitations

- **Guest mode** keeps demo data in the browser tab's `sessionStorage`. It never touches account data, and it is cleared when you exit guest mode.
- **Forecasts** come from an illustrative deterministic engine (baseline + seasonality + trend + scenario boost) on demonstration data. They support professional judgement, not replace it.
- **Signed-in accounts** see the fixed demonstration medicines on the forecast pages. Their saved stock appears on Inventory and Import.
- **Suppliers** are unverified demo contacts. “Send request” only records the request on the page; nothing is actually sent.
