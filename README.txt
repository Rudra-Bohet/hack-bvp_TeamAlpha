Stockout Shield — HTML, CSS and JavaScript edition

QUICK START
Extract the ZIP and open stockout-shield/index.html in your browser.
Choose Sign in, then Continue as guest. The guest showcase uses demo data
and supports inventory additions/deletions, Excel/CSV import, forecasting,
page navigation and reloads. Exit guest mode discards your demo changes.

For consistent storage across pages, serve the folder with a local web server:
  python3 -m http.server 8000
Then open http://localhost:8000 in your browser. No compilation is needed.
Charts, spreadsheet parsing and account libraries are bundled in vendor/.
The optional Google Fonts request needs internet; system fonts are a fallback.

PAGES
index.html, forecast.html, inventory.html, import.html, suppliers.html,
signin.html, reset-password.html. Shared styles: style.css. Browser logic:
app.js. Pure forecasting calculations: forecast.js. Images: images/.

REAL ACCOUNTS
config.js preserves the existing public account connection only.
No private keys are included. Real account operations need internet and
working provider settings in the existing account service. Google sign-in
requires enabling Google there. Email delivery still requires a working
sender; this download does not change the service's email configuration.
Host the folder online and allow signin.html, inventory.html and
reset-password.html redirect URLs for your hosted origin in account settings.
The medicine_stock table and its existing access policies must be configured.

Supplier names, distances and phone numbers are showcase examples, not a
verified emergency contact directory. Forecasts are illustrative, not clinical
advice. Guest data never writes to real accounts.

THIRD-PARTY LIBRARIES
Chart.js 4.5.1 (MIT), Supabase JS 2.76.1 (MIT), SheetJS 0.18.5 (Apache-2.0).
The bundled library files retain their upstream notices.
