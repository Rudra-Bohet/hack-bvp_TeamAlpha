// Stockout Shield — standalone browser JavaScript.
const $ = (s) => document.querySelector(s);
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const fmt = (n) => Math.round(n).toLocaleString();
const GUEST_KEY = "stockout-shield-guest-v1";
let user = null,
  guest = null,
  sb = null;
try {
  guest = JSON.parse(sessionStorage.getItem(GUEST_KEY) || "null");
  if (!Array.isArray(guest)) guest = null;
} catch {}
function persistGuest() {
  sessionStorage.setItem(GUEST_KEY, JSON.stringify(guest));
}
function client() {
  if (!sb) {
    if (!window.supabase)
      throw Error(
        "Account service unavailable. Continue as guest or try again online.",
      );
    sb = window.supabase.createClient(SS_CONFIG.url, SS_CONFIG.key);
  }
  return sb;
}
function show(page) {
  location.href = ({ home: "index", auth: "signin" }[page] || page) + ".html";
}
function demoRows() {
  return MEDICINES.map((m) => ({
    id: m.id,
    name: m.name,
    category:
      m.id === "act"
        ? "Antimalarial"
        : m.id === "amox"
          ? "Antibiotic"
          : m.id === "ors"
            ? "Rehydration"
            : "Pain relief",
    stock: m.stock,
    daily_usage: m.base,
    expiry_date: "2027-12-31",
  }));
}
function addGuest(rows) {
  guest.push(
    ...rows.map(({ extra, ...r }) => ({ ...r, id: crypto.randomUUID() })),
  );
  persistGuest();
}
function applyUser(u) {
  user = u;
  document.body.classList.toggle("in", !!u || guest !== null);
  document
    .querySelectorAll(".account-link")
    .forEach(
      (a) =>
        (a.textContent = guest !== null ? "Guest" : u ? "Account" : "Sign in"),
    );
  $(".guest-banner").hidden = guest === null;

  if ($("#authForm")) {
    const active = guest !== null || !!u;
    $("#authForm").hidden = active;
    $(".seg").hidden = active;
    ["#forgotPassword", "#googleSignIn", "#guestSignIn", ".divider"].forEach(
      (s) => ($(s).hidden = active),
    );
    $("#signOut").hidden = !active;
    $("#signOut").textContent = guest !== null ? "Exit guest mode" : "Sign out";
    $("#sessionLabel").hidden = !active;
    $("#sessionLabel").textContent =
      guest !== null
        ? "Guest demo session"
        : u
          ? "Signed in as " + u.email
          : "";
  }
}
function clearImport() {
  rawRows = [];
  headers = [];
  map = {};
  if ($("#mapper")) $("#mapper").hidden = true;
  if ($("#file")) $("#file").value = "";
}
async function leave() {
  if (guest !== null) {
    sessionStorage.removeItem(GUEST_KEY);
    guest = null;
  } else await client().auth.signOut();
  show("auth");
}
document.querySelectorAll(".exit-guest").forEach((b) => (b.onclick = leave));
function availableMedicines() {
  return guest === null
    ? MEDICINES
    : guest.map((r) => ({
        ...(MEDICINES.find((m) => m.name === r.name) || MEDICINES[0]),
        id: MEDICINES.find((m) => m.name === r.name)?.id || r.id,
        name: r.name,
        base: r.daily_usage || 0,
        stock: r.stock,
      }));
}
function cssToken(name) {
  return getComputedStyle(document.documentElement)
    .getPropertyValue(name)
    .trim();
}
function initForecast() {
  $("#fcMed").innerHTML = availableMedicines()
    .map((m) => `<option value="${m.id}">${m.name}</option>`)
    .join("");
  $("#fcScen").innerHTML = SCENARIOS.map(
    (s) => `<option value="${s.id}">${s.label}</option>`,
  ).join("");
  ["#fcMed", "#fcScen", "#fcHor"].forEach((s) =>
    $(s).addEventListener("input", renderForecast),
  );
  let chart;
  function renderForecast() {
    const m = availableMedicines().find((x) => x.id === $("#fcMed").value) || {
        ...MEDICINES[0],
        base: 0,
        stock: 0,
      },
      h = +$("#fcHor").value;
    $("#fcHorV").textContent = h;
    const fc = forecast(m, $("#fcScen").value, h),
      hist = pastDemand(m);
    const total = fc.reduce((s, p) => s + p.f, 0),
      so = stockoutDay(
        m.stock,
        fc.map((p) => p.f),
      );
    $("#fcStats").innerHTML = `
    <div class="card stat"><small>Demand next ${h}d</small><br><b>${fmt(total)}</b></div>
    <div class="card stat"><small>Current stock</small><br><b>${fmt(m.stock)}</b></div>
    <div class="card stat"><small>Stockout risk</small><br><b class="${so ? "bad" : "ok"}">${so ? "Day " + so : "Covered"}</b></div>
    <div class="card stat"><small>Suggested reorder</small><br><b>${fmt(Math.max(0, fc.reduce((s, p) => s + p.hi, 0) - m.stock))}</b></div>`;
    const labels = [...hist.map((p) => p.day), ...fc.map((p) => "+" + p.day)],
      pad = hist.map(() => null);
    const data = {
      labels,
      datasets: [
        {
          label: "Actual",
          data: [...hist.map((p) => p.v), ...fc.map(() => null)],
          borderColor: cssToken("--warn"),
          pointRadius: 0,
        },
        {
          label: "Forecast",
          data: [...pad, ...fc.map((p) => p.f)],
          borderColor: cssToken("--primary"),
          borderWidth: 2.5,
          pointRadius: 0,
        },
        {
          label: "Upper",
          data: [...pad, ...fc.map((p) => p.hi)],
          borderColor: "transparent",
          backgroundColor: cssToken("--forecast-band"),
          fill: "+1",
          pointRadius: 0,
        },
        {
          label: "Lower",
          data: [...pad, ...fc.map((p) => p.lo)],
          borderColor: "transparent",
          pointRadius: 0,
        },
      ],
    };
    if (chart) {
      chart.data = data;
      chart.update("none");
    } else
      chart = new Chart($("#fcChart"), {
        type: "line",
        data,
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: {
            legend: {
              labels: {
                filter: (i) => i.text === "Actual" || i.text === "Forecast",
              },
            },
          },
        },
      });
  }

  if (!availableMedicines().length) {
    $("#fcMed").innerHTML = "<option>No medicines</option>";
    $("#fcMed").disabled = true;
  }
  renderForecast();
}
async function loadInventory() {
  if (!user && guest === null) return;
  const { data, error } =
    guest !== null
      ? { data: guest, error: null }
      : await client().from("medicine_stock").select("*").order("name");
  if (error)
    return ($("#invTable").innerHTML =
      `<tr><td class="bad">${esc(error.message)}</td></tr>`);
  $("#invTable").innerHTML =
    "<tr><th>Medicine</th><th>Category</th><th>Stock</th><th>Daily usage</th><th>Days of cover</th><th>Expiry</th><th></th></tr>" +
    (data.length
      ? data
          .map((r) => {
            const c = r.daily_usage > 0 ? r.stock / r.daily_usage : null;
            return `<tr><td><b>${esc(r.name)}</b></td><td>${esc(r.category)}</td><td>${fmt(r.stock)}</td><td>${fmt(r.daily_usage || 0)}</td>
      <td class="${c === null ? "" : c < 7 ? "bad" : c < 30 ? "warn" : "ok"}">${c === null ? "—" : Math.floor(c) + " days"}</td><td>${esc(r.expiry_date || "")}</td>
      <td><button class="btn ghost" data-del="${esc(r.id)}">Delete</button></td></tr>`;
          })
          .join("")
      : `<tr><td colspan="7" class="muted">No medicines yet — add one or import an Excel sheet.</td></tr>`);
}
function initInventory() {
  $("#invTable").addEventListener("click", async (e) => {
    const id = e.target.closest("[data-del]")?.dataset.del;
    if (!id) return;
    try {
      if (guest !== null) {
        guest = guest.filter((r) => r.id !== id);
        persistGuest();
      } else {
        const { error } = await client()
          .from("medicine_stock")
          .delete()
          .eq("id", id);
        if (error) throw error;
      }
      await loadInventory();
    } catch (err) {
      $("#inventoryMsg").textContent = err.message;
    }
  });
  $("#addForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const row = {
      name: String(f.get("name")).trim(),
      category: String(f.get("category") || ""),
      stock: Number(f.get("stock")),
      daily_usage: Number(f.get("daily_usage") || 0),
      expiry_date: null,
    };
    if (!row.name || row.stock < 0 || row.daily_usage < 0) return;
    try {
      if (guest !== null) addGuest([row]);
      else {
        const { error } = await client().from("medicine_stock").insert(row);
        if (error) throw error;
      }
      e.target.reset();
      $("#inventoryMsg").textContent = "";
      loadInventory();
    } catch (err) {
      $("#inventoryMsg").textContent = err.message;
    }
  });
}
function initImport() {
  const FIELDS = {
    name: "Medicine name",
    category: "Category",
    stock: "Stock",
    daily_usage: "Daily usage",
    expiry_date: "Expiry date",
  };
  const ALIASES = {
    name: [
      "name",
      "medicine",
      "medicine name",
      "drug",
      "item",
      "product",
      "item name",
    ],
    category: ["category", "type", "class", "group"],
    stock: [
      "stock",
      "quantity",
      "qty",
      "units",
      "on hand",
      "current stock",
      "balance",
    ],
    daily_usage: [
      "daily usage",
      "usage",
      "daily",
      "consumption",
      "avg daily",
      "per day",
      "daily demand",
    ],
    expiry_date: ["expiry", "expiry date", "exp", "exp date", "expires"],
  };
  const norm = (s) =>
    s
      .toLowerCase()
      .replace(/[_\-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  let rawRows = [],
    headers = [],
    map = {};
  const num = (v) => {
    const n =
      typeof v === "number" ? v : parseFloat(String(v ?? "").replace(/,/g, ""));
    return isFinite(n) ? n : 0;
  };
  const toDate = (v) => {
    if (v === "" || v == null) return null;
    if (typeof v === "number")
      return new Date(Math.round((v - 25569) * 864e5))
        .toISOString()
        .slice(0, 10);
    const d = new Date(v);
    return isNaN(d) ? null : d.toISOString().slice(0, 10);
  };

  $("#file").addEventListener("change", async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const wb = XLSX.read(await file.arrayBuffer());
      rawRows = wb.SheetNames.flatMap((n) =>
        XLSX.utils.sheet_to_json(wb.Sheets[n], { defval: "" }),
      );
      headers = [...new Set(rawRows.flatMap(Object.keys))];
      map = {};
      for (const k in ALIASES) {
        const hit =
          headers.find((h) => ALIASES[k].includes(norm(h))) ||
          headers.find((h) => ALIASES[k].some((a) => norm(h).includes(a)));
        if (hit && !Object.values(map).includes(hit)) map[k] = hit;
      }
      $("#mapSelects").innerHTML = Object.entries(FIELDS)
        .map(
          ([k, l]) =>
            `<label>${l}<select data-field="${k}"><option value="">— none —</option>${headers.map((h) => `<option ${map[k] === h ? "selected" : ""}>${esc(h)}</option>`).join("")}</select></label>`,
        )
        .join("");
      $("#mapper").hidden = false;
      renderPreview();
    } catch (err) {
      $("#importMsg").textContent =
        "Could not read spreadsheet: " + err.message;
    }
  });
  $("#mapSelects").addEventListener("change", (e) => {
    map[e.target.dataset.field] = e.target.value || undefined;
    renderPreview();
  });
  function mapped() {
    const used = new Set(Object.values(map));
    return rawRows
      .map((r) => ({
        name: String(map.name ? r[map.name] : "").trim(),
        category: String(map.category ? r[map.category] : "").trim(),
        stock: num(map.stock && r[map.stock]),
        daily_usage: num(map.daily_usage && r[map.daily_usage]),
        expiry_date: toDate(map.expiry_date ? r[map.expiry_date] : null),
        extra: Object.fromEntries(
          Object.entries(r).filter(([k]) => !used.has(k)),
        ),
      }))
      .filter((r) => r.name);
  }
  function renderPreview() {
    const rows = mapped();
    $("#readyMsg").textContent =
      `${rows.length} medicines ready${map.name ? "" : " — pick the medicine name column"}.`;
    $("#saveImport").textContent = `Save ${rows.length} medicines`;
    $("#saveImport").disabled = !rows.length;
    $("#previewTable").innerHTML =
      "<tr>" +
      Object.values(FIELDS)
        .map((l) => `<th>${l}</th>`)
        .join("") +
      "</tr>" +
      rows
        .slice(0, 50)
        .map(
          (r) =>
            `<tr><td>${esc(r.name)}</td><td>${esc(r.category)}</td><td>${r.stock}</td><td>${r.daily_usage}</td><td>${esc(r.expiry_date || "")}</td></tr>`,
        )
        .join("");
  }
  $("#saveImport").addEventListener("click", async () => {
    const rows = mapped();
    if (!rows.length) return;
    const { error } =
      guest !== null
        ? (addGuest(rows), { error: null })
        : await client().from("medicine_stock").insert(rows);
    $("#importMsg").textContent = error
      ? error.message
      : `Imported ${rows.length} medicines. See the Inventory page.`;
    if (!error) {
      $("#mapper").hidden = true;
      $("#file").value = "";
    }
  });
}
function initSuppliers() {
  const SUPPLIERS = [
    ["Sharma Medical Store", 1.2, "+91 98220 12345", true],
    ["City Pharma Wholesale", 3.8, "+91 98220 67890", false],
    ["Green Cross Pharmacy", 2.4, "+91 98220 24680", true],
    ["District Drug Depot", 6.5, "+91 98220 13579", false],
  ];
  $("#supList").innerHTML = SUPPLIERS.map(
    ([
      n,
      d,
      p,
      o,
    ]) => `<div class="card"><h3>${n}</h3><p>${d} km away · ${o ? "Open 24h" : "Day hours"}</p>
  <div class="row"><a class="btn" href="tel:${p.replace(/\s/g, "")}">Call</a><a class="btn ghost" target="_blank" rel="noopener noreferrer" href="https://wa.me/${p.replace(/\D/g, "")}">WhatsApp</a></div></div>`,
  ).join("");
}
function initAuth() {
  let mode = "signin";
  function setMode(m) {
    mode = m;
    $("#authForm").classList.toggle("signup", m === "signup");
    $("#mSignin").classList.toggle("on", m === "signin");
    $("#mSignup").classList.toggle("on", m === "signup");
    $("#authBtn").textContent = m === "signin" ? "Sign in" : "Create account";
    $("#authMsg").textContent = "";
  }
  $("#mSignin").onclick = () => setMode("signin");
  $("#mSignup").onclick = () => setMode("signup");
  $("#authForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const f = Object.fromEntries(new FormData(e.target));
    $("#authBtn").disabled = true;
    try {
      const res =
        mode === "signup"
          ? await client().auth.signUp({
              email: f.email,
              password: f.password,
              options: {
                emailRedirectTo: new URL("signin.html", location.href).href,
                data: {
                  full_name: f.full_name,
                  shop_type: f.shop_type,
                  address: f.address,
                },
              },
            })
          : await client().auth.signInWithPassword({
              email: f.email,
              password: f.password,
            });
      $("#authBtn").disabled = false;
      if (res.error)
        return ($("#authMsg").innerHTML =
          `<span class="bad">${esc(res.error.message)}</span>`);
      if (mode === "signup" && !res.data.session)
        return ($("#authMsg").innerHTML =
          `<span class="ok">Check your email to confirm your account, then sign in.</span>`);
      show("inventory");
    } catch (err) {
      $("#authMsg").textContent = err.message;
    } finally {
      $("#authBtn").disabled = false;
    }
  });

  $("#signOut").onclick = leave;
  $("#guestSignIn").onclick = () => {
    guest = demoRows();
    persistGuest();
    show("inventory");
  };
  $("#googleSignIn").onclick = async () => {
    try {
      if (location.protocol === "file:")
        throw Error(
          "Host this folder online to use Google sign-in. Guest mode is available now.",
        );
      const { error } = await client().auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: new URL("inventory.html", location.href).href },
      });
      if (error) throw error;
    } catch (err) {
      $("#authMsg").textContent = err.message;
    }
  };
  $("#forgotPassword").onclick = async () => {
    const email = prompt("Enter your account email:");
    if (!email) return;
    try {
      if (location.protocol === "file:")
        throw Error("Host this folder online to receive working reset links.");
      const { error } = await client().auth.resetPasswordForEmail(email, {
        redirectTo: new URL("reset-password.html", location.href).href,
      });
      if (error) throw error;
      $("#authMsg").textContent =
        "Password reset email requested — check your inbox.";
    } catch (err) {
      $("#authMsg").textContent = err.message;
    }
  };
}
let recovery = location.hash.includes("type=recovery");
function initReset() {
  const form = $("#resetForm");
  form.onsubmit = async (e) => {
    e.preventDefault();
    try {
      const { error } = await client().auth.updateUser({
        password: new FormData(form).get("password"),
      });
      if (error) throw error;
      show("inventory");
    } catch (err) {
      $("#resetMsg").textContent = err.message;
    }
  };
  setTimeout(() => {
    form.hidden = !recovery;
    $("#resetMsg").textContent = recovery
      ? ""
      : "This reset link is invalid or expired. Request a new one from the sign-in page.";
  }, 1500);
}
const page = document.body.dataset.page;
(
  ({
    forecast: initForecast,
    inventory: initInventory,
    import: initImport,
    suppliers: initSuppliers,
    auth: initAuth,
    reset: initReset,
  })[page] || (() => {})
)();
applyUser(null);
if (guest !== null) {
  if (page === "inventory") loadInventory();
} else {
  try {
    const auth = client().auth;
    auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY") {
        recovery = true;
        if (page !== "reset") show("reset-password");
      }
      applyUser(session?.user || null);
      if (page === "inventory")
        setTimeout(
          () =>
            loadInventory().catch(
              (err) => ($("#inventoryMsg").textContent = err.message),
            ),
          0,
        );
    });
    auth
      .getSession()
      .then(({ data }) => {
        applyUser(data.session?.user || null);
        if (page === "inventory") return loadInventory();
      })
      .catch((err) => {
        if ($("#inventoryMsg")) $("#inventoryMsg").textContent = err.message;
      });
  } catch (err) {
    if ($("#authMsg")) $("#authMsg").textContent = err.message;
  }
}
