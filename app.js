// Stockout Shield — plain JavaScript version
const sb = supabase.createClient(SS_CONFIG.url, SS_CONFIG.key);
const $ = (s) => document.querySelector(s);
const fmt = (n) => Math.round(n).toLocaleString();
let user = null;

/* ---------- tabs ---------- */
function show(tab) {
  document.querySelectorAll(".tab").forEach((t) => t.classList.toggle("show", t.id === tab));
  document.querySelectorAll("#nav a").forEach((a) => a.classList.toggle("active", a.dataset.tab === tab));
  if (tab === "inventory") loadInventory();
  if (tab === "forecast") renderForecast();
  location.hash = tab;
}
document.addEventListener("click", (e) => {
  const el = e.target.closest("[data-tab],[data-goto]");
  if (el) show(el.dataset.tab || el.dataset.goto);
});

/* ---------- forecast engine ---------- */
const MEDICINES = [
  { id: "act", name: "Artemether-Lumefantrine", base: 120, amp: 0.45, peak: 220, trend: 0.0008, stock: 2900 },
  { id: "amox", name: "Amoxicillin 500mg", base: 210, amp: 0.18, peak: 20, trend: 0.0022, stock: 6100 },
  { id: "ors", name: "ORS Sachets", base: 340, amp: 0.3, peak: 190, trend: 0.0004, stock: 9800 },
  { id: "para", name: "Paracetamol 500mg", base: 520, amp: 0.12, peak: 350, trend: 0.0003, stock: 18500 },
];
const SCENARIOS = [
  { id: "none", label: "Baseline", boost: {} },
  { id: "malaria", label: "Seasonal malaria surge", boost: { act: 0.4, para: 0.12 } },
  { id: "abx", label: "Rising antibiotic need", boost: { amox: 0.35, para: 0.08 } },
  { id: "outbreak", label: "Outbreak response", boost: { ors: 0.8, amox: 0.15, para: 0.15 } },
];
const TODAY = 200;
const seasonal = (m, d) => m.base * m.amp * Math.cos(((d - m.peak) / 365) * 2 * Math.PI);
function rng(seed) { return () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296; }
function history(m) {
  const r = rng(m.id.charCodeAt(0) * 97 + m.base);
  return Array.from({ length: 60 }, (_, i) => { const t = i - 60; const v = m.base * (1 + m.trend * t) + seasonal(m, (TODAY + t + 365) % 365) + (r() - 0.5) * m.base * 0.25; return { day: t, v: Math.max(0, Math.round(v)) }; });
}
function forecast(m, scen, h) {
  const b = SCENARIOS.find((s) => s.id === scen).boost[m.id] || 0;
  return Array.from({ length: h }, (_, i) => {
    const d = i + 1, base = m.base + seasonal(m, (TODAY + d) % 365) + m.base * m.trend * d;
    const f = base + base * b * Math.min(1, d / 7), sp = f * (0.08 + 0.006 * d) * (1 + b * 0.5);
    return { day: d, f, lo: Math.max(0, f - sp), hi: f + sp };
  });
}
function stockoutDay(stock, daily) { let l = stock; for (let i = 0; i < daily.length; i++) { l -= daily[i]; if (l < 0) return i + 1; } return null; }

$("#fcMed").innerHTML = MEDICINES.map((m) => `<option value="${m.id}">${m.name}</option>`).join("");
$("#fcScen").innerHTML = SCENARIOS.map((s) => `<option value="${s.id}">${s.label}</option>`).join("");
["#fcMed", "#fcScen", "#fcHor"].forEach((s) => $(s).addEventListener("input", renderForecast));
let chart;
function renderForecast() {
  const m = MEDICINES.find((x) => x.id === $("#fcMed").value), h = +$("#fcHor").value;
  $("#fcHorV").textContent = h;
  const fc = forecast(m, $("#fcScen").value, h), hist = history(m);
  const total = fc.reduce((s, p) => s + p.f, 0), so = stockoutDay(m.stock, fc.map((p) => p.f));
  $("#fcStats").innerHTML = `
    <div class="card stat"><small>Demand next ${h}d</small><br><b>${fmt(total)}</b></div>
    <div class="card stat"><small>Current stock</small><br><b>${fmt(m.stock)}</b></div>
    <div class="card stat"><small>Stockout risk</small><br><b class="${so ? "bad" : "ok"}">${so ? "Day " + so : "Covered"}</b></div>
    <div class="card stat"><small>Suggested reorder</small><br><b>${fmt(Math.max(0, fc.reduce((s, p) => s + p.hi, 0) - m.stock))}</b></div>`;
  const labels = [...hist.map((p) => p.day), ...fc.map((p) => "+" + p.day)], pad = hist.map(() => null);
  const data = { labels, datasets: [
    { label: "Actual", data: [...hist.map((p) => p.v), ...fc.map(() => null)], borderColor: "#d68910", pointRadius: 0 },
    { label: "Forecast", data: [...pad, ...fc.map((p) => p.f)], borderColor: "#0f766e", borderWidth: 2.5, pointRadius: 0 },
    { label: "Upper", data: [...pad, ...fc.map((p) => p.hi)], borderColor: "transparent", backgroundColor: "rgba(15,118,110,.15)", fill: "+1", pointRadius: 0 },
    { label: "Lower", data: [...pad, ...fc.map((p) => p.lo)], borderColor: "transparent", pointRadius: 0 },
  ] };
  if (chart) { chart.data = data; chart.update(); } else chart = new Chart($("#fcChart"), { type: "line", data, options: { plugins: { legend: { labels: { filter: (i) => i.text === "Actual" || i.text === "Forecast" } } } } });
}

/* ---------- inventory ---------- */
async function loadInventory() {
  if (!user) return;
  const { data, error } = await sb.from("medicine_stock").select("*").order("name");
  if (error) return ($("#invTable").innerHTML = `<tr><td class="bad">${error.message}</td></tr>`);
  $("#invTable").innerHTML = "<tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Daily usage</th><th>Days of cover</th><th>Expiry</th><th></th></tr>" +
    (data.length ? data.map((r) => { const c = r.daily_usage > 0 ? r.stock / r.daily_usage : null;
      return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.category)}</td><td>${fmt(r.stock)}</td><td>${r.daily_usage}</td>
      <td class="${c === null ? "" : c < 7 ? "bad" : c < 30 ? "warn" : "ok"}">${c === null ? "—" : Math.floor(c) + " days"}</td><td>${r.expiry_date || ""}</td>
      <td><button class="btn ghost" data-del="${r.id}">Delete</button></td></tr>`; }).join("") : `<tr><td colspan="7" class="muted">No medicines yet — add one or import an Excel sheet.</td></tr>`);
}
$("#invTable").addEventListener("click", async (e) => { const id = e.target.dataset.del; if (id) { await sb.from("medicine_stock").delete().eq("id", id); loadInventory(); } });
$("#addForm").addEventListener("submit", async (e) => {
  e.preventDefault(); const f = new FormData(e.target);
  const { error } = await sb.from("medicine_stock").insert({ name: f.get("name"), category: f.get("category") || "", stock: +f.get("stock") || 0, daily_usage: +f.get("daily_usage") || 0 });
  if (error) alert(error.message); else { e.target.reset(); loadInventory(); }
});
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* ---------- excel import ---------- */
const FIELDS = { name: "Medicine name", category: "Category", stock: "Stock", daily_usage: "Daily usage", expiry_date: "Expiry date" };
const ALIASES = {
  name: ["name", "medicine", "medicine name", "drug", "item", "product", "item name"],
  category: ["category", "type", "class", "group"],
  stock: ["stock", "quantity", "qty", "units", "on hand", "current stock", "balance"],
  daily_usage: ["daily usage", "usage", "daily", "consumption", "avg daily", "per day", "daily demand"],
  expiry_date: ["expiry", "expiry date", "exp", "exp date", "expires"],
};
const norm = (s) => s.toLowerCase().replace(/[_\-]+/g, " ").replace(/\s+/g, " ").trim();
let rawRows = [], headers = [], map = {};
const num = (v) => { const n = typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, "")); return isFinite(n) ? n : 0; };
const toDate = (v) => { if (v === "" || v == null) return null; if (typeof v === "number") return new Date(Math.round((v - 25569) * 864e5)).toISOString().slice(0, 10); const d = new Date(v); return isNaN(d) ? null : d.toISOString().slice(0, 10); };

$("#file").addEventListener("change", async (e) => {
  const file = e.target.files[0]; if (!file) return;
  const wb = XLSX.read(await file.arrayBuffer());
  rawRows = wb.SheetNames.flatMap((n) => XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" }));
  headers = [...new Set(rawRows.flatMap(Object.keys))];
  map = {};
  for (const k in ALIASES) { const hit = headers.find((h) => ALIASES[k].includes(norm(h))) || headers.find((h) => ALIASES[k].some((a) => norm(h).includes(a))); if (hit && !Object.values(map).includes(hit)) map[k] = hit; }
  $("#mapSelects").innerHTML = Object.entries(FIELDS).map(([k, l]) => `<label>${l}<select data-field="${k}"><option value="">— none —</option>${headers.map((h) => `<option ${map[k] === h ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`).join("");
  $("#mapper").hidden = false; renderPreview();
});
$("#mapSelects").addEventListener("change", (e) => { map[e.target.dataset.field] = e.target.value || undefined; renderPreview(); });
function mapped() {
  const used = new Set(Object.values(map));
  return rawRows.map((r) => ({
    name: String(map.name ? r[map.name] : "").trim(), category: String(map.category ? r[map.category] : "").trim(),
    stock: num(map.stock && r[map.stock]), daily_usage: num(map.daily_usage && r[map.daily_usage]), expiry_date: toDate(map.expiry_date ? r[map.expiry_date] : null),
    extra: Object.fromEntries(Object.entries(r).filter(([k]) => !used.has(k))),
  })).filter((r) => r.name);
}
function renderPreview() {
  const rows = mapped();
  $("#readyMsg").textContent = `${rows.length} medicines ready${map.name ? "" : " — pick the medicine name column"}.`;
  $("#saveImport").textContent = `Save ${rows.length} medicines`;
  $("#previewTable").innerHTML = "<tr>" + Object.values(FIELDS).map((l) => `<th>${l}</th>`).join("") + "</tr>" +
    rows.slice(0, 50).map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${r.stock}</td><td>${r.daily_usage}</td><td>${r.expiry_date || ""}</td></tr>`).join("");
}
$("#saveImport").addEventListener("click", async () => {
  const rows = mapped(); if (!rows.length) return;
  const { error } = await sb.from("medicine_stock").insert(rows);
  $("#importMsg").textContent = error ? error.message : `Imported ${rows.length} medicines. See the Inventory tab.`;
  if (!error) { $("#mapper").hidden = true; $("#file").value = ""; }
});

/* ---------- suppliers ---------- */
const SUPPLIERS = [
  ["Sharma Medical Store", 1.2, "+91 98220 12345", true], ["City Pharma Wholesale", 3.8, "+91 98220 67890", false],
  ["Green Cross Pharmacy", 2.4, "+91 98220 24680", true], ["District Drug Depot", 6.5, "+91 98220 13579", false],
];
$("#supList").innerHTML = SUPPLIERS.map(([n, d, p, o]) => `<div class="card"><h3>${n}</h3><p>${d} km away · ${o ? "Open 24h" : "Day hours"}</p>
  <div class="row"><a class="btn" href="tel:${p.replace(/\s/g, "")}">Call</a><a class="btn ghost" target="_blank" href="https://wa.me/${p.replace(/\D/g, "")}">WhatsApp</a></div></div>`).join("");

/* ---------- auth ---------- */
let mode = "signin";
function setMode(m) { mode = m; $("#authForm").classList.toggle("signup", m === "signup"); $("#mSignin").classList.toggle("on", m === "signin"); $("#mSignup").classList.toggle("on", m === "signup"); $("#authBtn").textContent = m === "signin" ? "Sign in" : "Create account"; $("#authMsg").textContent = ""; }
$("#mSignin").onclick = () => setMode("signin"); $("#mSignup").onclick = () => setMode("signup");
$("#authForm").addEventListener("submit", async (e) => {
  e.preventDefault(); const f = Object.fromEntries(new FormData(e.target)); $("#authBtn").disabled = true;
  const res = mode === "signup"
    ? await sb.auth.signUp({ email: f.email, password: f.password, options: { emailRedirectTo: location.origin + location.pathname, data: { full_name: f.full_name, shop_type: f.shop_type, address: f.address } } })
    : await sb.auth.signInWithPassword({ email: f.email, password: f.password });
  $("#authBtn").disabled = false;
  if (res.error) return ($("#authMsg").innerHTML = `<span class="bad">${esc(res.error.message)}</span>`);
  if (mode === "signup" && !res.data.session) return ($("#authMsg").innerHTML = `<span class="ok">Check your email to confirm your account, then sign in.</span>`);
  show("inventory");
});
$("#signOut").onclick = async () => { await sb.auth.signOut(); show("home"); };
function applyUser(u) {
  user = u; document.body.classList.toggle("in", !!u);
  $("#authLink").textContent = u ? "Account" : "Sign in";
  $("#authForm").hidden = !!u; document.querySelector(".seg").hidden = !!u; $("#signOut").hidden = !u;
}
sb.auth.onAuthStateChange((_e, s) => applyUser(s?.user ?? null));
sb.auth.getUser().then(({ data }) => { applyUser(data.user); show(location.hash.slice(1) || "home"); });
