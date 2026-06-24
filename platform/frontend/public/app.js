/* =====================================================================
   RiskIQ — consola de inteligencia de suscripción y cobertura
   Vanilla SPA over dev_server.py. Inicio launcher + module router.
   ===================================================================== */

/* ---------- catálogo de módulos (tarjetas de inicio + navegación) ---------- */
const MODULES = [
  { id: "simple_chat",     name: "Chat",             icon: "◌", group: "Operación",    status: "ready",
    desc: "Chat local con memoria del caso, paquete vivo y evaluación automática cuando RiskIQ tiene datos suficientes." },
  { id: "uw",         name: "Suscripción",       icon: "▶", group: "Flujos",       status: "ready",
    desc: "Recorre el árbol de elegibilidad, revisa la ruta de decisión y obtiene precios finales LBC Auto cuando corresponde." },
  { id: "claims",     name: "Reclamos",          icon: "▣", group: "Flujos",       status: "ready",
    desc: "Ejecuta una orientación de cobertura citada a fuente para reclamos, con deberes documentales, exclusiones y salvedades." },
  { id: "renewals",   name: "Renovaciones",      icon: "↻", group: "Flujos",       status: "ready",
    desc: "Mesa de renovación y deltas acotados por cliente/póliza sobre una versión fija del grafo." },
  { id: "graph",      name: "Mapa de decisiones", icon: "⊟", group: "Flujos",       status: "ready",
    desc: "Explora cada nodo de decisión: ramas, hechos, citas fuente y enlaces cruzados del árbol ejecutable." },
  { id: "flags",      name: "Incidencias",       icon: "!", group: "Flujos",       status: "ready",
    desc: "Revisa posibles errores, conflictos, ambigüedades y entradas RUL/OVL del registro en un solo lugar." },
  { id: "demo",       name: "Recorrido demo",    icon: "▷", group: "Flujos",       status: "ready",
    desc: "Muestra cómo una narrativa se convierte en hechos confirmados, recorre el grafo ejecutable y llega a un resultado." },
  { id: "simulation", name: "Simulación",        icon: "~", group: "Inteligencia", status: "ready",
    desc: "Qué pasa si cambias una regla o precio: elige una versión candidata y mide el impacto antes de lanzarla." },
  { id: "supervision", name: "Supervisión",      icon: "⌁", group: "Inteligencia", status: "ready",
    desc: "Cómo está la cartera hoy: riesgo, clientes, severidad, dónde se pierde dinero y cola de renovación." }
];

const HIDDEN_MODULES = {
  simulation: { id: "simulation", name: "Simulación", icon: "~", gateKey: "simulation",
    desc: "Reproduce solicitudes históricas contra versiones candidatas regeneradas del grafo." },
  insights: { id: "insights", name: "Inteligencia de cartera", icon: "▦", gateKey: "portfolio_intelligence",
    desc: "Inteligencia de cartera y siniestros habilitada solo cuando existan datos vinculados por fila." }
};

/* ---------- sample submissions ---------- */
// UW examples for the runner: "clean" prices straight through with no human stop;
// "review" is eligible but the plaza/marca fall outside the LBC calibration, so
// pricing returns requires_pricing_review → a human (pricing) packet.
const UW_EXAMPLES = {
  clean: {
    label: "Aprobado sin intervención humana",
    note: "La Paz / Toyota: elegible y tarificado de inmediato.",
  },
  review: {
    label: "Requiere revisión humana",
    note: "Plaza y marca fuera de calibración LBC: el precio se detiene para revisión de un suscriptor.",
  },
};
const DEMO_TEXT = {
  uw: "Cliente empresa por canal directas solicita Moto Proteccion. Vehiculo motocicleta 150 cc, modelo 2021, marca Toyota, modelo Corolla, valor asegurado Bs. 90000, ciudad La Paz, siniestralidad historica 35%. No tiene techo de lona, no es alquiler, no circula fuera del pais y tiene placas.",
  uw_review: "Cliente empresa por canal directas solicita Moto Proteccion para una motocicleta 150 cc, modelo 2021, marca Zhongtong, modelo BUS-X, valor asegurado Bs. 90000, ciudad Cobija, siniestralidad historica 35%. No es alquiler, no circula fuera del pais, tiene placas y no solicita desviacion del procedimiento estandar.",
  coverage: "Siniestro de robo parcial de partes en La Paz. La cobertura de robo parcial esta incluida, hubo denuncia policial y dosaje dentro de 6 horas, el vehiculo no estaba en territorio extranjero, las partes estaban adheridas y fueron verificadas, el aviso a la aseguradora fue a los 2 dias y no se inicio reparacion sin autorizacion."
};

const PRICING_SAMPLE = {
  valor_asegurado: 200000,
  model_year: 2020,
  make: "Toyota",
  marca_auto: 44,
  model: "Corolla",
  vehicle_type: "auto",
  city: "La Paz",
  plaza_auto: 1,
  extraterritorialidad: "no",
  cuotas: 1,
  selected_pricing_option: "option_1"
};

const RENEWAL_SAMPLE = {
  client_id: "CLI-ACME-001",
  policy_id: "POL-AUT-2025-001",
  renewal_date: new Date().toISOString().slice(0, 10),
  price_adjustment_percent: 8,
  price_adjustment_reason: "Ajuste demo de renovación por siniestralidad histórica y exposición de plaza.",
  rating_facts: {
    valor_asegurado: 200000,
    model_year: 2020,
    make: "Toyota",
    marca_auto: 44,
    model: "Corolla",
    vehicle_type: "auto",
    city: "La Paz",
    plaza_auto: 1,
    extraterritorialidad: "no",
    cuotas: 1
  },
  node_overrides: [
    {
      target_type: "node",
      target_id: "standard.elig.descapotable_lona",
      change_type: "eligibility_exception",
      patch: { field: "outcome", from: "decline", to: "refer_authority" },
      rationale: "Excepción de renovación acotada al cliente. Requiere aprobación antes de usarla."
    }
  ]
};

const DEFAULT_SIM_CONTROLS = {
  coverage_price_multiplier: 1.08,
  deductible_multiplier: 1,
  accident_frequency_multiplier: 1,
  severity_multiplier: 1,
  renewal_price_change_percent: 8,
  coverage_notice_days_limit: 15,
  coverage_replacement_threshold: 70,
  coverage_alcohol_outcome: "refer_adjuster",
  coverage_moto_parts_outcome: "refer_adjuster",
  uw_antique_age_limit: 25,
  uw_rental_non_petroleum_outcome: "refer_process"
};

const RATING_FALLBACK_SCHEMA = {
  fields: [
    { id: "valor_asegurado", label: "Valor comercial / asegurado", type: "number", unit: "BOB", required: true },
    { id: "model_year", label: "Año modelo", type: "number", required: true },
    { id: "make", label: "Marca", type: "string", required: true },
    { id: "marca_auto", label: "ID marca RUAT", type: "number", required: false },
    { id: "model", label: "Modelo", type: "string", required: true },
    { id: "city", label: "Plaza de circulación", type: "enum", values: ["La Paz", "Santa Cruz", "Cochabamba", "Tarija", "Trinidad", "Oruro", "Potosi", "Sucre"], required: true },
    { id: "plaza_auto", label: "ID plaza_auto", type: "number", required: false },
    { id: "extraterritorialidad", label: "Extraterritorialidad", type: "enum", values: ["no", "si"], required: false },
    { id: "cuotas", label: "Número de cuotas", type: "number", required: false },
    { id: "selected_pricing_option", label: "Opción", type: "enum", values: ["option_1", "option_2", "option_3"], required: false }
  ]
};

const VERDICT = {
  eligible:       { cls: "v-ok",   ico: "✓", tag: "Elegible",                  kpi: "is-ok"   },
  conditional_eligible: { cls: "v-ok", ico: "✓", tag: "Elegible condicionado", kpi: "is-ok"   },
  likely_covered: { cls: "v-ok",   ico: "✓", tag: "Probablemente cubierto",    kpi: "is-ok"   },
  ineligible:     { cls: "v-bad",  ico: "✕", tag: "No elegible",               kpi: "is-bad"  },
  decline:        { cls: "v-bad",  ico: "✕", tag: "No elegible",               kpi: "is-bad"  },
  not_covered:    { cls: "v-bad",  ico: "✕", tag: "Probablemente no cubierto", kpi: "is-bad"  },
  excluded:       { cls: "v-bad",  ico: "✕", tag: "Excluido",                  kpi: "is-bad"  },
  ESCALATE:       { cls: "v-warn", ico: "!", tag: "Escalar",                   kpi: "is-warn" },
  escalate:       { cls: "v-warn", ico: "!", tag: "Escalar",                   kpi: "is-warn" },
  missing_fact:   { cls: "v-warn", ico: "?", tag: "Falta dato",                kpi: "is-warn" },
  conflict_escalation: { cls: "v-warn", ico: "!", tag: "Conflicto a revisar",  kpi: "is-warn" }
};

/* ---------- helpers ---------- */
const UI_TERMS = {
  all: "Todos",
  source: "Fuente",
  uw: "Suscripción",
  coverage: "Reclamos",
  underwriting: "Suscripción",
  claims: "Reclamos",
  listo: "listo",
  ready: "listo",
  buildable_now: "listo",
  bloqueado: "bloqueado",
  gated: "bloqueado",
  blocked: "bloqueado",
  open: "abierto",
  closed: "cerrado",
  source_observed: "observado en fuente",
  published: "publicado",
  draft: "borrador",
  draft_verified_by_validator: "borrador verificado",
  eligible: "Elegible",
  conditional_eligible: "Elegible condicionado",
  decline: "No elegible",
  refer_authority: "Derivar a autoridad",
  refer_process: "Derivar a proceso",
  refer_line: "Derivar a línea",
  likely_covered: "Probablemente cubierto",
  conditionally_covered: "Cubierto condicionado",
  partially_covered: "Cubierto parcialmente",
  refer_adjuster: "Derivar a ajustador",
  likely_covered: "Probablemente cubierto",
  not_covered: "Probablemente no cubierto",
  missing_fact: "Falta dato",
  missing_document: "Falta documento",
  conflict_escalation: "Conflicto a revisar",
  human_pricing_review: "Revisión humana de precio",
  priced_lbc_auto: "Precio LBC Auto calculado",
  priced_demo: "Precio demo calculado",
  city_mapped_to_resto: "Plaza mapeada a resto",
  city_not_in_lbc_calibration_used_la_paz_factor: "Plaza fuera de calibración LBC",
  brand_not_in_lbc_calibration_used_toyota_factor: "Marca fuera de calibración LBC",
  vehicle_age_over_20: "Antigüedad mayor a 20 años",
  extreme_siniestralidad_demo_review: "Siniestralidad extrema",
  high_value_demo_review: "Valor alto para revisión demo",
  blocked_by_uw_outcome: "bloqueado por resultado de suscripción",
  missing_rating_input: "faltan datos de tarificación",
  approved_final_price: "precio final aprobado",
  requires_pricing_review: "requiere revisión de tarificación",
  needs_human_input: "requiere input humano",
  needs_client_followup: "esperando dato del cliente",
  needs_fact_confirmation: "datos por incorporar",
  human_task_created: "tarea humana creada",
  ran_tree: "evaluado por RiskIQ",
  governance_or_manual_review: "gobernanza o revisión manual",
  pending: "pendiente",
  review: "revisión",
  priced: "tarificado",
  submitted: "enviado",
  conflict: "conflicto",
  row_conflict: "conflicto de fila",
  flag: "alerta",
  flags: "alertas",
  band_boundary_flag: "alerta de límite de banda",
  conflict_flag: "alerta de conflicto",
  inconsistency_flag: "alerta de inconsistencia",
  price_adjustment: "ajuste de precio",
  threshold_override: "excepción de umbral",
  routing_override: "excepción de ruteo",
  eligibility_exception: "excepción de elegibilidad",
  coverage_exception: "excepción de cobertura",
  fact_override: "excepción de hecho",
  note_only: "solo nota",
  client_policy_renewal: "renovación cliente/póliza",
  router: "enrutador",
  gate: "compuerta",
  condition: "condición",
  accumulator: "acumulador",
  referral: "derivación",
  node: "nodo",
  nodes: "nodos",
  target: "objetivo",
  process: "proceso",
  authority: "autoridad",
  terminal: "terminal",
  branch: "rama",
  advance: "avanza",
  pass: "pasa",
  fail: "falla",
  stop: "detiene",
  fired: "activado",
  unknown: "desconocido",
  unknown_key: "clave desconocida",
  none: "ninguno"
};
const $  = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
const esc = (s) => String(s ?? "").replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const uiTerm = (s) => {
  const raw = String(s ?? "");
  const key = raw.trim();
  const norm = key.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "_").replace(/^_+|_+$/g, "");
  return UI_TERMS[key] || UI_TERMS[norm] || null;
};
const titleCase = (s) => uiTerm(s) || String(s ?? "").replace(/[_.]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const fmt = (v) => typeof v === "boolean" ? (v ? "sí" : "no") : Array.isArray(v) ? (v.length ? v.join(", ") : "∅") : (v === null || v === undefined || v === "" ? "—" : String(v));
const moneyBob = (v) => Number(v || 0).toLocaleString("es-BO", { maximumFractionDigits: 0 });
const signedMoneyBob = (v) => `${Number(v || 0) >= 0 ? "+" : "-"}${moneyBob(Math.abs(Number(v || 0)))}`;
const signedNumber = (v, digits = 1) => `${Number(v || 0) >= 0 ? "+" : ""}${Number(v || 0).toFixed(digits)}`;
const pctPoint = (v) => `${signedNumber(Number(v || 0) * 100, 1)} pp`;
const truncate = (s, n) => { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; };
const hasValor = (v) => v !== null && v !== undefined && v !== "";

async function getJSON(url) { const r = await fetch(url); if (!r.ok) throw new Error(r.status); return r.json(); }
async function postJSON(url, body, role) {
  const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", ...(role ? { "X-Role": role } : {}) }, body: JSON.stringify(body) });
  return r.json();
}

let toastTimer;
function toast(msg, isErr) {
  const t = $("#toast"); t.textContent = msg; t.className = "toast show" + (isErr ? " err" : "");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.className = "toast"; }, 2600);
}

/* ---------- app state ---------- */
const DEFAULT_ROUTE = "simple_chat";
const state = {
  route: DEFAULT_ROUTE,
  cache: { versions: null, engines: null, discovery: null, health: null, defs: {}, graph: {}, flags: {}, ledger: null, drafts: null, ratingSchema: null, simulationFilters: null, simulationCandidates: null },
  runner: {
    engine: "uw",
    values: { uw: {}, coverage: {} },
    chat: { uw: { text: "", attachments: [], result: null }, coverage: { text: "", attachments: [], result: null } },
    demo: { uw: { text: DEMO_TEXT.uw, result: null, step: 0, active: false }, coverage: { text: DEMO_TEXT.coverage, result: null, step: 0, active: false } },
    result: null,
    mode: "form",
    ratingWeights: null
  },
  renewal: { values: JSON.parse(JSON.stringify(RENEWAL_SAMPLE)), result: null, saved: null },
  simple_chat: {
    scenario: "chat",
    result: null,
    local: { sessions: [], session: null, text: "", engine: "uw" }
  },
  graph: { engine: "uw", selected: null, query: "", mode: "map" },
  flags: { engine: "all", selected: null, query: "", mode: "flags" },
  ledger: { selected: null },
  simulation: {
    filters: { engine: "all", age_min: "", age_max: "", cities: "", brokers: "", business_types: "", vehicle_makes: "", policy_types: "", claim_causes: "" },
    controls: { ...DEFAULT_SIM_CONTROLS },
    candidate_id: "growth_sandbox",
    tab: "cases",
    showFilters: false,
    result: null
  },
  supervision: { result: null, baseline: null }
};

/* ---------- data loaders (cached) ---------- */
async function loadCore() {
  try { state.cache.versions = await getJSON("/api/graph-versions"); } catch { state.cache.versions = []; }
  try { state.cache.engines = await getJSON("/api/engines"); } catch { state.cache.engines = [{ id: "uw", label: "Suscripción" }, { id: "coverage", label: "Reclamos" }]; }
  getJSON("/api/health").then((h) => { state.cache.health = h; renderHealth(h); }).catch(() => renderHealth(null));
  getJSON("/api/data-discovery").then((d) => { state.cache.discovery = d; }).catch(() => {});
}
async function defs(engine) {
  if (!state.cache.defs[engine]) { try { state.cache.defs[engine] = await getJSON(`/api/facts?engine=${engine}`); } catch { state.cache.defs[engine] = {}; } }
  return state.cache.defs[engine];
}
async function graphData(engine) {
  if (!state.cache.graph[engine]) state.cache.graph[engine] = await getJSON(`/api/graph?engine=${engine}`);
  return state.cache.graph[engine];
}
async function alertasData(engine) {
  if (!state.cache.flags[engine]) state.cache.flags[engine] = await getJSON(`/api/flags?engine=${engine}`);
  return state.cache.flags[engine];
}
async function ledgerList() {
  if (!state.cache.ledger) state.cache.ledger = await getJSON("/api/ledger");
  return state.cache.ledger;
}
async function drafts() { state.cache.drafts = await getJSON("/api/proposals"); return state.cache.drafts; }
async function ratingSchema() {
  if (!state.cache.ratingSchema) {
    try { state.cache.ratingSchema = await getJSON("/api/rating/schema"); }
    catch { state.cache.ratingSchema = RATING_FALLBACK_SCHEMA; }
  }
  return state.cache.ratingSchema;
}
async function simulationFilters() {
  if (!state.cache.simulationFilters) state.cache.simulationFilters = await getJSON("/api/simulations/filters");
  return state.cache.simulationFilters;
}
async function simulationCandidates() {
  if (!state.cache.simulationCandidates) state.cache.simulationCandidates = await getJSON("/api/simulations/candidates");
  return state.cache.simulationCandidates;
}
async function runSimulationPayload(payload) {
  return postJSON("/api/simulations/run", payload, "simulation_user");
}
async function supervisionPayload(payload = {}) {
  return Object.keys(payload || {}).length ? postJSON("/api/supervision", payload, "supervision_user") : getJSON("/api/supervision");
}
async function renewalList() { state.renewal.saved = await getJSON("/api/renewals"); return state.renewal.saved; }
function discovery() { return state.cache.discovery || { downstream_verdict: {} }; }
function versionFor(engine) { return (state.cache.versions || []).find((v) => v.engine === engine); }
function registeredMotors() {
  const list = Array.isArray(state.cache.engines) ? state.cache.engines : [];
  return list.length ? list : [{ id: "uw", label: "Suscripción" }, { id: "coverage", label: "Reclamos" }];
}
function engineLabel(id) {
  if (id === "coverage" || id === "claims") return "Reclamos";
  const spec = registeredMotors().find((e) => e.id === id);
  return spec ? (spec.label || titleCase(spec.id)) : titleCase(id);
}
function engineSegment(id, current) {
  return `<div class="seg" id="${id}">${registeredMotors().map((engine) =>
    `<button class="seg-btn ${current === engine.id ? "active" : ""}" data-engine="${esc(engine.id)}">${esc(engineLabel(engine.id))}</button>`
  ).join("")}</div>`;
}

function exampleNarrative(engine, variant = "clean") {
  const key = engine === "claims" ? "coverage" : engine;
  if (key === "uw" && variant === "review") return DEMO_TEXT.uw_review;
  return DEMO_TEXT[key] || DEMO_TEXT.uw;
}

function activeInputModeId() {
  if ($("#demo-input-mode")) return "demo-input-mode";
  return "input-mode";
}

function loadCaseExampleText(engine, variant = "clean", isDemo = false) {
  const text = exampleNarrative(engine, variant);
  const label = engine === "uw" && UW_EXAMPLES[variant] ? UW_EXAMPLES[variant].label : `${engineLabel(engine)} demo`;
  state.runner.values[engine] = {};
  state.runner.result = null;
  state.runner.chat[engine] = { text, attachments: [], result: null };
  state.runner.demo[engine] ||= { text: "", result: null, step: 0, active: false };
  state.runner.demo[engine].text = text;
  state.runner.demo[engine].result = null;
  state.runner.demo[engine].step = 0;
  state.runner.demo[engine].active = false;
  renderForm(); syncJson();
  setInputMode("chat", isDemo ? "demo-input-mode" : activeInputModeId());
  renderChat();
  markExampleTextarea("#chat-input", "#chat-loaded-note", `Ejemplo cargado aquí: ${label}`);
  if ($("#result-body")) $("#result-body").innerHTML = isDemo ? emptyDemoResult() : emptyResult();
  if ($("#audit-id")) $("#audit-id").textContent = "";
  if (!isDemo) {
    setKpi("—", engine === "coverage" ? "pendiente de evaluar" : "Aún no ejecutado", "");
    const steps = $("#kpi-steps");
    if (steps) steps.textContent = "0";
    setRunFourthKpi(null);
    refreshFactCount();
  }
}

function markExampleTextarea(inputSelector, noteSelector, message) {
  const input = $(inputSelector);
  if (!input) return;
  input.focus({ preventScroll: true });
  input.setSelectionRange(0, 0);
  input.scrollIntoView({ behavior: "smooth", block: "center" });
  input.classList.remove("example-loaded");
  void input.offsetWidth;
  input.classList.add("example-loaded");
  const note = $(noteSelector);
  if (note) {
    note.textContent = message;
    note.classList.remove("hidden");
    clearTimeout(note._hideTimer);
    note._hideTimer = setTimeout(() => note.classList.add("hidden"), 4500);
  }
}

/* ---------- shell ---------- */
function renderNav() {
  const groups = {};
  for (const m of MODULES) (groups[m.group] ||= []).push(m);
  let html = "";
  for (const [group, mods] of Object.entries(groups)) {
    html += `<p class="nav-label">${esc(group)}</p>`;
    for (const m of mods) {
      html += `<button class="nav-item ${state.route === m.id ? "active" : ""}" data-route="${m.id}">
        <span class="nav-ico">${m.icon}</span><span class="nav-name">${esc(m.name)}</span>
        ${m.status === "gated" ? '<span class="nav-tag">pronto</span>' : ""}</button>`;
    }
  }
  $("#nav").innerHTML = html;
  $$("#nav .nav-item").forEach((b) => b.addEventListener("click", () => go(b.dataset.route)));
}

function setTopbar(title, sub, actionsHtml) {
  $("#page-title").textContent = title;
  $("#page-sub").textContent = sub || "";
  $("#topbar-actions").innerHTML = actionsHtml || "";
  $("#back-btn").classList.toggle("hidden", state.route === DEFAULT_ROUTE || state.route === "home");
}

function renderHealth(health) {
  const dot = $("#health-dot"), txt = $("#health-text");
  if (health && health.ok) { dot.className = "dot dot-live"; txt.textContent = "Motor validado · VERDE"; }
  else if (health) { dot.className = "dot dot-warn"; txt.textContent = "Incidencias de validador"; }
  else { dot.className = "dot dot-bad"; txt.textContent = "Motor offline"; }
}

/* ---------- router ---------- */
const VIEWS = {}; // filled below
function routeFromHash() {
  const raw = String(window.location.hash || "").replace(/^#\/?/, "").trim();
  return !raw || raw === "home" ? DEFAULT_ROUTE : raw;
}
function syncHash(route) {
  const target = route === DEFAULT_ROUTE || route === "home" ? "" : `#${route}`;
  if (window.location.hash === target) return;
  window.history.replaceState(null, "", `${window.location.pathname}${window.location.search}${target}`);
}
function go(route, params, opts = {}) {
  const requested = route === "home" ? DEFAULT_ROUTE : route;
  const nextRoute = VIEWS[requested] ? requested : DEFAULT_ROUTE;
  state.route = nextRoute;
  if (!opts.skipHashSync) syncHash(nextRoute);
  document.body.classList.toggle("home-route", nextRoute === "home");
  renderNav();
  window.scrollTo(0, 0);
  VIEWS[nextRoute](params || {});
}

/* =====================================================================
   VIEW: HOME (launcher)
   ===================================================================== */
VIEWS.home = async function () {
  setTopbar("Inicio", "Accesos a los flujos operativos de RiskIQ.", "");

  const groups = {};
  for (const m of MODULES) (groups[m.group] ||= []).push(m);

  let cards = "";
  for (const [group, mods] of Object.entries(groups)) {
    cards += `<p class="home-group">${esc(group)}</p><div class="home-grid">`;
    for (const m of mods) {
      const gated = m.status === "gated";
      const reason = gated ? gateReason(m.gateKey) : "";
      cards += `<button class="mod-card ${gated ? "is-gated" : ""}" data-route="${m.id}">
        <div class="mod-top"><span class="mod-ico">${m.icon}</span>
          <span class="badge ${gated ? "badge-amber" : "badge-ok"}">${gated ? "bloqueado" : "listo"}</span></div>
        <h3 class="mod-name">${esc(m.name)}</h3>
        <p class="mod-desc">${esc(m.desc)}</p>
        ${gated ? `<p class="mod-gate">🔒 ${esc(reason)}</p>` : `<span class="mod-go">Abrir →</span>`}
      </button>`;
    }
    cards += `</div>`;
  }

  $("#view").innerHTML = `
    <div class="home">
      <header class="home-head">
        <h2 class="home-brand">Risk<strong>IQ</strong></h2>
        <p class="home-tag">Elige un flujo para continuar. El chat queda como pantalla principal en la URL base.</p>
      </header>
      ${cards}
    </div>`;

  $$("#view .mod-card").forEach((c) => c.addEventListener("click", () => go(c.dataset.route)));
};

function gateReason(key) {
  const v = (discovery().downstream_verdict || {})[key] || "gated";
  return String(v).replace(/^gated_/, "").replace(/_/g, " ");
}

/* =====================================================================
   VIEW: STAKEHOLDER DEMO
   ===================================================================== */
VIEWS.demo = async function (params) {
  const priorMotor = state.runner.engine;
  if (params.engine) state.runner.engine = params.engine;
  if (params.engine && params.engine !== priorMotor) {
    state.runner.result = null;
    if (state.runner.demo[priorMotor]) state.runner.demo[priorMotor].active = false;
  }
  const engine = state.runner.engine;
  await defs(engine);
  if (engine === "uw") {
    const schema = await ratingSchema();
    state.runner.ratingWeights ||= JSON.parse(JSON.stringify(schema.calibration || schema.weights || {}));
  }

  setTopbar(
    "Recorrido demo",
    "Ingresa un caso y recorre los nodos exactos visitados hasta el resultado.",
    `${engineSegment("demo-engine", engine)}
     <button class="btn btn-primary" id="demo-start-btn">Iniciar recorrido</button>`
  );

  $("#view").innerHTML = `
    <div class="board demo-simple">
      <section class="card inputs-card demo-input-card">
        <div class="card-head"><h2>Entrada del caso</h2>
          <div class="seg" id="demo-input-mode">
            <button class="seg-btn active" data-view="chat">Chat</button>
            <button class="seg-btn" data-view="form">Formulario</button>
            <button class="seg-btn" data-view="json">JSON</button>
          </div>
        </div>
        <div class="card-body">
          <div id="chat-view">${chatPanel()}</div>
          <div id="form-view" class="fields hidden"></div>
          <div id="json-view" class="hidden"><textarea id="json-input" spellcheck="false"></textarea><p class="json-hint">Avanzado — los cambios se sincronizan al iniciar el recorrido.</p></div>
        </div>
      </section>
      <section class="card result-card demo-stage-card">
        <div class="card-head"><h2>Recorrido de presentación</h2><span class="audit-id" id="audit-id"></span></div>
        <div class="card-body" id="result-body">${emptyDemoResult()}</div>
      </section>
    </div>`;

  $$("#demo-engine .seg-btn").forEach((b) => b.addEventListener("click", () => go("demo", { engine: b.dataset.engine })));
  renderForm(); syncJson(); renderChat();
  const demo = demoState();
  if (state.runner.result && demo.active) renderWalkthroughResult(state.runner.result);
  else $("#result-body").innerHTML = emptyDemoResult();
  $("#demo-start-btn").addEventListener("click", startWalkthrough);
  $$("#demo-input-mode .seg-btn").forEach((b) => b.addEventListener("click", () => {
    setInputMode(b.dataset.view, "demo-input-mode");
  }));
};

/* =====================================================================
   VIEW: DECISION RUNNER
   ===================================================================== */
VIEWS.runner = async function (params) {
  if (params.engine) state.runner.engine = params.engine;
  const engine = state.runner.engine;
  await defs(engine);
  if (engine === "uw") {
    const schema = await ratingSchema();
    state.runner.ratingWeights ||= JSON.parse(JSON.stringify(schema.calibration || schema.weights || {}));
  }

  setTopbar(
    engine === "uw" ? "Corrida de decisión de suscripción" : "Corrida de orientación de reclamos",
    engine === "uw" ? "Recorrido de elegibilidad más precio final cuando el resultado de suscripción queda aprobado." : "Orientación de cobertura citada a fuente — no es una determinación.",
    `<div class="seg" id="engine-seg">
       <button class="seg-btn ${engine === "uw" ? "active" : ""}" data-engine="uw">Suscripción</button>
       <button class="seg-btn ${engine === "coverage" ? "active" : ""}" data-engine="coverage">Reclamos</button>
     </div>
     <button class="btn btn-ghost" id="reset-btn">Limpiar</button>
     <button class="btn btn-primary" id="run-btn">▶ Ejecutar</button>`
  );

  $("#view").innerHTML = `
    ${runnerKpis(engine)}
    <div class="board">
      <section class="card inputs-card">
        <div class="card-head"><h2>Hechos de la solicitud</h2>
          <div class="card-head-tools">
            <div class="search"><span class="search-ico">⌕</span><input id="fact-search" type="text" placeholder="Filtrar…" autocomplete="off"/></div>
            <div class="seg" id="input-mode"><button class="seg-btn active" data-view="chat">Chat</button><button class="seg-btn" data-view="form">Formulario</button><button class="seg-btn" data-view="json">JSON</button></div>
          </div>
        </div>
        <div class="card-body">
          <div id="chat-view">${chatPanel()}</div>
          <div id="form-view" class="fields hidden"></div>
          <div id="json-view" class="hidden"><textarea id="json-input" spellcheck="false"></textarea><p class="json-hint">Avanzado — los cambios se sincronizan al ejecutar.</p></div>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Decisión</h2><span class="audit-id" id="audit-id"></span></div>
        <div class="card-body" id="result-body">${emptyResult()}</div>
      </section>
    </div>`;

  renderForm(); syncJson(); renderChat();
  $("#run-btn").addEventListener("click", runMotor);
  $("#reset-btn").addEventListener("click", () => { state.runner.values[engine] = {}; renderForm(); syncJson(); resetResult(); toast("Hechos limpiados"); });
  $$("#engine-seg .seg-btn").forEach((b) => b.addEventListener("click", () => go(b.dataset.engine === "coverage" ? "claims" : "uw")));
  $$("#input-mode .seg-btn").forEach((b) => b.addEventListener("click", () => setInputMode(b.dataset.view)));
  $("#fact-search").addEventListener("input", (e) => {
    const q = e.target.value.toLowerCase();
    $$("#form-view .field").forEach((r) => r.classList.toggle("hide", q && !r.textContent.toLowerCase().includes(q)));
  });
};

VIEWS.uw = function () {
  return VIEWS.runner({ engine: "uw" });
};

VIEWS.claims = function () {
  return VIEWS.runner({ engine: "coverage" });
};

// Switch the input card between Chat / Formulario / JSON. Shared by the segment
// buttons and the chat "Cargar al paquete" step so the flow stays consistent.
function setInputMode(next, modeId = "input-mode") {
  const seg = $(`#${modeId}`);
  if (!seg) return;
  if (!$("#json-view").classList.contains("hidden") && next !== "json" && !syncFromJson()) return;
  if (next === "json") syncJson();
  if (next === "form") renderForm();
  if (next === "chat") renderChat();
  $$(`#${modeId} .seg-btn`).forEach((x) => x.classList.toggle("active", x.dataset.view === next));
  $("#form-view").classList.toggle("hidden", next !== "form");
  $("#json-view").classList.toggle("hidden", next !== "json");
  $("#chat-view").classList.toggle("hidden", next !== "chat");
}

function runnerKpis(engine) {
  const coverage = engine === "coverage";
  const copy = coverage
    ? {
        outcome: ["Riesgo descrito", "pendiente de evaluar"],
        route: ["Ruta citada", "nodos con fuente"],
        facts: ["Hechos del siniestro", "de 0"],
        fourth: ["Salvedades", "pendiente de ejecución"]
      }
    : {
        outcome: ["Resultado", "Aún no ejecutado"],
        route: ["Ruta de decisión", "nodos evaluados"],
        facts: ["Hechos de solicitud", "de 0"],
        fourth: ["Precio final", "tras aprobación"]
      };
  return `<section class="kpis">
    <div class="kpi" id="kpi-outcome-card"><span class="kpi-label">${copy.outcome[0]}</span><span class="kpi-value" id="kpi-outcome">—</span><span class="kpi-sub" id="kpi-outcome-sub">${copy.outcome[1]}</span></div>
    <div class="kpi"><span class="kpi-label">${copy.route[0]}</span><span class="kpi-value" id="kpi-steps">0</span><span class="kpi-sub">${copy.route[1]}</span></div>
    <div class="kpi"><span class="kpi-label">${copy.facts[0]}</span><span class="kpi-value" id="kpi-facts">0</span><span class="kpi-sub" id="kpi-facts-sub">${copy.facts[1]}</span></div>
    <div class="kpi" id="kpi-price-card"><span class="kpi-label">${copy.fourth[0]}</span><span class="kpi-value" id="kpi-price">—</span><span class="kpi-sub" id="kpi-price-sub">${copy.fourth[1]}</span></div>
  </section>`;
}

function chatExampleControl() {
  const engine = state.runner.engine;
  if (engine === "uw") {
    return `<select id="chat-example-select" class="ex-select chat-example-control" title="Cargar un ejemplo en el chat">
      <option value="">Cargar ejemplo...</option>
      <option value="clean">${esc(UW_EXAMPLES.clean.label)}</option>
      <option value="review">${esc(UW_EXAMPLES.review.label)}</option>
    </select>`;
  }
  return `<button class="btn btn-ghost chat-example-control" id="chat-example-btn">Cargar ejemplo</button>`;
}

function chatPanel() {
  return `<div class="chat-panel">
    <div class="chat-steps" aria-hidden="true">
      <span class="chat-step is-on" data-step="1"><b>1</b> Extraer</span>
      <span class="chat-step" data-step="2"><b>2</b> Cargar al paquete</span>
      <span class="chat-step" data-step="3"><b>3</b> Ejecutar</span>
    </div>
    <div class="chat-composer">
      <div class="chat-composer-head">
        <span class="chat-composer-title">Chat del caso</span>
        ${chatExampleControl()}
      </div>
      <textarea id="chat-input" class="nl chat-input" placeholder="Pega la solicitud de suscripción o narrativa del reclamo en español." spellcheck="true"></textarea>
      <div class="chat-loaded-note hidden" id="chat-loaded-note"></div>
      <div class="chat-actions">
        <button class="btn btn-primary" id="chat-suggest-btn">✨ Extraer hechos</button>
        <label class="btn btn-ghost file-btn" title="Adjuntar foto o audio">Adjuntar<input id="chat-files" type="file" accept="image/*,audio/*" multiple/></label>
        <button class="btn btn-ghost" id="chat-clear-btn">Limpiar</button>
      </div>
    </div>
    <p class="chat-hint">Solo orientativo. El motor ejecuta los valores confirmados del paquete, no el texto.</p>
    <div class="media-list" id="chat-media"></div>
    <div class="nl-result chat-result" id="chat-result"></div>
    <div class="chat-load-row hidden" id="chat-load-row">
      <button class="btn btn-secondary" id="chat-load-package-btn">Cargar al paquete</button>
      <span class="chat-load-hint">Luego revisa el formulario o pulsa <b>▶ Ejecutar</b>.</span>
    </div>
  </div>`;
}

function chatState() {
  state.runner.chat[state.runner.engine] ||= { text: "", attachments: [], result: null };
  return state.runner.chat[state.runner.engine];
}

function renderChat() {
  const input = $("#chat-input");
  if (!input) return;
  const chat = chatState();
  input.value = chat.text || "";
  input.oninput = (e) => { chat.text = e.target.value; };
  $("#chat-suggest-btn").onclick = suggestFromChat;
  $("#chat-clear-btn").onclick = () => {
    state.runner.chat[state.runner.engine] = { text: "", attachments: [], result: null };
    renderChat();
    toast("Chat limpiado");
  };
  $("#chat-files").onchange = async (e) => {
    const files = Array.from(e.target.files || []);
    const attachments = await Promise.all(files.map(readAttachmentFile));
    chat.attachments.push(...attachments);
    e.target.value = "";
    renderChatMedia();
  };
  const loadBtn = $("#chat-load-package-btn");
  if (loadBtn) loadBtn.onclick = () => {
    const entries = chatSuggestionEntries(chat.result);
    if (!entries.length) { toast("Primero extrae hechos del chat", true); return; }
    entries.forEach(([k, v]) => applySuggestedFact(k, v, false));
    renderForm(); syncJson();
    setInputMode("form", activeInputModeId());
    toast("Paquete cargado — revisa el formulario o pulsa Ejecutar");
  };
  renderChatMedia();
  renderFactSuggestions(chat.result, "#chat-result");
  bindChatExampleControls();
  updateChatStep();
}

function bindChatExampleControls() {
  const engine = state.runner.engine;
  const loadExample = (key = "clean") => {
    loadCaseExampleText(engine, key, !!$("#demo-input-mode"));
    toast(engine === "uw" && UW_EXAMPLES[key] ? `Ejemplo en el chat: ${UW_EXAMPLES[key].label}` : "Ejemplo cargado en el chat");
  };
  const sampleSelect = $("#chat-example-select");
  if (sampleSelect) sampleSelect.onchange = (e) => {
    if (!e.target.value) return;
    loadExample(e.target.value);
    e.target.value = "";
  };
  const sampleBtn = $("#chat-example-btn");
  if (sampleBtn) sampleBtn.onclick = () => loadExample("clean");
}

// Normalize an extract-facts result into [key, value] pairs (handles the
// {value, confidence} wrapper the extractor sometimes returns).
function chatSuggestionEntries(result) {
  const facts = result && (result.facts || result.extracted || result);
  if (!facts || typeof facts !== "object" || Array.isArray(facts)) return [];
  return Object.entries(facts).map(([k, v]) => [k, v && typeof v === "object" && "value" in v ? v.value : v]);
}

// Light progress cue on the chat steps: 1 until extracted, 2 once suggestions
// exist, 3 once at least one suggested fact is in the confirmed packet.
function updateChatStep() {
  const host = $("#chat-view");
  if (!host) return;
  const entries = chatSuggestionEntries(chatState().result);
  const packet = state.runner.values[state.runner.engine] || {};
  const loaded = entries.some(([k]) => k in packet);
  const step = loaded ? 3 : entries.length ? 2 : 1;
  $$("#chat-view .chat-step").forEach((el) => {
    const n = Number(el.dataset.step);
    el.classList.toggle("is-done", n < step);
    el.classList.toggle("is-on", n === step);
  });
  const loadRow = $("#chat-load-row");
  if (loadRow) loadRow.classList.toggle("hidden", !entries.length);
}

function renderChatMedia() {
  const host = $("#chat-media");
  if (!host) return;
  const attachments = chatState().attachments || [];
  host.innerHTML = attachments.length ? attachments.map((a, i) => `<div class="media-chip">
    <span class="media-kind">${esc(a.kind)}</span>
    <span class="media-name">${esc(a.name)}</span>
    <span class="media-size">${esc(fileSize(a.size))}</span>
    <button class="media-remove" data-idx="${i}" title="Quitar">×</button>
  </div>`).join("") : "";
  $$("#chat-media .media-remove").forEach((b) => b.addEventListener("click", () => {
    chatState().attachments.splice(Number(b.dataset.idx), 1);
    renderChatMedia();
  }));
}

function fileSize(bytes) {
  const n = Number(bytes || 0);
  if (n >= 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  if (n >= 1024) return `${Math.round(n / 1024)} KB`;
  return `${n} B`;
}

function readAttachmentFile(file) {
  const kind = file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "photo" : "file";
  const base = { name: file.name, mime: file.type, size: file.size, kind };
  if (!["photo", "audio"].includes(kind) || file.size > 6 * 1024 * 1024) {
    return Promise.resolve({ ...base, payload_status: file.size > 6 * 1024 * 1024 ? "too_large_for_inline_payload" : "metadata_only" });
  }
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ ...base, data_url: reader.result, payload_status: "inline_payload_ready" });
    reader.onerror = () => resolve({ ...base, payload_status: "read_failed" });
    reader.readAsDataURL(file);
  });
}

async function suggestFromChat() {
  const chat = chatState();
  const text = ($("#chat-input") && $("#chat-input").value.trim()) || "";
  chat.text = text;
  if (!text && !(chat.attachments || []).length) { toast("Agrega primero texto, una foto o audio", true); return; }
  const btn = $("#chat-suggest-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const result = await postJSON("/api/nl/extract-facts", {
      engine: state.runner.engine,
      text,
      attachments: chat.attachments || []
    });
    chat.result = result;
    renderFactSuggestions(result, "#chat-result");
    updateChatStep();
    toast("Sugerencias listas");
  } catch {
    toast("Falló la extracción", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function demoPanel() {
  return `<div class="demo-panel">
    <div class="truth-note"><b>Recorrido para interesados.</b> Ingresa un caso, sugiere hechos, confírmalos y recorre la ruta ejecutable real nodo por nodo.</div>
    <textarea id="demo-input" class="nl demo-input" placeholder="Pega una narrativa de caso en español para presentar." spellcheck="true"></textarea>
    <div class="demo-actions">
      <button class="btn btn-ghost" id="demo-sample-btn">Cargar caso demo</button>
      <button class="btn btn-secondary" id="demo-suggest-btn">Sugerir hechos</button>
      <button class="btn btn-primary" id="demo-start-btn">Iniciar recorrido</button>
    </div>
    <div class="demo-status" id="demo-status"></div>
    <div class="nl-result demo-result" id="demo-result"></div>
  </div>`;
}

function demoState() {
  state.runner.demo[state.runner.engine] ||= { text: DEMO_TEXT[state.runner.engine] || "", result: null, step: 0, active: false };
  return state.runner.demo[state.runner.engine];
}

function renderDemo() {
  const input = $("#demo-input");
  if (!input) return;
  const demo = demoState();
  input.value = demo.text || "";
  input.oninput = (e) => { demo.text = e.target.value; };
  $("#demo-sample-btn").onclick = () => {
    const engine = state.runner.engine;
    loadCaseExampleText(engine, "clean", true);
    renderDemo();
    toast("Caso demo cargado como texto");
  };
  $("#demo-suggest-btn").onclick = suggestFromDemo;
  $("#demo-start-btn").onclick = startWalkthrough;
  $("#demo-status").innerHTML = demoStatus();
  renderFactSuggestions(demo.result, "#demo-result");
}

function demoStatus() {
  const engine = state.runner.engine;
  const factCount = Object.keys(compactFacts(state.runner.values[engine])).length;
  const demo = demoState();
  const active = demo.active && state.runner.result;
  return `<span class="badge ${factCount ? "badge-ok" : "badge-amber"}">${factCount} hechos confirmados</span>
    ${active ? `<span class="badge badge-ok">recorrido activo</span>` : `<span class="badge">no iniciado</span>`}
    <span class="demo-hint">Las sugerencias llenan el mismo paquete de formulario/JSON; revísalas antes de iniciar.</span>`;
}

async function suggestFromDemo() {
  const demo = demoState();
  const text = ($("#demo-input") && $("#demo-input").value.trim()) || "";
  demo.text = text;
  if (!text) { toast("Agrega primero una narrativa del caso", true); return; }
  const btn = $("#demo-suggest-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const result = await postJSON("/api/nl/extract-facts", { engine: state.runner.engine, text });
    demo.result = result;
    renderFactSuggestions(result, "#demo-result");
    $("#demo-status").innerHTML = demoStatus();
    toast("Sugerencias demo listas");
  } catch {
    toast("Falló la extracción demo", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

async function startWalkthrough() {
  const jsonView = $("#json-view");
  if (jsonView && !jsonView.classList.contains("hidden") && !syncFromJson()) return;
  const engine = state.runner.engine;
  const facts = compactFacts(state.runner.values[engine]);
  if (!Object.keys(facts).length) {
    toast("Aplica o ingresa hechos antes de iniciar el recorrido", true);
    return;
  }
  const demo = demoState();
  const btn = $("#demo-start-btn"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const endpoint = engine === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const role = engine === "uw" ? "uw_user" : "claims_user";
    const body = { facts, facts_confirmed: true };
    if (engine === "uw") {
      body.include_pricing = true;
      body.rating_weights = state.runner.ratingWeights;
    }
    const data = await postJSON(endpoint, body, role);
    state.runner.result = data;
    demo.step = 0;
    demo.active = true;
    renderWalkthroughResult(data);
    renderDemo();
    toast("Recorrido listo");
  } catch {
    toast("Falló el recorrido - ¿está levantado el servidor?", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function renderForm() {
  const engine = state.runner.engine, d = state.cache.defs[engine] || {}, vals = state.runner.values[engine];
  const defsForForm = engine === "uw" ? { ...d, ...uwPricingFactDefs() } : d;
  const groups = { "Clasificación": [], "Alertas de riesgo": [], "Valores y cantidades": [], "Identidad": [] };
  const keys = [...new Set([...Object.keys(defsForForm), ...Object.keys(vals)])];
  for (const k of keys) {
    const t = (defsForForm[k] && defsForForm[k].type) || inferType(vals[k]);
    if (t === "enum") groups["Clasificación"].push(k);
    else if (t === "boolean") groups["Alertas de riesgo"].push(k);
    else if (t === "number") groups["Valores y cantidades"].push(k);
    else groups["Identidad"].push(k);
  }
  let html = "";
  for (const [title, keys] of Object.entries(groups)) {
    if (!keys.length) continue;
    html += `<div class="fgroup-title">${title} · ${keys.length}</div>`;
    for (const k of keys) html += fieldRow(k, defsForForm[k] || {}, Object.prototype.hasOwnProperty.call(vals, k) ? vals[k] : undefined);
  }
  $("#form-view").innerHTML = html;
  $$("#form-view [data-fk]").forEach((el) => el.addEventListener("change", (e) => onFieldChange(e.target)));
  refreshFactCount();
}
function uwPricingFactDefs() {
  return {
    model_year: { type: "number", prompt: "Año modelo" },
    make: { type: "string", prompt: "Marca" },
    marca_auto: { type: "number", prompt: "ID marca RUAT" },
    model: { type: "string", prompt: "Modelo" },
    city: { type: "enum", prompt: "Plaza de circulación", values: ["La Paz", "Santa Cruz", "Cochabamba", "Tarija", "Trinidad", "Oruro", "Potosi", "Sucre"] },
    plaza_auto: { type: "number", prompt: "ID plaza_auto" },
    extraterritorialidad: { type: "enum", prompt: "Extraterritorialidad", values: ["no", "si"] },
    cuotas: { type: "number", prompt: "Número de cuotas" },
    selected_pricing_option: { type: "enum", prompt: "Opción de precio", values: ["option_1", "option_2", "option_3"] }
  };
}
function inferType(v) { return typeof v === "boolean" ? "boolean" : typeof v === "number" ? "number" : Array.isArray(v) ? "array" : "string"; }
function enumValues(def) { return Array.isArray(def.values) ? def.values : (Array.isArray(def.allowed_values) ? def.allowed_values : []); }
function fieldRow(key, def, value) {
  const type = def.type || inferType(value);
  const label = def.prompt || titleCase(key);
  const ruling = def.needs_ruling ? " needs-ruling" : "";
  let control;
  if (type === "boolean") control = `<select class="bool-select" data-fk="${key}" data-ft="boolean">
      <option value="" ${value === undefined || value === null || value === "" ? "selected" : ""}>Desconocido</option>
      <option value="true" ${value === true ? "selected" : ""}>Sí</option>
      <option value="false" ${value === false ? "selected" : ""}>No</option>
    </select>`;
  else if (type === "enum" && enumValues(def).length) {
    const opts = enumValues(def);
    const current = hasValor(value) ? String(value) : "";
    const allOpts = current && !opts.includes(current) ? [current, ...opts] : opts;
    control = `<select data-fk="${key}" data-ft="enum"><option value="" ${!current ? "selected" : ""}>Desconocido</option>${allOpts.map((o) => `<option value="${esc(o)}" ${o === current ? "selected" : ""}>${esc(titleCase(o))}</option>`).join("")}</select>`;
  }
  else if (type === "number") control = `<input class="num-input" type="number" data-fk="${key}" data-ft="number" value="${value ?? ""}"/>`;
  else if (type === "array") control = `<input class="num-input" style="width:150px;text-align:left" type="text" data-fk="${key}" data-ft="array" placeholder="code, code" value="${esc((value || []).join(", "))}"/>`;
  else control = `<input class="num-input" style="width:160px;text-align:left" type="text" data-fk="${key}" data-ft="string" value="${esc(value ?? "")}"/>`;
  return `<div class="field${ruling}"><div class="field-label">${esc(label)}<span class="field-key">${esc(key)}</span></div><div class="field-control">${control}</div></div>`;
}
function onFieldChange(el) {
  const k = el.dataset.fk, t = el.dataset.ft;
  let v;
  if (t === "boolean") v = el.value === "" ? undefined : el.value === "true";
  else if (t === "number") v = el.value === "" ? null : Number(el.value);
  else if (t === "array") v = el.value.split(",").map((s) => s.trim()).filter(Boolean);
  else v = el.value;
  if (hasValor(v)) state.runner.values[state.runner.engine][k] = v;
  else delete state.runner.values[state.runner.engine][k];
  syncJson();
}
function syncJson() { const el = $("#json-input"); if (el) el.value = JSON.stringify(state.runner.values[state.runner.engine], null, 2); refreshFactCount(); }
function syncFromJson() {
  try {
    const parsed = JSON.parse($("#json-input").value);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Se esperaba un objeto");
    state.runner.values[state.runner.engine] = compactFacts(parsed);
    renderForm();
    return true;
  } catch { toast("JSON inválido", true); return false; }
}
function refreshFactCount() {
  const vals = compactFacts(state.runner.values[state.runner.engine]);
  const d = state.runner.engine === "uw"
    ? { ...(state.cache.defs[state.runner.engine] || {}), ...uwPricingFactDefs() }
    : (state.cache.defs[state.runner.engine] || {});
  const total = Object.keys(d).length || Object.keys(vals).length;
  if ($("#kpi-facts")) { $("#kpi-facts").textContent = Object.keys(vals).length; $("#kpi-facts-sub").textContent = `de ${total}`; }
}
function compactFacts(values) {
  const out = {};
  for (const [k, v] of Object.entries(values || {})) if (hasValor(v)) out[k] = v;
  return out;
}

async function runMotor() {
  if (!$("#json-view").classList.contains("hidden") && !syncFromJson()) return;
  const engine = state.runner.engine, btn = $("#run-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const endpoint = engine === "uw" ? "/api/uw/run" : "/api/coverage/run";
    const role = engine === "uw" ? "uw_user" : "claims_user";
    const body = { facts: compactFacts(state.runner.values[engine]), facts_confirmed: true };
    if (engine === "uw") {
      body.include_pricing = true;
      body.rating_weights = state.runner.ratingWeights;
    }
    const data = await postJSON(endpoint, body, role);
    demoState().active = false;
    state.runner.result = data; renderResult(data); toast("Decisión computed");
  } catch { toast("Falló la ejecución — ¿está levantado el servidor?", true); }
  finally { btn.classList.remove("loading"); btn.disabled = false; }
}

function emptyResult() {
  return `<div class="empty"><div class="empty-ico">▣</div><p class="empty-title">Aún no hay decisión</p>
    <p class="empty-sub">Ajusta los hechos de la solicitud y ejecuta el motor para ver el resultado y la ruta exacta con citas fuente.</p></div>`;
}
function emptyDemoResult() {
  return `<div class="empty demo-empty"><div class="empty-ico">▷</div><p class="empty-title">Listo para el recorrido</p>
    <p class="empty-sub">Carga el ejemplo o ingresa un caso, confirma los hechos y comienza. Cada clic muestra el siguiente nodo que visitó el motor real.</p></div>`;
}
function resetResult() {
  const demo = demoState();
  demo.active = false;
  demo.step = 0;
  $("#result-body").innerHTML = emptyResult();
  $("#audit-id").textContent = "";
  setKpi("—", state.runner.engine === "coverage" ? "pendiente de evaluar" : "Aún no ejecutado", "");
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = "0";
  setRunFourthKpi(null);
  refreshFactCount();
}

function renderResult(data) {
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  const isEsc = data.kind === "escalate" || data.outcome === "ESCALATE" || data.outcome === "missing_fact" || !!(data.escalation && data.escalation.blocking_fact);
  const key = data.outcome || (isEsc ? "ESCALATE" : "result");
  const meta = VERDICT[key] || VERDICT[String(key).toLowerCase()] || { cls: "v-info", ico: "•", tag: titleCase(key), kpi: "is-info" };

  let headline, reason, chips = [];
  if (isEsc && data.escalation) {
    const e = data.escalation;
    headline = e.node_title || "Revisión manual requerida";
    reason = e.message || e.fact_prompt || e.reason || "Falta un hecho requerido.";
    if (e.blocking_fact) chips.push(chip("bloqueante", e.blocking_fact));
    if (e.on_missing) chips.push(chip("on_missing", e.on_missing));
    if (e.at_node) chips.push(chip("nodo", e.at_node));
    if (e.ledger_ref) chips.push(chip("registro", ledgerIdFromRef(e.ledger_ref)));
  } else {
    headline = meta.tag;
    reason = data.reason || data.orientation || "Nodo terminal alcanzado.";
    if (data.process) chips.push(chip("proceso", data.process));
    if (data.terminal_node) chips.push(chip("terminal", data.terminal_node));
  }
  const src = (isEsc ? (data.escalation || {}).source_quote || (data.escalation || {}).fact_source_quote : data.source_quote);

  let html = `<div class="verdict ${meta.cls}"><div class="verdict-ico">${meta.ico}</div><div class="verdict-main">
    <div class="verdict-tag">${esc(meta.tag)}</div><div class="verdict-headline">${esc(headline)}</div>
    <div class="verdict-reason">${esc(reason)}</div><div class="verdict-meta">${chips.join("")}</div></div></div>`;
  if (src) html += `<blockquote class="quote">${esc(src)}</blockquote>`;
  if (data.human_packet) html += humanPaquetePanel(data.human_packet);
  if (data.pricing) html += uwPricingPanel(data.pricing);
  if (isEsc && data.escalation && data.escalation.ledger_ref) html += `<div class="issue-actions result-actions">
    ${ledgerLink(data.escalation.ledger_ref)}
    <button class="flag-change" data-kind="escalation" data-target="${esc(data.escalation.at_node || data.escalation.ledger_ref)}" data-title="${esc(data.escalation.node_title || data.escalation.reason || "Escalamiento")}" data-summary="${esc(data.escalation.message || data.escalation.detail || data.escalation.reason || "")}" data-engine="${esc(state.runner.engine)}">Preparar resolución</button>
  </div>`;
  if (audit.length) html += `<div class="section-label">Ruta de decisión · ${audit.length} ${audit.length === 1 ? "nodo" : "nodos"}</div><div class="path">${audit.map((s, i) => stepRow(s, i === audit.length - 1 && !isEsc)).join("")}</div>`;
  if (caveats.length) html += `<div class="section-label">Salvedades</div><div class="caveats">${caveats.map(caveatRow).join("")}</div>`;
  $("#result-body").innerHTML = html;
  bindIncidenciaActions("#result-body");
  bindHumanPaquete(data.human_packet);
  $("#audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  const outcomeKpi = engineOutcomeKpi(data, isEsc, meta);
  setKpi(outcomeKpi.value, outcomeKpi.sub, meta.kpi);
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = audit.length;
  setRunFourthKpi(data); refreshFactCount();
}

function renderWalkthroughResult(data) {
  const audit = Array.isArray(data.audit) ? data.audit : [];
  const demo = demoState();
  const finalIndex = audit.length;
  demo.step = Math.max(0, Math.min(Number(demo.step || 0), finalIndex));
  const idx = demo.step;
  const totalSlides = Math.max(1, audit.length + 1);
  const progress = Math.round(((idx + 1) / totalSlides) * 100);
  const body = idx < audit.length
    ? walkthroughNodePanel(audit[idx], idx, audit.length, data)
    : walkthroughVerdictPanel(data);
  $("#result-body").innerHTML = `<div class="walkthrough">
    <div class="walk-head">
      <div>
        <span class="walk-label">Recorrido de presentación</span>
        <h3>${idx < audit.length ? `Paso ${idx + 1} de ${audit.length}` : "Dictamen alcanzado"}</h3>
      </div>
      <span class="badge ${idx < audit.length ? "badge-amber" : "badge-ok"}">${idx < audit.length ? "recorriendo grafo" : "completo"}</span>
    </div>
    <div class="walk-progress"><span style="width:${progress}%"></span></div>
    ${body}
    <div class="walk-controls">
      <button class="btn btn-ghost" id="walk-back" ${idx <= 0 ? "disabled" : ""}>Atrás</button>
      <button class="btn btn-primary" id="walk-next" ${idx >= finalIndex ? "disabled" : ""}>Siguiente</button>
      <button class="btn btn-ghost" id="walk-restart">Reiniciar</button>
    </div>
  </div>`;
  bindWalkthroughControls(data);
  bindIncidenciaActions("#result-body");
  bindHumanPaquete(data.human_packet);
  $("#audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  const summary = walkthroughSummary(data);
  const outcomeKpi = engineOutcomeKpi(data, summary.isEsc, summary.meta);
  setKpi(outcomeKpi.value, outcomeKpi.sub, summary.meta.kpi);
  const steps = $("#kpi-steps");
  if (steps) steps.textContent = audit.length;
  setRunFourthKpi(data);
  refreshFactCount();
}

function walkthroughNodePanel(step, idx, total, data) {
  const facts = step.facts_used && typeof step.facts_used === "object"
    ? Object.entries(step.facts_used).map(([k, v]) => `<span class="fact-chip">${esc(k)}=<b>${esc(fmt(v))}</b></span>`).join("")
    : "";
  const packetFacts = Object.keys(compactFacts(state.runner.values[state.runner.engine])).length;
  const result = step.chosen || step.result || "evaluated";
  return `<div class="walk-node">
    <div class="walk-node-top">
      <span class="ntype nt-${esc(step.type || "condition")}">${esc(step.type || "nodo")}</span>
      <span class="walk-node-id">${esc(step.node || `step-${idx + 1}`)}</span>
    </div>
    <h4>${esc(step.title || step.node || "Nodo ejecutable")}</h4>
    <div class="walk-explain">
      <div><span>Paquete</span><b>${packetFacts} hechos confirmados</b></div>
      <div><span>Resultado aquí</span><b>${esc(titleCase(result))}</b></div>
      <div><span>Progreso</span><b>${idx + 1}/${total} nodos</b></div>
    </div>
    ${step.detail ? `<p class="walk-detail">${esc(step.detail)}</p>` : ""}
    ${facts ? `<div class="section-label inline">Hechos usados en este nodo</div><div class="walk-facts">${facts}</div>` : ""}
    ${step.source_quote ? `<div class="section-label inline">Texto fuente</div><blockquote class="quote sm">${esc(step.source_quote)}</blockquote>` : ""}
    ${data.human_packet && idx === total - 1 ? `<div class="walk-callout"><b>Punto de intervención humana.</b> Esta ruta se detiene con un paquete que puede responderse y reanudarse.</div>` : ""}
  </div>`;
}

function walkthroughVerdictPanel(data) {
  const summary = walkthroughSummary(data);
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  let html = `<div class="walk-verdict ${summary.meta.cls}">
    <div class="verdict-ico">${summary.meta.ico}</div>
    <div class="verdict-main">
      <div class="verdict-tag">${esc(summary.meta.tag)}</div>
      <div class="verdict-headline">${esc(summary.headline)}</div>
      <div class="verdict-reason">${esc(summary.reason)}</div>
      <div class="verdict-meta">${summary.chips.join("")}</div>
    </div>
  </div>`;
  if (summary.source) html += `<blockquote class="quote">${esc(summary.source)}</blockquote>`;
  if (data.human_packet) html += humanPaquetePanel(data.human_packet);
  if (data.pricing) html += uwPricingPanel(data.pricing);
  if (caveats.length) html += `<div class="section-label">Salvedades</div><div class="caveats">${caveats.map(caveatRow).join("")}</div>`;
  return html;
}

function walkthroughSummary(data) {
  const isEsc = data.kind === "escalate" || data.outcome === "ESCALATE" || data.outcome === "missing_fact" || !!(data.escalation && data.escalation.blocking_fact);
  const key = data.outcome || (isEsc ? "ESCALATE" : "result");
  const meta = VERDICT[key] || VERDICT[String(key).toLowerCase()] || { cls: "v-info", ico: "•", tag: titleCase(key), kpi: "is-info" };
  let headline, reason, chips = [];
  if (isEsc && data.escalation) {
    const e = data.escalation;
    headline = e.node_title || "Revisión manual requerida";
    reason = e.message || e.fact_prompt || e.reason || "Falta un hecho requerido.";
    if (e.blocking_fact) chips.push(chip("bloqueante", e.blocking_fact));
    if (e.on_missing) chips.push(chip("on_missing", e.on_missing));
    if (e.at_node) chips.push(chip("nodo", e.at_node));
    if (e.ledger_ref) chips.push(chip("registro", ledgerIdFromRef(e.ledger_ref)));
  } else {
    headline = meta.tag;
    reason = data.reason || data.orientation || "Nodo terminal alcanzado.";
    if (data.process) chips.push(chip("proceso", data.process));
    if (data.terminal_node) chips.push(chip("terminal", data.terminal_node));
  }
  const source = isEsc ? (data.escalation || {}).source_quote || (data.escalation || {}).fact_source_quote : data.source_quote;
  return { isEsc, meta, headline, reason, chips, source };
}

function bindWalkthroughControls(data) {
  const demo = demoState();
  const max = Array.isArray(data.audit) ? data.audit.length : 0;
  const back = $("#walk-back");
  const next = $("#walk-next");
  const restart = $("#walk-restart");
  if (back) back.addEventListener("click", () => { demo.step = Math.max(0, demo.step - 1); renderWalkthroughResult(data); });
  if (next) next.addEventListener("click", () => { demo.step = Math.min(max, demo.step + 1); renderWalkthroughResult(data); });
  if (restart) restart.addEventListener("click", () => { demo.step = 0; renderWalkthroughResult(data); });
}

const chip = (k, v) => `<span class="chip">${esc(titleCase(k))} · <b>${esc(v)}</b></span>`;
function uwPricingPanel(pricing) {
  const quote = pricing.quote || {};
  if (pricing.status === "blocked_by_uw_outcome") {
    return `<div class="price-inline price-blocked">
      <div class="price-inline-head"><span class="badge badge-amber">precio bloqueado</span><b>El precio final espera aprobación de suscripción</b></div>
      <p>${esc(pricing.blocked_reason || "El resultado de suscripción no está aprobado.")}</p>
    </div>`;
  }
  if (pricing.status === "missing_rating_input") {
    return `<div class="price-inline price-blocked">
      <div class="price-inline-head"><span class="badge badge-amber">faltan datos de precio</span><b>Aún no se puede producir precio final</b></div>
      <p>${esc(pricing.blocked_reason || "Faltan datos de tarificación.")}</p>
      <div class="step-facts">${(pricing.required_inputs || []).map((f) => `<span class="fact-chip">${esc(f)}</span>`).join("")}</div>
    </div>`;
  }
  const approved = pricing.approved;
  return `<div class="price-inline ${approved ? "approved" : "review"}">
    <div class="price-inline-head">
      <span class="badge ${approved ? "badge-ok" : "badge-amber"}">${approved ? "precio final aprobado" : "revisión de precio"}</span>
      <b>Bs. ${money(approved ? pricing.final_price_bob : pricing.suggested_price_bob)}</b>
    </div>
    <p>${approved ? "Suscripción aprobada y la tarificación no tiene alertas de revisión." : "La suscripción es elegible, pero el precio necesita revisión antes de ser final."}</p>
    ${priceOptionsList(quote.options || pricing.suggested_options || [])}
    <div class="price-breakdown compact">${(quote.breakdown || []).map(priceBreakdownRow).join("")}</div>
    ${(pricing.review_reasons || []).length ? `<div class="price-flags">${pricing.review_reasons.map((r) => `<span class="flag-count text">${esc(titleCase(r))}</span>`).join("")}</div>` : ""}
  </div>`;
}

function priceOptionsList(options) {
  if (!Array.isArray(options) || !options.length) return "";
  return `<div class="price-breakdown compact">${options.map((option) => `
    <div class="price-break-row">
      <span><b>${esc(option.label || option.id)}</b><em>franquicia min. Bs. ${money((option.franchise || {}).minimum_bob)}</em></span>
      <strong>Bs. ${money(option.cash_annual_premium_bob)}</strong>
    </div>`).join("")}</div>`;
}
function humanPaquetePanel(packet) {
  // A package that can't be auto-resumed and needs a person to weigh in is shown
  // as the notification that person would receive, with an inline resolve flow.
  if (!packet.resumable && packet.needs_human_task) return humanNotificationPanel(packet);
  const schema = packet.answer_schema || {};
  const facts = Object.keys(packet.facts || {}).length;
  const path = (packet.path || []).length;
  const node = packet.current_node || {};
  const control = packet.resumable ? humanAnswerControl(schema) : "";
  const action = packet.resumable
    ? `<button class="btn btn-primary" id="human-resume-btn">Continuar recorrido</button>`
    : `<button class="flag-change" data-kind="${esc(packet.task_type)}" data-target="${esc((node && node.id) || packet.requested_fact || "manual-review")}" data-title="${esc(packet.question || "Revisión manual")}" data-summary="${esc((packet.context && (packet.context.message || packet.context.reason)) || packet.non_resumable_reason || "")}" data-engine="${esc(packet.engine)}">Preparar dictamen</button>`;
  return `<div class="human-packet">
    <div class="human-head"><span class="human-badge">${packet.resumable ? "Necesita respuesta" : "Necesita dictamen"}</span><span class="mono">${esc(packet.packet_id || "")}</span></div>
    <h3>${esc(packet.question || "Intervención humana requerida")}</h3>
    <p class="human-sub">El paquete contiene ${facts} hechos y ${path} pasos de ruta${node && node.id ? ` · detenido en ${esc(node.id)}` : ""}.</p>
    ${schema.source_quote ? `<blockquote class="quote sm">${esc(schema.source_quote)}</blockquote>` : ""}
    ${packet.resumable ? `<label class="human-answer"><span>${esc(schema.fact_id || packet.requested_fact || "respuesta")}</span>${control}</label>` : `<p class="human-sub">${esc(packet.non_resumable_reason || "Esto debe pasar por gobernanza.")}</p>`}
    <div class="human-actions">${action}</div>
  </div>`;
}
function humanAnswerControl(schema) {
  const values = Array.isArray(schema.allowed_values) ? schema.allowed_values : [];
  const fact = esc(schema.fact_id || "");
  if (schema.type === "boolean") return `<select id="human-answer" data-ft="boolean" data-fact="${fact}"><option value="">Desconocido</option><option value="true">Sí</option><option value="false">No</option></select>`;
  if (schema.type === "enum" && values.length) return `<select id="human-answer" data-ft="enum" data-fact="${fact}"><option value="">Elegir…</option>${values.map((v) => `<option value="${esc(v)}">${esc(titleCase(v))}</option>`).join("")}</select>`;
  if (schema.type === "number") return `<input id="human-answer" class="num-input" type="number" data-ft="number" data-fact="${fact}" placeholder="${esc(schema.unit || "")}"/>`;
  if (schema.type === "array") return `<input id="human-answer" class="num-input" style="width:220px;text-align:left" type="text" data-ft="array" data-fact="${fact}" placeholder="code, code"/>`;
  return `<input id="human-answer" class="num-input" style="width:220px;text-align:left" type="text" data-ft="string" data-fact="${fact}"/>`;
}
function bindHumanPaquete(packet) {
  if (!packet) return;
  if (!packet.resumable && packet.needs_human_task) return bindHumanNotification(packet);
  const btn = $("#human-resume-btn");
  if (!btn) return;
  btn.addEventListener("click", async () => {
    const el = $("#human-answer");
    const value = parseAnswerValue(el);
    if (!hasValor(value)) { toast("Responde primero el hecho solicitado", true); return; }
    btn.classList.add("loading"); btn.disabled = true;
    try {
      const role = packet.engine === "uw" ? "uw_user" : "claims_user";
      const data = await postJSON(packet.resume_endpoint || `/api/${packet.engine}/resume`, {
        packet,
        answer: { fact_id: packet.requested_fact, value },
        facts_confirmed: true
      }, role);
      state.runner.values[packet.engine] = compactFacts({ ...(packet.facts || {}), [packet.requested_fact]: value });
      state.runner.result = data;
      renderForm(); syncJson(); renderResult(data);
      toast("Recorrido continuado");
    } catch {
      toast("No se pudo reanudar el recorrido", true);
    } finally {
      btn.classList.remove("loading"); btn.disabled = false;
    }
  });
}
function parseAnswerValue(el) {
  if (!el) return undefined;
  const t = el.dataset.ft;
  if (t === "boolean") return el.value === "" ? undefined : el.value === "true";
  if (t === "number") return el.value === "" ? undefined : Number(el.value);
  if (t === "array") return el.value.split(",").map((s) => s.trim()).filter(Boolean);
  return el.value;
}

/* ---------- human-in-the-loop notification ----------
   Visualizes the notification a human (e.g. pricing/underwriting) receives when
   the engine stops on a package it cannot resume on its own, plus the inline
   "respond and let the packet continue" flow against the real human-task API. */
const HUMAN_OWNER_LABELS = {
  pricing_review: "Suscriptor · Pricing",
  governance_or_manual_review: "Mesa de gobernanza",
  missing_document: "Suscriptor",
  manual_review: "Suscriptor",
};
function humanOwnerLabel(packet, task) {
  if (task && task.owner_role) return titleCase(task.owner_role);
  return HUMAN_OWNER_LABELS[packet.task_type] || "Suscriptor";
}
function humanPacketPricing(packet) {
  return (packet.context && packet.context.pricing) || {};
}
function humanNotificationPanel(packet) {
  const node = packet.current_node || {};
  const facts = Object.keys(packet.facts || {}).length;
  const path = (packet.path || []).length;
  const ctx = packet.context || {};
  const pricing = humanPacketPricing(packet);
  const reasons = (pricing.review_reasons || []).map((r) => `<span class="notify-reason">${esc(titleCase(r))}</span>`).join("");
  const suggested = pricing.suggested_price_bob;
  return `<div class="human-notify" data-packet='${esc(JSON.stringify(packet))}'>
    <div class="notify-card">
      <div class="notify-head">
        <span class="notify-bell">◉</span>
        <div class="notify-headtext">
          <div class="notify-to">Notificación para: <b>${esc(humanOwnerLabel(packet))}</b></div>
          <div class="notify-title">Un paquete espera tu revisión</div>
        </div>
        <span class="notify-sla">SLA 3 h</span>
      </div>
      <div class="notify-body">
        <p class="notify-q">${esc(packet.question || "Intervención humana requerida")}</p>
        ${ctx.message ? `<p class="notify-msg">${esc(ctx.message)}</p>` : ""}
        ${reasons ? `<div class="notify-reasons">${reasons}</div>` : ""}
        ${suggested != null ? `<div class="notify-suggested">Prima sugerida por el motor <b>Bs ${esc(money(suggested))}</b> · requiere aprobación humana</div>` : ""}
        ${ctx.source_quote ? `<blockquote class="quote sm">${esc(ctx.source_quote)}</blockquote>` : ""}
        <div class="notify-meta"><span>${facts} hechos</span><span>${path} pasos de ruta</span>${node && node.id ? `<span>detenido en <span class="mono">${esc(node.id)}</span></span>` : ""}</div>
      </div>
      <div class="notify-stage" id="notify-stage">
        <button class="btn btn-primary" id="notify-send-btn">Enviar a la bandeja del suscriptor</button>
        <span class="notify-stage-hint">Crea la tarea humana y notifica al rol responsable.</span>
      </div>
    </div>
  </div>`;
}
function humanNotifyFormFields(packet, task) {
  const schema = packet.answer_schema || task.answer_schema || {};
  const required = schema.required_fields || (packet.requested_fact ? [packet.requested_fact] : ["human_notes"]);
  const allowed = schema.allowed_values || {};
  const suggested = humanPacketPricing(packet).suggested_price_bob;
  return required.map((field) => {
    if (field === "human_notes") {
      return `<label class="notify-field"><span>Notas de la decisión</span><textarea id="nf-human_notes" class="notify-notes" placeholder="Justificación y referencia de la decisión"></textarea></label>`;
    }
    const opts = allowed[field];
    if (Array.isArray(opts) && opts.length) {
      return `<label class="notify-field"><span>${esc(humanFieldLabel(field))}</span><select id="nf-${esc(field)}" data-ft="string"><option value="">Elegir…</option>${opts.map((o) => `<option value="${esc(o)}">${esc(titleCase(o))}</option>`).join("")}</select></label>`;
    }
    const isPrice = /price|bob|prima|monto/.test(field);
    const prefill = isPrice && suggested != null ? ` value="${esc(suggested)}"` : "";
    return `<label class="notify-field"><span>${esc(humanFieldLabel(field))}</span><input id="nf-${esc(field)}" class="num-input" type="${isPrice ? "number" : "text"}" data-ft="${isPrice ? "number" : "string"}"${prefill}/></label>`;
  }).join("");
}
const HUMAN_FIELD_LABELS = {
  pricing_decision: "Decisión de pricing",
  approved_price_bob: "Precio aprobado (Bs)",
  human_notes: "Notas de la decisión",
};
function humanFieldLabel(field) {
  return HUMAN_FIELD_LABELS[field] || titleCase(field);
}
function bindHumanNotification(packet) {
  const root = $(".human-notify");
  if (!root) return;
  const role = packet.engine === "uw" ? "uw_user" : "claims_user";
  let task = null;
  const sendBtn = $("#notify-send-btn");
  if (sendBtn) sendBtn.addEventListener("click", async () => {
    sendBtn.classList.add("loading"); sendBtn.disabled = true;
    try {
      task = await postJSON("/api/human-tasks", { packet, source_channel: "runner", initial_slip: "Corrida de decisión — revisión humana" }, "chat_agent");
      renderNotifyForm(packet, task);
    } catch {
      toast("No se pudo crear la tarea humana", true);
      sendBtn.classList.remove("loading"); sendBtn.disabled = false;
    }
  });

  function renderNotifyForm(packet, task) {
    const stage = $("#notify-stage");
    if (!stage) return;
    stage.innerHTML = `
      <div class="notify-created"><span class="notify-dot"></span>Tarea <span class="mono">${esc(task.task_id)}</span> en bandeja de <b>${esc(humanOwnerLabel(packet, task))}</b> · estado: necesita input</div>
      <div class="notify-form">${humanNotifyFormFields(packet, task)}</div>
      <div class="human-actions"><button class="btn btn-primary" id="notify-complete-btn">Resolver y continuar el paquete →</button></div>`;
    const completeBtn = $("#notify-complete-btn");
    completeBtn.addEventListener("click", async () => {
      const schema = packet.answer_schema || task.answer_schema || {};
      const required = schema.required_fields || (packet.requested_fact ? [packet.requested_fact] : ["human_notes"]);
      const answer = {};
      let humanNotes = "";
      for (const field of required) {
        const el = $(`#nf-${field}`);
        const val = parseAnswerValue(el);
        if (field === "human_notes") { humanNotes = el ? el.value : ""; continue; }
        if (!hasValor(val)) { toast(`Completa "${humanFieldLabel(field)}"`, true); return; }
        answer[field] = val;
      }
      completeBtn.classList.add("loading"); completeBtn.disabled = true;
      try {
        const res = await postJSON(`/api/human-tasks/${encodeURIComponent(task.task_id)}/complete`, { answer, human_notes: humanNotes, status: "completed" }, role);
        renderNotifyResolved(packet, res.task || {}, answer);
      } catch {
        toast("No se pudo completar la tarea", true);
        completeBtn.classList.remove("loading"); completeBtn.disabled = false;
      }
    });
  }

  function renderNotifyResolved(packet, doneTask, answer) {
    const stage = $("#notify-stage");
    if (!stage) return;
    const decision = answer.pricing_decision;
    const price = answer.approved_price_bob;
    const approved = decision !== "rejected";
    if (approved && price != null) setHumanApprovedPriceKpi(price);
    stage.innerHTML = `<div class="notify-resolved ${approved ? "ok" : "bad"}">
      <div class="notify-resolved-head"><span class="notify-check">${approved ? "✓" : "✕"}</span>
        <b>${approved ? "Paquete reanudado por el suscriptor" : "Paquete rechazado por el suscriptor"}</b></div>
      <p>Tarea <span class="mono">${esc(doneTask.task_id || "")}</span> resuelta por <b>${esc(titleCase(doneTask.completed_by_role || "suscriptor"))}</b>${decision ? ` · decisión: <b>${esc(titleCase(decision))}</b>` : ""}.</p>
      ${approved && price != null ? `<p class="notify-price">Precio final aprobado: <b>Bs ${esc(money(price))}</b>. El paquete continúa su curso.</p>` : `<p>El paquete no continúa; queda registrado para gobernanza.</p>`}
    </div>`;
    toast(approved ? "Paquete reanudado" : "Paquete rechazado");
  }
}
function setHumanApprovedPriceKpi(value) {
  const el = $("#kpi-price");
  if (!el) return;
  el.textContent = `Bs ${money(value)}`;
  const sub = $("#kpi-price-sub");
  if (sub) sub.textContent = "aprobado por humano";
  const card = $("#kpi-price-card");
  if (card) card.className = "kpi is-ok";
}
function caveatRow(c) {
  const text = typeof c === "string" ? c : (c.message || c.summary || JSON.stringify(c));
  const registro = c && typeof c === "object" ? c.ledger_ref : null;
  const target = c && typeof c === "object" ? (c.node || c.at_node || registro || "run-caveat") : "run-caveat";
  return `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(text)}</span>
    <span class="issue-actions">${registro ? ledgerLink(registro) : ""}<button class="flag-change" data-kind="caveat" data-target="${esc(target)}" data-title="${esc(target)}" data-summary="${esc(text)}" data-engine="${esc(state.runner.engine)}">Preparar cambio</button></span></div>`;
}
function stepRow(step, isFinal) {
  const result = String(step.result || "").toLowerCase();
  const rcls = isFinal ? "r-final" : (["pass", "advance", "branch", "fail", "stop"].includes(result) ? `r-${result}` : "r-advance");
  const facts = step.facts_used && typeof step.facts_used === "object" ? Object.entries(step.facts_used).map(([k, v]) => `<span class="fact-chip">${esc(k)}=<b>${esc(fmt(v))}</b></span>`).join("") : "";
  const src = step.source_quote ? `<span class="step-src">${esc(truncate(step.source_quote, 240))}</span>` : "";
  return `<div class="step ${rcls}"><span class="step-dot"></span><div class="step-card">
    <div class="step-top"><span class="step-type">${esc(step.type || "nodo")}</span><span class="step-title">${esc(step.title || step.node || "")}</span><span class="step-result">${esc(step.chosen || step.result || "")}</span></div>
    ${step.detail ? `<p class="step-detail">${esc(step.detail)}</p>` : ""}${facts ? `<div class="step-facts">${facts}</div>` : ""}${src}</div></div>`;
}
function engineOutcomeKpi(data, isEsc, meta) {
  if (state.runner.engine === "coverage") {
    const outcome = String(data.outcome || "").toLowerCase();
    if (isEsc || outcome === "missing_fact") return { value: "Falta dato", sub: "no se puede cerrar aún" };
    if (["likely_covered", "covered"].includes(outcome)) return { value: "Cubierto", sub: "según la orientación citada" };
    if (["not_covered", "excluded"].includes(outcome)) return { value: "No cubierto", sub: outcome === "excluded" ? "exclusión aplicable" : "fuera de cobertura" };
    if (outcome.includes("conflict") || outcome.includes("escalate") || outcome.includes("review")) return { value: "Revisar", sub: "requiere criterio humano" };
    return { value: meta.tag, sub: "orientación, no determinación" };
  }
  return {
    value: meta.tag,
    sub: isEsc ? "necesita un dato" : (data.process ? `${data.process} proceso` : "terminal")
  };
}
function setKpi(value, sub, cls) { const el = $("#kpi-outcome"); if (!el) return; el.textContent = value; $("#kpi-outcome-sub").textContent = sub; el.closest(".kpi").className = "kpi" + (cls ? " " + cls : ""); }
function setRunFourthKpi(data) {
  if (state.runner.engine === "coverage") return setCoverageCaveatsKpi(data);
  return setRunPriceKpi(data && data.pricing);
}
function setCoverageCaveatsKpi(data) {
  const el = $("#kpi-price");
  if (!el) return;
  const card = $("#kpi-price-card");
  const sub = $("#kpi-price-sub");
  if (!data) {
    el.textContent = "—";
    sub.textContent = "pendiente de ejecución";
    card.className = "kpi";
    return;
  }
  const packet = data.human_packet || {};
  const escalation = data.escalation || {};
  const requestedFact = packet.requested_fact || escalation.blocking_fact;
  if (requestedFact) {
    el.textContent = "Dato";
    sub.textContent = truncate(`falta ${titleCase(requestedFact)}`, 34);
    card.className = "kpi is-warn";
    return;
  }
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  el.textContent = String(caveats.length);
  sub.textContent = caveats.length ? `${caveats.length === 1 ? "salvedad" : "salvedades"} en dictamen` : "sin salvedades";
  card.className = "kpi" + (caveats.length ? " is-warn" : " is-ok");
}
function setRunPriceKpi(pricing) {
  const el = $("#kpi-price");
  if (!el) return;
  const card = $("#kpi-price-card");
  if (!pricing) {
    el.textContent = "—";
    $("#kpi-price-sub").textContent = "tras aprobación";
    card.className = "kpi";
    return;
  }
  if (pricing.approved) {
    el.textContent = `Bs. ${money(pricing.final_price_bob)}`;
    $("#kpi-price-sub").textContent = "aprobado";
    card.className = "kpi is-ok";
  } else if (pricing.suggested_price_bob) {
    el.textContent = `Bs. ${money(pricing.suggested_price_bob)}`;
    $("#kpi-price-sub").textContent = titleCase(pricing.status);
    card.className = "kpi is-warn";
  } else {
    el.textContent = "—";
    $("#kpi-price-sub").textContent = pricing.status ? titleCase(pricing.status) : "sin precio";
    card.className = "kpi is-warn";
  }
}

function renderFactSuggestions(data, hostSel) {
  const host = $(hostSel);
  if (!host) return;
  if (!data) { host.innerHTML = ""; return; }
  const facts = data && (data.facts || data.extracted || data);
  const entries = facts && typeof facts === "object" && !Array.isArray(facts) ? Object.entries(facts) : [];
  const media = data.attachments || {};
  const mediaRows = (media.items || []).map((item) => `<div class="nl-row media-row">
    <span class="nl-key">${esc(item.kind)} · ${esc(item.name || "adjunto")}</span>
    <span class="nl-val">${esc(item.status_label || titleCase(item.status))}</span>
  </div>`).join("");
  if (!entries.length && !mediaRows) { host.innerHTML = `<p class="nl-empty">No se sugirieron hechos. Es solo orientativo; confirma manualmente.</p>`; return; }
  const applyTodos = entries.length ? `<div class="chat-bulk"><button class="nl-apply apply-all" data-host="${esc(hostSel)}">Aplicar todas las sugerencias</button><span>Revisar antes de ejecutar.</span></div>` : "";
  host.innerHTML = `${applyTodos}${entries.map(([k, v]) => {
    const val = v && typeof v === "object" && "value" in v ? v.value : v;
    const conf = v && typeof v === "object" && "confidence" in v ? ` · ${Math.round(Number(v.confidence || 0) * 100)}%` : "";
    return `<div class="nl-row"><span class="nl-key">${esc(k)}${esc(conf)}</span><span class="nl-val">${esc(fmt(val))}</span><button class="nl-apply" data-ak="${esc(k)}" data-av='${esc(JSON.stringify(val))}'>Aplicar →</button></div>`;
  }).join("")}${mediaRows}`;
  $$(`${hostSel} .nl-apply[data-ak]`).forEach((b) => b.addEventListener("click", () => {
    try {
      const v = JSON.parse(b.dataset.av);
      applySuggestedFact(b.dataset.ak, v);
    } catch { toast("No se pudo aplicar", true); }
  }));
  const all = $(`${hostSel} .apply-all`);
  if (all) all.addEventListener("click", () => {
    entries.forEach(([k, v]) => applySuggestedFact(k, v && typeof v === "object" && "value" in v ? v.value : v, false));
    renderForm(); syncJson(); renderChat(); renderDemo();
    toast("Sugerencias aplicadas para revisión");
  });
}

function applySuggestedFact(key, value, rerender = true) {
  if (hasValor(value)) state.runner.values[state.runner.engine][key] = value;
  else delete state.runner.values[state.runner.engine][key];
  if (rerender) {
    renderForm(); syncJson(); renderChat(); renderDemo();
    toast(`Aplicado ${key}`);
  }
}
/* =====================================================================
   VIEW: SIMPLE_CHAT LOCAL CHAT
   ===================================================================== */
VIEWS.simple_chat = async function (params) {
  await loadChatLocalSessions();
  const local = state.simple_chat.local;
  if (params.session) {
    try { local.session = await getJSON(`/api/chat/${encodeURIComponent(params.session)}`); }
    catch { toast("No se encontró la conversación local", true); }
  }
  const session = local.session;

  setTopbar(
    "Chat",
    "Chat local con memoria del caso y paquete vivo.",
    `${engineSegment("simple_chat-engine-seg", local.engine)}
     <button class="btn btn-ghost" id="simple_chat-new-chat-btn">Nueva conversación</button>`
  );

  $("#view").innerHTML = `
    <div class="simple_chat-workspace">
      <aside class="simple_chat-packet-rail">
        ${simple_chatLivePacket(session)}
      </aside>
      <section class="chat-col">
        <p class="simple_chat-explainer">El chat arma memoria del caso, actualiza el paquete y llama a RiskIQ cuando tiene datos suficientes. RiskIQ es quien decide.</p>
        ${simple_chatStatusBanner(session)}
        <div class="chat-thread" id="simple_chat-local-log">
          ${simple_chatLocalMessages(session)}
        </div>
        <div class="composer-area">
          <div class="composer">
            <textarea id="simple_chat-local-input" class="composer-input" rows="1" spellcheck="true" placeholder="Escribe como cliente o broker…">${esc(local.text || "")}</textarea>
            <button class="composer-send" id="simple_chat-send-local-btn" title="Enviar" aria-label="Enviar">↑</button>
          </div>
          <div class="chat-loaded-note simple_chat-loaded-note hidden" id="simple_chat-loaded-note"></div>
          <div class="composer-bar">
            <label class="composer-engine"><span>Tipo de caso</span>${simple_chatEngineSelect(local.engine)}</label>
            <div class="composer-bar-right">
              <button class="btn btn-ghost composer-confirm" id="simple_chat-sample-btn">Cargar demo</button>
              <span class="composer-hint">Enter envía · Shift+Enter salto</span>
            </div>
          </div>
        </div>
        <details class="simple_chat-more">
          <summary><span class="simple_chat-more-ico" aria-hidden="true">⌄</span> Ver memoria y conversaciones</summary>
          <div class="simple_chat-more-body">
            <section class="card">
              <div class="card-head"><h2>Memoria del caso</h2><span class="badge ${session ? simple_chatStatusClass(session.status) : "badge-ok"}">${esc(session ? titleCase(session.status) : "nuevo")}</span></div>
              <div class="card-body simple_chat-insight">${simple_chatLocalInsight(session)}</div>
            </section>
          </div>
        </details>
      </section>
    </div>`;

  $("#simple_chat-new-chat-btn").addEventListener("click", newChatLocalChat);
  $("#simple_chat-sample-btn").addEventListener("click", loadChatLocalSample);
  $("#simple_chat-send-local-btn").addEventListener("click", () => sendChatLocalChat(false));
  $$("#simple_chat-engine-seg .seg-btn").forEach((b) => b.addEventListener("click", () => setChatLocalEngine(b.dataset.engine)));
  $$("#view .sb-chip").forEach((b) => b.addEventListener("click", () => {
    const reply = b.dataset.reply || "";
    state.simple_chat.local.text = reply;
    const ta = $("#simple_chat-local-input"); if (ta) ta.value = reply;
    sendChatLocalChat(false);
  }));
  const localInput = $("#simple_chat-local-input");
  const autoGrowComposer = () => { localInput.style.height = "auto"; localInput.style.height = Math.min(localInput.scrollHeight, 200) + "px"; };
  localInput.addEventListener("input", (e) => { state.simple_chat.local.text = e.target.value; autoGrowComposer(); });
  localInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatLocalChat(false); }
  });
  autoGrowComposer();
  $("#simple_chat-engine-select").addEventListener("change", (e) => setChatLocalEngine(e.target.value));
  $$("#view .local-session").forEach((b) => b.addEventListener("click", async () => {
    try {
      state.simple_chat.local.session = await getJSON(`/api/chat/${encodeURIComponent(b.dataset.session)}`);
      state.simple_chat.local.engine = state.simple_chat.local.session.engine || "uw";
      state.simple_chat.local.text = "";
      VIEWS.simple_chat({});
    } catch { toast("No se pudo abrir la conversación", true); }
  }));
  const log = $("#simple_chat-local-log");
  if (log) log.scrollTop = log.scrollHeight;
};

function simple_chatStatusClass(status) {
  const s = String(status || "");
  if (s.includes("ready") || s.includes("mock") || s.includes("bridge")) return "badge-ok";
  if (s.includes("ran") || s.includes("open")) return "badge-ok";
  if (s.includes("needs") || s.includes("human")) return "badge-amber";
  if (s.includes("partial") || s.includes("queue")) return "badge-amber";
  return "";
}

async function loadChatLocalSessions() {
  try { state.simple_chat.local.sessions = await getJSON("/api/chat"); }
  catch { state.simple_chat.local.sessions = []; }
}

function simple_chatEngineSelect(current) {
  return `<select id="simple_chat-engine-select">${registeredMotors().map((engine) =>
    `<option value="${esc(engine.id)}" ${current === engine.id ? "selected" : ""}>${esc(engineLabel(engine.id))}</option>`
  ).join("")}</select>`;
}

function chatDemoText(engine) {
  const key = engine === "claims" ? "coverage" : engine;
  return DEMO_TEXT[key] || DEMO_TEXT.uw;
}

function setChatLocalEngine(engine) {
  const local = state.simple_chat.local;
  if (!engine || local.engine === engine) return;
  local.engine = engine;
  local.session = null;
  VIEWS.simple_chat({});
  toast(`Tipo de caso: ${engineLabel(engine)}`);
}

function humanizeChatText(text) {
  let t = String(text || "");
  const map = [
    [/El [áa]rbol se detuvo y cre[ée] la tarea \S+ para [\w_]+\.?/gi, "Pasé el caso a una persona del equipo para que lo revise."],
    [/El [áa]rbol se detuvo/gi, "El caso se detuvo"],
    [/antes de ejecutar el [áa]rbol/gi, "para continuar"],
    [/ejecutar el [áa]rbol/gi, "evaluar el caso"],
    [/ejecutar el motor/gi, "evaluar el caso"],
    [/\bel [áa]rbol\b/gi, "el caso"],
    [/Extraje estos datos sugeridos:?/gi, "Anoté estos datos:"],
    [/Hechos sugeridos confirmados para ejecutar el motor\.?/gi, "Datos confirmados. RiskIQ está evaluando el caso."],
    [/Tarea humana creada:.*$/gim, "Pasé el caso a una persona del equipo."],
    [/datos sugeridos/gi, "datos"],
    [/hechos sugeridos/gi, "datos"],
    [/No pude extraer datos suficientes todav[íi]a\.?/gi, "Todavía no tengo datos suficientes."],
    [/\bHUM-[A-Z0-9]+\b/g, ""],
    [/\bhechos\b/gi, "datos"],
  ];
  for (const [re, rep] of map) t = t.replace(re, rep);
  return t.replace(/[ \t]{2,}/g, " ").trim();
}

function simple_chatBanner(tone, title, sub, extra) {
  const dot = { info: "●", warn: "▲", ok: "✓" }[tone] || "●";
  return `<div class="status-banner sb-${tone}">
    <span class="sb-dot">${dot}</span>
    <div class="sb-main">
      <div class="sb-title">${esc(title)}</div>
      <div class="sb-sub">${esc(sub)}</div>
      ${extra || ""}
    </div>
  </div>`;
}

function simple_chatQuickReplies(question) {
  const q = String(question || "").toLowerCase();
  const openEnded = /(cu[áa]l|qu[ée]|cu[áa]nt|c[óo]mo|d[óo]nde|cu[áa]ndo|n[úu]mero|monto|valor|placa|modelo|marca|a[ñn]o|nombre|direcci)/.test(q);
  if (openEnded) return "";
  return `<div class="sb-quick">
    <button class="sb-chip" data-reply="Sí">Sí</button>
    <button class="sb-chip" data-reply="No">No</button>
  </div>`;
}

const SIMPLE_CHAT_FACT_LABELS = {
  product: "Producto",
  channel: "Canal",
  client_type: "Cliente",
  requests_standard_deviation: "Desviaciones",
  is_mass_grouping: "Agrupación masiva",
  is_public_tender: "Licitación",
  vehicle_class: "Vehículo",
  segment: "Segmento",
  cilindrada_cc: "Cilindrada",
  valor_asegurado: "Valor asegurado",
  city: "Plaza",
  model_year: "Año modelo",
  make: "Marca",
  model: "Modelo",
  siniestralidad_historica: "Siniestralidad",
  has_plates: "Placas",
  is_rental: "Alquiler",
  has_body_modifications: "Modificaciones",
  circula_fuera_pais_actividad_regular: "Circula fuera del país",
  coverage_section: "Cobertura",
  coverage_included: "Cobertura incluida",
  event_type: "Evento",
  police_report_within_6h: "Denuncia",
  alcohol_test_within_6h: "Dosaje",
  insurer_notice_days: "Aviso"
};

function simple_chatFactLabel(key) {
  return SIMPLE_CHAT_FACT_LABELS[key] || titleCase(key);
}

function simple_chatLivePacket(session) {
  const facts = (session && session.confirmed_facts) || {};
  const pending = (session && session.pending_facts) || {};
  const factEntries = Object.entries(facts).filter(([, value]) => hasValor(value));
  const pendingEntries = Object.entries(pending).filter(([, value]) => hasValor(value));
  const summary = (session && session.last_result_summary) || {};
  const followup = session && session.client_followup;
  const task = session && session.human_task;
  const title = session ? (session.title || "Paquete del caso") : "Paquete del caso";
  const stateLabel = session ? titleCase(session.status || "open") : "nuevo";
  const rows = factEntries.slice(0, 14).map(([key, value]) => `<li><span>${esc(simple_chatFactLabel(key))}</span><b>${esc(fmt(value))}</b></li>`).join("");
  const pendingRows = pendingEntries.slice(0, 8).map(([key, value]) => `<li class="pending"><span>${esc(simple_chatFactLabel(key))}</span><b>${esc(fmt(value))}</b></li>`).join("");
  const next = followup
    ? (followup.client_question || followup.question || "Falta un dato del cliente.")
    : task
      ? `Revisión de ${titleCase(task.owner_role || "equipo")}: ${task.question || "paquete humano"}`
      : summary.outcome
        ? `RiskIQ: ${titleCase(summary.outcome)}${summary.pricing_status ? ` · ${titleCase(summary.pricing_status)}` : ""}`
        : session
          ? "Chat sigue escuchando y completando el paquete."
          : "Escribe el primer mensaje para armarlo.";
  return `<div class="packet-shell">
    <div class="packet-kicker">Paquete vivo</div>
    <h2>${esc(title)}</h2>
    <div class="packet-state">
      <span>${esc(stateLabel)}</span>
      <b>${factEntries.length} datos</b>
    </div>
    <div class="packet-section">
      <h3>Datos</h3>
      ${rows || pendingRows ? `<ul class="packet-list">${rows}${pendingRows}</ul>` : `<p class="packet-empty">Aún no hay datos del caso.</p>`}
    </div>
    <div class="packet-section">
      <h3>Siguiente</h3>
      <p class="packet-next">${esc(humanizeChatText(next))}</p>
    </div>
    ${summary.audit_steps ? `<div class="packet-section"><h3>Ruta</h3><p class="packet-next">${esc(summary.audit_steps)} pasos recorridos${summary.requested_fact ? ` · falta ${esc(simple_chatFactLabel(summary.requested_fact))}` : ""}</p></div>` : ""}
  </div>`;
}

function simple_chatStatusBanner(session) {
  if (!session || !Array.isArray(session.messages) || !session.messages.length) {
    return simple_chatBanner("info", "Empieza una conversación", "Escribe el primer mensaje como si fueras el cliente. Chat irá armando el paquete a la izquierda.");
  }
  const pendingCount = Object.keys(session.pending_facts || {}).length;
  const summary = session.last_result_summary || {};
  const followup = session.client_followup;
  const task = session.human_task;

  if (pendingCount) {
    return simple_chatBanner("info", "Chat tiene datos del caso", "El paquete ya está visible a la izquierda. Sigue con el siguiente dato y Chat lo incorpora.");
  }
  if (followup) {
    const q = humanizeChatText(followup.client_question || followup.question || "Chat necesita un dato más del cliente.");
    return simple_chatBanner("info", "Chat está esperando una respuesta", q, simple_chatQuickReplies(q));
  }
  if (task) {
    return simple_chatBanner("warn", "El caso pasó a una persona del equipo", "Alguien del equipo va a revisar este caso. No necesitas hacer nada más por ahora.");
  }
  if (summary.outcome) {
    const needsReview = /escal|declin|rechaz|human|revis|pend/i.test(String(summary.outcome));
    if (needsReview) {
      return simple_chatBanner("warn", "El caso necesita una revisión", "RiskIQ marcó que este caso requiere una mirada adicional antes de continuar.");
    }
    return simple_chatBanner("ok", "RiskIQ terminó de evaluar el caso", "La evaluación está lista. Puedes ver el detalle en “Ver detalles técnicos”.");
  }
  return simple_chatBanner("info", "Conversando con el cliente", "Sigue escribiendo. Chat actualiza el paquete y RiskIQ evalúa cuando corresponde.");
}

function simple_chatLocalMessages(session) {
  const messages = (session && Array.isArray(session.messages)) ? session.messages : [];
  if (!messages.length) return `<div class="chat-empty">
    <div class="chat-empty-mark">◌</div>
    <p class="chat-empty-title">¿En qué te ayudo hoy?</p>
    <p class="chat-empty-sub">Escribe como cliente o broker. Chat entiende la intención, arma el paquete y llama a RiskIQ cuando toca.</p>
  </div>`;
  return messages.map((m) => {
    const sender = String(m.sender || "");
    if (sender === "sistema") return `<div class="msg-sys">${esc(humanizeChatText(m.text))}</div>`;
    const isUser = sender === "cliente" || sender === "broker" || sender === "usuario";
    const who = isUser ? "user" : "bot";
    const label = isUser ? titleCase(sender) : "Chat";
    const avatar = isUser ? esc(label.slice(0, 1)) : "◌";
    const text = isUser ? m.text : humanizeChatText(m.text);
    return `<div class="msg msg-${who}">
      <div class="msg-avatar">${avatar}</div>
      <div class="msg-content">
        <div class="msg-name">${esc(label)}</div>
        <div class="msg-text">${esc(text)}</div>
      </div>
    </div>`;
  }).join("");
}

function simple_chatLocalInsight(session) {
  if (!session) return `<div class="empty"><div class="empty-ico">▣</div><p class="empty-title">Sin conversación activa</p><p class="empty-sub">Puedes empezar desde cero o abrir una conversación local guardada.</p></div>${simple_chatLocalSessionList()}`;
  const pending = session.pending_facts || {};
  const summary = session.last_result_summary || {};
  return `<div class="local-insight-stack">
    <div class="verdict v-info local-verdict">
      <div class="verdict-ico">◌</div>
      <div class="verdict-main">
        <div class="verdict-tag">chat</div>
        <div class="verdict-headline">${esc(session.title || session.session_id)}</div>
        <div class="verdict-reason">${esc(session.guardrail || "El chat mantiene memoria; RiskIQ decide.")}</div>
        <div class="verdict-meta">
          ${chip("estado", titleCase(session.status))}
          ${chip("motor", engineLabel(session.engine))}
          ${summary.outcome ? chip("resultado", titleCase(summary.outcome)) : ""}
          ${summary.requested_fact ? chip("bloqueante", summary.requested_fact) : ""}
        </div>
      </div>
    </div>
    ${Object.keys(pending).length ? simple_chatPendingFacts(pending) : ""}
    ${session.client_followup ? simple_chatClientFollowup(session.client_followup) : ""}
    ${summary.outcome ? simple_chatResultSummary(summary) : ""}
    ${session.human_task ? simple_chatTaskSummary(session.human_task) : ""}
    ${simple_chatLocalSessionList(session.session_id)}
  </div>`;
}

function simple_chatPendingFacts(facts) {
  const rows = Object.entries(facts).map(([k, v]) => `<div class="nl-row"><span class="nl-key">${esc(k)}</span><span class="nl-val">${esc(fmt(v))}</span></div>`).join("");
  return `<div class="local-panel">
    <div class="section-label">Datos pendientes</div>
    <p class="nl-empty">Estos datos vienen de una conversación anterior. Al continuar, Chat los incorpora al paquete.</p>
    <div class="local-facts">${rows}</div>
  </div>`;
}

function simple_chatResultSummary(summary) {
  return `<div class="price-inline ${summary.pricing_status === "approved_final_price" ? "approved" : "review"}">
    <div class="price-inline-head"><span class="badge ${summary.pricing_status === "approved_final_price" ? "badge-ok" : "badge-amber"}">${esc(titleCase(summary.outcome))}</span><b>${esc(summary.terminal_node || summary.requested_fact || "resultado")}</b></div>
    <p>Ruta ejecutada con ${esc(summary.audit_steps || 0)} pasos. ${summary.pricing_status ? `Precio: ${esc(titleCase(summary.pricing_status))}.` : ""}</p>
  </div>`;
}

function simple_chatClientFollowup(packet) {
  return `<div class="price-inline review">
    <div class="price-inline-head"><span class="badge badge-amber">Pregunta al cliente</span><b>${esc(packet.requested_fact || "dato pendiente")}</b></div>
    <p>${esc(packet.client_question || packet.question || "Necesito un dato adicional para continuar.")}</p>
    <div class="step-facts">
      <span class="fact-chip">canal=<b>cliente/broker</b></span>
      <span class="fact-chip">sin tarea humana</span>
      ${packet.resolution_reason ? `<span class="fact-chip">motivo=<b>${esc(packet.resolution_reason)}</b></span>` : ""}
    </div>
  </div>`;
}

function simple_chatPacketSummary(packet) {
  return `<div class="human-packet simple_chat-packet">
    <div class="human-head"><span class="human-badge">${packet.resumable ? "Paquete reanudable" : "Necesita dictamen"}</span><span class="mono">${esc(packet.packet_id || "mock")}</span></div>
    <h3>${esc(packet.question || "Intervención humana requerida")}</h3>
    <p class="human-sub">Motor ${esc(packet.engine)} · ${Object.keys(packet.facts || {}).length} hechos · ${(packet.path || []).length} pasos · solicitado: ${esc(packet.requested_fact || "dictamen")}</p>
    ${packet.context && packet.context.source_quote ? `<blockquote class="quote sm">${esc(packet.context.source_quote)}</blockquote>` : ""}
  </div>`;
}

function simple_chatTaskSummary(task) {
  if (task.task_id && task.owner_role) {
    return `<div class="price-inline review">
      <div class="price-inline-head"><span class="badge badge-amber">${esc(titleCase(task.task_type || "human_task"))}</span><b>${esc(task.question || "Tarea humana")}</b></div>
      <p>Asignada a ${esc(task.owner_role)} con prioridad ${esc(titleCase(task.priority || "normal"))}.</p>
      <div class="step-facts">
        <span class="fact-chip">task_id=<b>${esc(task.task_id)}</b></span>
        ${task.requested_fact ? `<span class="fact-chip">hecho=<b>${esc(task.requested_fact)}</b></span>` : ""}
      </div>
    </div>`;
  }
  return `<div class="price-inline review">
    <div class="price-inline-head"><span class="badge badge-amber">${esc(titleCase(task.kind))}</span><b>${esc(task.title)}</b></div>
    <p>${esc(task.summary)}</p>
    <div class="step-facts">
      <span class="fact-chip">task_id=<b>${esc(task.task_id)}</b></span>
      <span class="fact-chip">outcome=<b>${esc((task.route || {}).outcome)}</b></span>
      <span class="fact-chip">pasos=<b>${esc((task.route || {}).audit_steps)}</b></span>
    </div>
  </div>`;
}

function simple_chatLocalSessionList(activeId) {
  const sessions = state.simple_chat.local.sessions || [];
  if (!sessions.length) return "";
  return `<div class="local-panel">
    <div class="section-label">Conversaciones locales</div>
    <div class="local-sessions">${sessions.slice(0, 8).map((s) => `<button class="local-session ${s.session_id === activeId ? "active" : ""}" data-session="${esc(s.session_id)}">
      <span>${esc(s.title || s.session_id)}</span>
      <b>${esc(titleCase(s.status || "open"))}</b>
    </button>`).join("")}</div>
  </div>`;
}

async function sendChatLocalChat(confirmPending) {
  const local = state.simple_chat.local;
  const text = ($("#simple_chat-local-input") ? $("#simple_chat-local-input").value : local.text || "").trim();
  if (!confirmPending && !text) { toast("Escribe un mensaje primero", true); return; }
  const btn = confirmPending ? $("#simple_chat-confirm-local-btn") : $("#simple_chat-send-local-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const body = {
      session_id: local.session && local.session.session_id,
      engine: local.engine || "uw",
      text: confirmPending ? "" : text,
      action: confirmPending ? "confirm_pending" : "message",
      use_pending_facts: confirmPending,
      facts_confirmed: confirmPending,
      create_human_task: true
    };
    const data = await postJSON("/api/chat", body, "chat_agent");
    if (data.error) throw new Error(data.error);
    local.session = data.session;
    local.engine = data.session.engine || local.engine;
    local.text = "";
    await loadChatLocalSessions();
    VIEWS.simple_chat({});
    toast(confirmPending ? "Hechos confirmados y motor ejecutado" : "Mensaje enviado");
  } catch (err) {
    toast(err.message || "No se pudo enviar al chat local", true);
  } finally {
    const nextBtn = confirmPending ? $("#simple_chat-confirm-local-btn") : $("#simple_chat-send-local-btn");
    if (nextBtn) { nextBtn.classList.remove("loading"); nextBtn.disabled = false; }
  }
}

function newChatLocalChat() {
  state.simple_chat.local.session = null;
  state.simple_chat.local.text = "";
  VIEWS.simple_chat({});
  toast("Nueva conversación local");
}

async function loadChatLocalSample() {
  const local = state.simple_chat.local;
  local.session = null;
  local.text = chatDemoText(local.engine);
  await VIEWS.simple_chat({});
  markExampleTextarea("#simple_chat-local-input", "#simple_chat-loaded-note", `Demo de ${engineLabel(local.engine)} cargado aquí`);
  toast(`Demo de ${engineLabel(local.engine)} cargado en el chat`);
}

/* =====================================================================
   VIEW: LBC AUTO PRICING
   ===================================================================== */
VIEWS.pricing = async function () {
  const schema = await ratingSchema();
  setTopbar(
    "Tarificación LBC Auto",
    "Formula reverse-engineered de la API LBC, aislada fuera del árbol de suscripción.",
    `<span class="badge badge-amber">reverse engineered</span>
     <button class="btn btn-ghost" id="price-sample-btn">Cargar ejemplo</button>
     <button class="btn btn-ghost" id="price-clear-btn">Limpiar</button>
     <button class="btn btn-primary" id="price-run-btn">$ Calcular</button>`
  );

  $("#view").innerHTML = `
    <section class="kpis price-kpis">
      <div class="kpi" id="price-kpi-card"><span class="kpi-label">Prima anual</span><span class="kpi-value" id="price-kpi-total">--</span><span class="kpi-sub" id="price-kpi-sub">Aún sin precio</span></div>
      <div class="kpi"><span class="kpi-label">Tasa técnica</span><span class="kpi-value" id="price-kpi-rate">--</span><span class="kpi-sub">después de factores</span></div>
      <div class="kpi"><span class="kpi-label">Multiplicador</span><span class="kpi-value" id="price-kpi-mult">--</span><span class="kpi-sub">factor combinado</span></div>
      <div class="kpi"><span class="kpi-label">Revisión</span><span class="kpi-value" id="price-kpi-review">--</span><span class="kpi-sub">alertas de precio</span></div>
    </section>
    <div class="board pricing-board">
      <section class="card">
        <div class="card-head"><h2>Datos de tarificación</h2><span class="badge badge-amber">LBC Auto</span></div>
        <div class="card-body">
          <div class="truth-note"><b>Separado del árbol.</b> Esto no toca representation/ ni grafos crawlable; solo calcula precio con la fórmula calibrada.</div>
          <div class="pform price-form" id="price-form"></div>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Estimación de precio</h2><span class="audit-id" id="price-audit-id"></span></div>
        <div class="card-body" id="price-result-body">${emptyPriceResult()}</div>
      </section>
    </div>`;

  renderPriceForm(schema);
  renderPriceResult(state.pricing.result);
  $("#price-run-btn").addEventListener("click", runDemoPricing);
  $("#price-sample-btn").addEventListener("click", async () => {
    state.pricing.values = { ...PRICING_SAMPLE };
    state.pricing.result = null;
    renderPriceForm(await ratingSchema());
    renderPriceResult(null);
    toast("Ejemplo de precio cargado");
  });
  $("#price-clear-btn").addEventListener("click", async () => {
    state.pricing.values = {};
    state.pricing.result = null;
    renderPriceForm(await ratingSchema());
    renderPriceResult(null);
    toast("Datos de precio limpiados");
  });
};

function renderPriceForm(schema) {
  const fields = (schema && schema.fields) || RATING_FALLBACK_SCHEMA.fields;
  $("#price-form").innerHTML = fields.map((field) => priceField(field, state.pricing.values[field.id])).join("");
  $$("#price-form [data-pk]").forEach((el) => el.addEventListener("change", () => onPriceFieldChange(el)));
}

function priceField(field, value) {
  const id = esc(field.id);
  const label = `${esc(field.label || titleCase(field.id))}${field.required ? " *" : ""}`;
  const hint = field.unit ? `<em>${esc(field.unit)}</em>` : "";
  let control;
  if (field.type === "enum" && Array.isArray(field.values)) {
    const current = hasValor(value) ? String(value) : "";
    control = `<select id="price-${id}" data-pk="${id}" data-pt="enum">
      <option value="" ${!current ? "selected" : ""}>Elegir</option>
      ${field.values.map((v) => `<option value="${esc(v)}" ${String(v) === current ? "selected" : ""}>${esc(titleCase(v))}</option>`).join("")}
    </select>`;
  } else if (field.type === "number") {
    const step = field.id === "model_year" ? "1" : "0.01";
    control = `<input id="price-${id}" data-pk="${id}" data-pt="number" type="number" step="${step}" value="${esc(value ?? "")}"/>`;
  } else {
    control = `<input id="price-${id}" data-pk="${id}" data-pt="string" type="text" value="${esc(value ?? "")}"/>`;
  }
  return `<label class="pf"><span>${label} ${hint}</span>${control}</label>`;
}

function onPriceFieldChange(el) {
  const key = el.dataset.pk;
  const value = el.dataset.pt === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
  if (hasValor(value)) state.pricing.values[key] = value;
  else delete state.pricing.values[key];
}

async function runDemoPricing() {
  const btn = $("#price-run-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const data = await postJSON("/api/rating/lbc-auto", { facts: compactFacts(state.pricing.values), facts_confirmed: true }, "uw_user");
    if (data.error || data.detail) {
      toast(data.error || data.detail, true);
      return;
    }
    state.pricing.result = data;
    renderPriceResult(data);
    toast("Precio LBC Auto calculado");
  } catch {
    toast("Falló la tarificación - ¿está levantado el servidor?", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function emptyPriceResult() {
  return `<div class="empty"><div class="empty-ico">$</div><p class="empty-title">Aún no hay precio</p>
    <p class="empty-sub">Ingresa los datos de tarificación LBC Auto y calcula las tres opciones.</p></div>`;
}

function renderPriceResult(data) {
  if (!data) {
    $("#price-result-body").innerHTML = emptyPriceResult();
    $("#price-audit-id").textContent = "";
    setPriceKpis(null);
    return;
  }
  const reviewReasons = Array.isArray(data.review_reasons) ? data.review_reasons : [];
  const caveats = Array.isArray(data.caveats) ? data.caveats : [];
  const reviewBadge = reviewReasons.length
    ? `<span class="badge badge-amber">${reviewReasons.length} alerta de revisión${reviewReasons.length === 1 ? "" : "s"}</span>`
    : `<span class="badge badge-ok">precio LBC calculado</span>`;
  $("#price-result-body").innerHTML = `
    <div class="price-result">
      <div class="price-hero">
        <span class="price-label">Prima anual seleccionada</span>
        <strong>Bs. ${money(data.annual_premium_bob)}</strong>
        <span class="price-sub">${esc(data.selected_option || "option_1")} · referencia mensual Bs. ${money(data.monthly_reference_bob)} · ${pct(data.technical_rate)} tasa técnica</span>
        <div class="price-badges">${reviewBadge}<span class="badge badge-amber">reverse engineered</span></div>
      </div>
      <div class="price-meta-grid">
        ${priceMeta("Vehículo", `${(data.inputs || {}).make || "--"} ${(data.inputs || {}).model || ""}`)}
        ${priceMeta("Marca RUAT", (data.inputs || {}).marca_auto)}
        ${priceMeta("Plaza", (data.inputs || {}).city)}
        ${priceMeta("Valor", `Bs. ${money((data.inputs || {}).valor_asegurado)}`)}
        ${priceMeta("Año", (data.inputs || {}).model_year)}
        ${priceMeta("Cuotas", (data.inputs || {}).cuotas)}
      </div>
      <div class="section-label">Opciones</div>
      ${priceOptionsList(data.options || [])}
      ${reviewReasons.length ? `<div class="section-label">Alertas de revisión</div><div class="price-flags">${reviewReasons.map((r) => `<span class="flag-count text">${esc(titleCase(r))}</span>`).join("")}</div>` : ""}
      <div class="section-label">Desglose de factores</div>
      <div class="price-breakdown">${(data.breakdown || []).map(priceBreakdownRow).join("")}</div>
      <div class="section-label">Salvedades</div>
      <div class="caveats">${caveats.map((c) => `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(c.message || c)}</span></div>`).join("")}</div>
    </div>`;
  $("#price-audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  setPriceKpis(data);
}

function priceMeta(k, v) {
  return `<div class="price-meta"><span>${esc(k)}</span><b>${esc(fmt(v))}</b></div>`;
}

function priceBreakdownRow(row) {
  const right = row.amount_bob !== undefined
    ? `Bs. ${money(row.amount_bob)}`
    : row.base_rate !== undefined
      ? pct(row.base_rate)
      : `x${Number(row.multiplier || 1).toFixed(2)}`;
  return `<div class="price-break-row">
    <span><b>${esc(row.label || row.key)}</b><em>${esc(fmt(row.value))}</em></span>
    <strong>${esc(right)}</strong>
  </div>`;
}

function setPriceKpis(data) {
  const card = $("#price-kpi-card");
  if (!card) return;
  $("#price-kpi-total").textContent = data ? `Bs. ${money(data.annual_premium_bob)}` : "--";
  $("#price-kpi-sub").textContent = data ? data.outcome : "Aún sin precio";
  $("#price-kpi-rate").textContent = data ? pct(data.technical_rate) : "--";
  $("#price-kpi-mult").textContent = data ? `x${Number(data.combined_multiplier || 1).toFixed(2)}` : "--";
  const reviews = data && Array.isArray(data.review_reasons) ? data.review_reasons.length : null;
  $("#price-kpi-review").textContent = data ? String(reviews) : "--";
  card.className = "kpi" + (data ? (reviews ? " is-warn" : " is-ok") : "");
}

function money(v) {
  if (!hasValor(v) || Number.isNaN(Number(v))) return "--";
  return Number(v).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function pct(v) {
  if (!hasValor(v) || Number.isNaN(Number(v))) return "--";
  return `${(Number(v) * 100).toFixed(2)}%`;
}
VIEWS.pricing = function () { go("uw"); };

/* =====================================================================
   VIEW: RENEWAL WORKBENCH
   ===================================================================== */
VIEWS.renewals = async function () {
  await ratingSchema();
  setTopbar(
    "Mesa de renovación",
    "Deltas por cliente/póliza sobre una versión fija del grafo. El árbol base y la fuente permanecen intactos.",
    `<span class="badge badge-amber">modelo delta</span>
     <button class="btn btn-ghost" id="ren-sample-btn">Cargar ejemplo</button>
     <button class="btn btn-primary" id="ren-preview-btn">Previsualizar renovación</button>
     <button class="btn btn-secondary" id="ren-save-btn">Guardar borrador</button>`
  );

  $("#view").innerHTML = `
    <section class="kpis renewal-kpis">
      <div class="kpi" id="ren-price-card"><span class="kpi-label">Prima de renovación</span><span class="kpi-value" id="ren-kpi-price">--</span><span class="kpi-sub">después del ajuste</span></div>
      <div class="kpi"><span class="kpi-label">Almacenamiento delta</span><span class="kpi-value" id="ren-kpi-delta">--</span><span class="kpi-sub">por cliente/póliza</span></div>
      <div class="kpi"><span class="kpi-label">Árbol completo</span><span class="kpi-value" id="ren-kpi-tree">--</span><span class="kpi-sub">no duplicado</span></div>
      <div class="kpi"><span class="kpi-label">Deltas de nodo</span><span class="kpi-value" id="ren-kpi-nodes">--</span><span class="kpi-sub">cambios acotados</span></div>
    </section>
    <div class="board renewal-board">
      <section class="card">
        <div class="card-head"><h2>Paquete de renovación</h2><span class="badge badge-amber">fuente sin cambios</span></div>
        <div class="card-body">
          <div class="truth-note"><b>Solo delta.</b> Guardamos la versión del grafo usada y los objetivos cambiados, no un árbol clonado.</div>
          <div class="pform" id="ren-form">
            <label class="pf"><span>ID de cliente</span><input data-rk="client_id" type="text"/></label>
            <label class="pf"><span>ID de póliza</span><input data-rk="policy_id" type="text"/></label>
            <label class="pf"><span>Fecha de renovación</span><input data-rk="renewal_date" type="date"/></label>
            <label class="pf"><span>Ajuste de precio <em>%</em></span><input data-rk="price_adjustment_percent" type="number" step="0.01"/></label>
            <label class="pf full"><span>Motivo del ajuste</span><textarea data-rk="price_adjustment_reason" rows="2"></textarea></label>
          </div>
          <div class="section-label inline">Hechos de tarificación</div>
          <div class="pform ren-rating-form" id="ren-rating-form"></div>
          <label class="pf full ren-json"><span>Deltas de nodo/artefacto acotados al cliente <em>JSON</em></span><textarea id="ren-overrides" rows="9" spellcheck="false"></textarea></label>
        </div>
      </section>
      <section class="card result-card">
        <div class="card-head"><h2>Previsualización de renovación</h2><span class="audit-id" id="ren-audit-id"></span></div>
        <div class="card-body" id="ren-result-body">${emptyRenewalResult()}</div>
      </section>
    </div>
    <div class="board lower renewal-lower">
      <section class="card">
        <div class="card-head"><h2>Borradores de renovación guardados</h2><span class="badge" id="ren-saved-count">--</span></div>
        <div class="card-body" id="ren-saved-body"><p class="nl-empty">Cargando borradores...</p></div>
      </section>
      <section class="card">
        <div class="card-head"><h2>Modelo de almacenamiento</h2><span class="badge badge-ok">reutilizable</span></div>
        <div class="card-body">
          <div class="ins-row"><span class="ins-k">base</span><span class="ins-v">una versión inmutable del grafo por manual/producto/versión</span></div>
          <div class="ins-row"><span class="ins-k">cliente</span><span class="ins-v">solo hechos de renovación, delta de precio y referencias cambiadas</span></div>
          <div class="ins-row"><span class="ins-k">reproducción</span><span class="ins-v">cargar la versión base del grafo y aplicar deltas aprobados acotados a esa póliza</span></div>
        </div>
      </section>
    </div>`;

  renderRenewalForm();
  renderRenewalResult(state.renewal.result);
  renderSavedRenewals().catch(() => { $("#ren-saved-body").innerHTML = `<p class="nl-empty">No se pudieron cargar los borradores de renovación.</p>`; });
  $("#ren-preview-btn").addEventListener("click", () => runRenewal(false));
  $("#ren-save-btn").addEventListener("click", () => runRenewal(true));
  $("#ren-sample-btn").addEventListener("click", () => {
    state.renewal.values = JSON.parse(JSON.stringify(RENEWAL_SAMPLE));
    state.renewal.result = null;
    renderRenewalForm();
    renderRenewalResult(null);
    toast("Ejemplo de renovación cargado");
  });
};

function renderRenewalForm() {
  const v = state.renewal.values;
  $$("#ren-form [data-rk]").forEach((el) => {
    el.value = v[el.dataset.rk] ?? "";
    el.addEventListener("change", () => {
      const value = el.type === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
      if (hasValor(value)) state.renewal.values[el.dataset.rk] = value;
      else delete state.renewal.values[el.dataset.rk];
    });
  });
  const fields = (state.cache.ratingSchema || RATING_FALLBACK_SCHEMA).fields || [];
  $("#ren-rating-form").innerHTML = fields.map((field) => renewalRatingField(field, (v.rating_facts || {})[field.id])).join("");
  $$("#ren-rating-form [data-rrk]").forEach((el) => el.addEventListener("change", () => {
    const value = el.dataset.rrt === "number" ? (el.value === "" ? null : Number(el.value)) : el.value;
    state.renewal.values.rating_facts ||= {};
    if (hasValor(value)) state.renewal.values.rating_facts[el.dataset.rrk] = value;
    else delete state.renewal.values.rating_facts[el.dataset.rrk];
  }));
  $("#ren-overrides").value = JSON.stringify(v.node_overrides || [], null, 2);
  $("#ren-overrides").addEventListener("change", () => {
    try {
      const parsed = JSON.parse($("#ren-overrides").value || "[]");
      if (!Array.isArray(parsed)) throw new Error("Se esperaba una lista");
      state.renewal.values.node_overrides = parsed;
    } catch { toast("El JSON de deltas de nodo no es válido", true); }
  });
}

function renewalRatingField(field, value) {
  const id = esc(field.id);
  const label = `${esc(field.label || titleCase(field.id))}${field.unit ? ` <em>${esc(field.unit)}</em>` : ""}`;
  if (field.type === "enum" && Array.isArray(field.values)) {
    const current = hasValor(value) ? String(value) : "";
    return `<label class="pf"><span>${label}</span><select data-rrk="${id}" data-rrt="enum">
      <option value="" ${!current ? "selected" : ""}>Elegir</option>
      ${field.values.map((opt) => `<option value="${esc(opt)}" ${String(opt) === current ? "selected" : ""}>${esc(titleCase(opt))}</option>`).join("")}
    </select></label>`;
  }
  return `<label class="pf"><span>${label}</span><input data-rrk="${id}" data-rrt="${field.type === "number" ? "number" : "string"}" type="${field.type === "number" ? "number" : "text"}" step="0.01" value="${esc(value ?? "")}"/></label>`;
}

function renewalPayload() {
  const overridesText = $("#ren-overrides") ? $("#ren-overrides").value : "[]";
  let node_overrides;
  try {
    node_overrides = JSON.parse(overridesText || "[]");
    if (!Array.isArray(node_overrides)) throw new Error("Se esperaba una lista");
  } catch {
    toast("El JSON de deltas de nodo no es válido", true);
    return null;
  }
  return {
    ...state.renewal.values,
    node_overrides,
    facts_confirmed: true
  };
}

async function runRenewal(save) {
  const body = renewalPayload();
  if (!body) return;
  const btn = save ? $("#ren-save-btn") : $("#ren-preview-btn");
  btn.classList.add("loading"); btn.disabled = true;
  try {
    const data = await postJSON(save ? "/api/renewals" : "/api/renewals/preview", body, "uw_user");
    if (data.error || data.detail) { toast(data.error || data.detail, true); return; }
    state.renewal.result = data;
    renderRenewalResult(data);
    if (save) await renderSavedRenewals();
    toast(save ? "Borrador de renovación guardado" : "Previsualización de renovación listo");
  } catch {
    toast("Falló la solicitud de renovación", true);
  } finally {
    btn.classList.remove("loading"); btn.disabled = false;
  }
}

function emptyRenewalResult() {
  return `<div class="empty"><div class="empty-ico">↻</div><p class="empty-title">Aún no hay previsualización de renovación</p>
    <p class="empty-sub">La previsualización guarda la versión base del grafo y solo los deltas acotados al cliente.</p></div>`;
}

function renderRenewalResult(data) {
  if (!data) {
    $("#ren-result-body").innerHTML = emptyRenewalResult();
    $("#ren-audit-id").textContent = "";
    setRenewalKpis(null);
    return;
  }
  const pricing = data.pricing || {};
  const storage = data.storage_estimate || {};
  const overrides = data.node_overrides || [];
  $("#ren-result-body").innerHTML = `
    <div class="price-result renewal-result">
      <div class="price-hero">
        <span class="price-label">Prima ajustada de renovación</span>
        <strong>Bs. ${money(pricing.adjusted_annual_premium_bob)}</strong>
        <span class="price-sub">Base Bs. ${money(pricing.base_annual_premium_bob)} · delta Bs. ${money(pricing.delta_bob)} · ajuste ${fmt(pricing.adjustment_percent)}%</span>
        <div class="price-badges"><span class="badge badge-ok">grafo base intacto</span><span class="badge badge-amber">acotado al cliente</span></div>
      </div>
      <div class="price-meta-grid">
        ${priceMeta("Cliente", data.client_id)}
        ${priceMeta("Póliza", data.policy_id)}
        ${priceMeta("Versión del grafo", data.base_graph_version_id)}
        ${priceMeta("Almacenamiento delta", `${storage.delta_kb} KB`)}
        ${priceMeta("Árbol completo", `${storage.base_graph_artifact_kb} KB`)}
        ${priceMeta("Ahorro", `${storage.savings_vs_full_clone_percent}%`)}
      </div>
      <div class="section-label">Deltas de nodo/artefacto acotados</div>
      <div class="renewal-overrides">${overrides.map(renewalOverrideRow).join("") || `<p class="nl-empty">Sin deltas de nodo.</p>`}</div>
      <div class="section-label">Salvedades</div>
      <div class="caveats">${(data.caveats || []).map((c) => `<div class="caveat"><span class="caveat-mark">!</span><span class="caveat-text">${esc(c)}</span></div>`).join("")}</div>
    </div>`;
  $("#ren-audit-id").textContent = data.audit_id ? `audit ${String(data.audit_id).slice(0, 8)}` : "";
  setRenewalKpis(data);
}

function renewalOverrideRow(o) {
  const exists = o.target_exists_in_base_graph === false ? `<span class="badge badge-amber">no encontrado</span>` : `<span class="badge badge-ok">fijado</span>`;
  return `<div class="renewal-override">
    <div class="draft-top"><span class="mono">${esc(o.target_id)}</span>${exists}<span class="draft-status">${esc(titleCase(o.approval_status))}</span></div>
    <p class="draft-title">${esc(titleCase(o.change_type))}${o.base_node_title ? ` · ${esc(o.base_node_title)}` : ""}</p>
    <p class="draft-change">${esc(JSON.stringify(o.patch))}</p>
    ${o.rationale ? `<p class="draft-meta">${esc(o.rationale)}</p>` : ""}
  </div>`;
}

function setRenewalKpis(data) {
  if (!$("#ren-kpi-price")) return;
  const pricing = (data && data.pricing) || {};
  const storage = (data && data.storage_estimate) || {};
  $("#ren-kpi-price").textContent = data ? `Bs. ${money(pricing.adjusted_annual_premium_bob)}` : "--";
  $("#ren-kpi-delta").textContent = data ? `${storage.delta_kb} KB` : "--";
  $("#ren-kpi-tree").textContent = data ? `${storage.base_graph_artifact_kb} KB` : "--";
  $("#ren-kpi-nodes").textContent = data ? String((data.node_overrides || []).length) : "--";
  $("#ren-price-card").className = "kpi" + (data ? " is-ok" : "");
}

async function renderSavedRenewals() {
  const list = await renewalList();
  $("#ren-saved-count").textContent = String(list.length);
  $("#ren-saved-body").innerHTML = list.length ? list.slice(0, 6).map((r) => `
    <div class="draft-row">
      <div class="draft-top"><span class="mono">${esc(r.renewal_id)}</span><span class="draft-status">${esc(titleCase(r.status))}</span></div>
      <p class="draft-title">${esc(r.client_id)} · ${esc(r.policy_id)}</p>
      <p class="draft-meta">${esc(r.base_graph_version_id)} · ${esc((r.node_overrides || []).length)} deltas · ${esc((r.storage_estimate || {}).delta_kb)} KB</p>
    </div>`).join("") : `<p class="nl-empty">Aún no hay borradores de renovación guardados.</p>`;
}

/* =====================================================================
   VIEW: GRAPH REVIEWER
   ===================================================================== */
VIEWS.graph = async function (params) {
  if (params.engine) state.graph.engine = params.engine;
  if (params.mode) state.graph.mode = params.mode;
  if (params.selected) state.graph.selected = params.selected;
  const engine = state.graph.engine, mode = state.graph.mode;
  await defs(engine).catch(() => {});
  setTopbar("Mapa de decisiones", "Árbol de decisión: mapa visual, tabla y detalle de nodos. Cada nodo cita su fuente.",
    `<div class="seg" id="g-mode">
       <button class="seg-btn ${mode === "map" ? "active" : ""}" data-mode="map">◇ Mapa</button>
       <button class="seg-btn ${mode === "sections" ? "active" : ""}" data-mode="sections">Secciones</button>
       <button class="seg-btn ${mode === "table" ? "active" : ""}" data-mode="table">▤ Tabla</button>
       <button class="seg-btn ${mode === "list" ? "active" : ""}" data-mode="list">≡ Lista</button>
     </div>
     ${engineSegment("g-engine", engine)}`);

  $("#view").innerHTML = `
    <div class="gtools">
      <div class="search wide"><span class="search-ico">⌕</span><input id="g-search" type="text" placeholder="Buscar id, título, tipo, hecho…" value="${esc(state.graph.query)}"/></div>
      <span class="badge" id="g-count">…</span>
      <div class="glegend" id="g-legend"></div>
    </div>
    <div class="gcanvas" id="g-canvas"><p class="nl-empty">Cargando grafo…</p></div>
    <section class="g-drawer" id="g-drawer" aria-hidden="true" role="dialog" aria-modal="true"></section>
    <div class="g-drawer-back" id="g-drawer-back"></div>`;

  $$("#g-mode .seg-btn").forEach((b) => b.addEventListener("click", () => go("graph", { mode: b.dataset.mode })));
  $$("#g-engine .seg-btn").forEach((b) => b.addEventListener("click", () => { state.graph.selected = null; go("graph", { engine: b.dataset.engine }); }));
  $("#g-drawer-back").addEventListener("click", closeDrawer);

  let data;
  try { data = await graphData(engine); } catch { $("#g-canvas").innerHTML = `<p class="nl-empty">No se pudo cargar el grafo.</p>`; return; }
  state.graph._ids = new Set(data.node_ids);
  state.graph._data = data;
  $("#g-count").textContent = `${data.nodes.length} nodos · ${data.files.length} archivos · ${data.nodes.filter((n) => nodeFlags(n).length).length} con alertas`;
  renderLegend(data);
  renderGraphMode(data);
  $("#g-search").addEventListener("input", (e) => { state.graph.query = e.target.value; renderGraphMode(data); });
  if (state.graph.selected) selectNode(data, state.graph.selected);
};

const NT_ORDER = ["router", "gate", "condition", "accumulator", "referral", "authority", "terminal"];
function renderLegend(data) {
  const present = [...new Set(data.nodes.map((n) => n.type))].sort((a, b) => NT_ORDER.indexOf(a) - NT_ORDER.indexOf(b));
  const types = present.map((t) => `<span class="lg-item"><span class="lg-dot nt-${esc(t)}"></span>${esc(titleCase(t))}</span>`).join("");
  const edges = state.graph.mode === "map"
    ? `<span class="lg-sep"></span>
       <span class="lg-item"><span class="lg-line l-advance"></span>avanza (siguiente chequeo)</span>
       <span class="lg-item"><span class="lg-line l-branch"></span>rama</span>
       <span class="lg-item"><span class="lg-line l-route"></span>ruta / deriva</span>` : "";
  $("#g-legend").innerHTML = types + edges;
}

function filteredNodes(data) {
  const q = state.graph.query.toLowerCase();
  if (!q) return data.nodes;
  return data.nodes.filter((n) => `${n.id} ${n.title || ""} ${(n.needs_facts || []).join(" ")} ${n.type} ${n.process || ""}`.toLowerCase().includes(q));
}

function renderGraphMode(data) {
  const mode = state.graph.mode;
  if (mode === "sections") return renderSecciones(data);
  if (mode === "table") return renderTable(data);
  if (mode === "list") return renderList(data);
  return renderMap(data);
}

/* ---- MAP: execution-faithful top-down tree.
   Mirrors crawl.py — one INICIO router sits above the process columns; each process
   still runs top-to-bottom by `order` (the fall-through "advance" spine). ---- */
const NW = 184, NH = 60, VG = 26, LANE_GAP = 78, LANE_HEAD = 40, MAP_PAD = 14, ROOT_GAP = 58;

function laneKeyOf(n) { return n.process || n._file.replace(".json", ""); }

function layoutEngine(nodes) {
  const map = {}; nodes.forEach((n) => (map[n.id] = n));
  const lanes = {};
  nodes.forEach((n) => (lanes[laneKeyOf(n)] ||= []).push(n));
  for (const k in lanes) lanes[k].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9));

  // entry node = router if present, else lowest-order node overall
  const entryId = map["root.process_router"] ? "root.process_router"
    : ([...nodes].sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9))[0] || {}).id;
  const entryLane = entryId ? laneKeyOf(map[entryId]) : null;
  const laneEntry = {}; for (const k in lanes) laneEntry[k] = lanes[k][0].id; // refer_process target → lane entry

  const keys = Object.keys(lanes).sort((a, b) =>
    (a === entryLane ? -1 : b === entryLane ? 1 : (lanes[a][0].order ?? 1e9) - (lanes[b][0].order ?? 1e9)));

  const rootOnlyEntry = entryId && entryLane && lanes[entryLane] && lanes[entryLane].length === 1;
  const bodyKeys = rootOnlyEntry ? keys.filter((k) => k !== entryLane) : keys;
  const colCount = Math.max(1, bodyKeys.length || keys.length);
  const width = colCount * NW + (colCount - 1) * LANE_GAP + MAP_PAD * 2;
  const rootY = MAP_PAD;
  const laneHeadY = rootOnlyEntry ? rootY + NH + ROOT_GAP : MAP_PAD + 6;
  const laneStartY = laneHeadY + LANE_HEAD;
  const pos = {};
  let height = rootOnlyEntry ? rootY + NH : 0;
  const laneInfo = [];
  if (rootOnlyEntry) {
    pos[entryId] = { x: Math.round((width - NW) / 2), y: rootY, lane: entryLane, root: true };
  }
  bodyKeys.forEach((k, ci) => {
    const x = MAP_PAD + ci * (NW + LANE_GAP);
    laneInfo.push({ key: k, x, y: laneHeadY, count: lanes[k].length });
    lanes[k].forEach((n, ri) => {
      if (rootOnlyEntry && n.id === entryId) return;
      pos[n.id] = { x, y: laneStartY + ri * (NH + VG), lane: k };
    });
    height = Math.max(height, laneStartY + lanes[k].length * (NH + VG));
  });
  if (!bodyKeys.length && entryId && !pos[entryId]) {
    pos[entryId] = { x: Math.round((width - NW) / 2), y: rootY, lane: entryLane, root: true };
    height = Math.max(height, rootY + NH);
  }

  // edges (engine semantics)
  const edges = [];
  for (const k in lanes) {
    const list = lanes[k];
    for (let i = 0; i < list.length - 1; i++)
      if (list[i].type !== "terminal") edges.push({ from: list[i].id, to: list[i + 1].id, kind: "advance" });
  }
  const ext = {}; // node id -> external target labels
  nodes.forEach((n) => {
    const addExt = (label) => (ext[n.id] ||= []).push(label);
    if (Array.isArray(n.branches)) n.branches.forEach((b) => {
      if (!b.target) return;
      if (map[b.target]) edges.push({ from: n.id, to: b.target, kind: "branch" });
      else if (laneEntry[b.target]) edges.push({ from: n.id, to: laneEntry[b.target], kind: "route" });
      else addExt(b.target);
    });
    if (n.on_no_match) { map[n.on_no_match] ? edges.push({ from: n.id, to: n.on_no_match, kind: "route" }) : addExt(n.on_no_match); }
    const rt = n.referral_target && n.referral_target.name;
    if (rt) { laneEntry[rt] ? edges.push({ from: n.id, to: laneEntry[rt], kind: "route" }) : addExt(rt); }
  });
  return { pos, laneInfo, edges, ext, width: Math.max(width, NW + MAP_PAD * 2), height: height + MAP_PAD, entryId, orientation: "top-down" };
}

function edgePath(a, b) {
  if (b.y >= a.y + NH) {
    const x1 = a.x + NW / 2, y1 = a.y + NH, x2 = b.x + NW / 2, y2 = b.y;
    const mid = Math.max(y1 + 22, Math.round((y1 + y2) / 2));
    return `M${x1},${y1} C${x1},${mid} ${x2},${mid} ${x2},${y2}`;
  }
  const right = b.x > a.x;                       // back/cross edge to a higher target
  const x1 = a.x + (right ? NW : 0), y1 = a.y + NH / 2;
  const x2 = b.x + (right ? 0 : NW), y2 = b.y + NH / 2;
  const dx = Math.max(40, Math.abs(x2 - x1) * 0.4) * (right ? 1 : -1);
  return `M${x1},${y1} C${x1 + dx},${y1} ${x2 - dx},${y2} ${x2},${y2}`;
}

function renderMap(data) {
  const all = data.nodes;
  if (!all.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos.</p>`; return; }
  const lay = layoutEngine(all);
  const layoutSig = `${state.graph.engine}:${lay.orientation}:${lay.width}x${lay.height}`;
  if (state.graph._layoutSig !== layoutSig) {
    state.graph.view = null;
    state.graph._layoutSig = layoutSig;
  }
  state.graph._lay = lay;
  const q = state.graph.query.toLowerCase();
  const matches = (n) => !q || `${n.id} ${n.title || ""} ${(n.needs_facts || []).join(" ")} ${n.type} ${n.process || ""}`.toLowerCase().includes(q);
  const entryLane = laneKeyOf(data.nodes.find((n) => n.id === lay.entryId));

  // lane background bands (every other lane tinted) + headers
  const bands = lay.laneInfo.map((l, i) => {
    const isEntry = l.key === entryLane;
    return `<div class="glane-band${i % 2 ? " alt" : ""}${isEntry ? " entry" : ""}" style="left:${l.x - LANE_GAP / 2}px;top:${Math.max(0, l.y - 6)}px;width:${NW + LANE_GAP}px;height:${lay.height - l.y + 6}px"></div>`;
  }).join("");
  const laneHeads = lay.laneInfo.map((l) => {
    const isEntry = l.key === entryLane;
    return `<div class="glane-head${isEntry ? " entry" : ""}" style="left:${l.x}px;top:${l.y}px;width:${NW}px">
      ${isEntry ? `<span class="glane-tag">INICIO</span>` : ""}
      <span class="glane-name">${esc(l.key)}</span><span class="glane-n">${l.count}</span></div>`;
  }).join("");

  const edges = lay.edges.map((e) => {
    const a = lay.pos[e.from], b = lay.pos[e.to]; if (!a || !b) return "";
    return `<path class="edge edge-${e.kind}" data-from="${esc(e.from)}" data-to="${esc(e.to)}" d="${edgePath(a, b)}" marker-end="url(#g-arr-${e.kind})"></path>`;
  }).join("");

  const boxes = all.map((n) => {
    const p = lay.pos[n.id]; if (!p) return "";
    const sel = state.graph.selected === n.id ? " sel" : "";
    const dim = q && !matches(n) ? " dim" : "";
    const isStart = n.id === lay.entryId;
    const isResultado = n.type === "terminal";
    const ex = lay.ext[n.id] || [];
    return `<button class="gnode nt-${esc(n.type)}${sel}${dim}${isStart ? " is-start" : ""}${isResultado ? " is-outcome" : ""}" data-id="${esc(n.id)}" style="left:${p.x}px;top:${p.y}px;width:${NW}px;height:${NH}px" title="${esc(n.id)}">
      ${isStart ? `<span class="gnode-start">▶ INICIO</span>` : ""}
      ${typeof n.order === "number" ? `<span class="gnode-order">${n.order}</span>` : ""}
      <span class="gnode-type">${esc(titleCase(n.type))}</span>
      <span class="gnode-title">${esc(truncate(n.title || n.id, 48))}</span>
      ${nodeFlags(n).length ? `<span class="gnode-flag" title="${esc(nodeFlags(n).length + " alerta(s)") }">!</span>` : ""}
      ${ex.length ? `<span class="gnode-ext" title="deriva fuera → ${esc(ex.join(", "))}">↗ ${esc(ex.length === 1 ? ex[0] : ex.length + " refs")}</span>` : ""}
    </button>`;
  }).join("");

  const marker = (id, cls) => `<marker id="g-arr-${id}" class="${cls}" markerWidth="9" markerHeight="9" refX="7" refY="3" orient="auto"><path d="M0,0 L7,3 L0,6 Z"></path></marker>`;
  $("#g-canvas").innerHTML = `
    <div class="gviewport" id="gviewport">
      <div class="gzoom">
        <button data-z="out" title="Alejar">−</button>
        <button data-z="in" title="Acercar">+</button>
        <button data-z="fit" title="Ajustar a pantalla">⤢ Ajustar</button>
        <button data-z="reset" title="Tamaño real">1:1</button>
      </div>
      <div class="ghint" id="ghint">Desplaza para acercar · arrastra para mover · haz clic en un nodo para trazar su flujo</div>
      <div class="gstage" id="gstage" style="width:${lay.width}px;height:${lay.height}px">
        <div class="glanes">${bands}</div>
        <svg class="gmap-edges" width="${lay.width}" height="${lay.height}"><defs>
          ${marker("advance", "m-advance")}${marker("branch", "m-branch")}${marker("route", "m-route")}
        </defs>${edges}</svg>
        ${laneHeads}${boxes}
      </div>
    </div>`;
  $$("#gstage .gnode").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
  $$(".gzoom button").forEach((b) => b.addEventListener("click", () => zoomCmd(b.dataset.z, lay)));
  setupPanZoom(lay);
  if (state.graph.selected) highlightConnections(state.graph.selected);
}

/* ---- pan / zoom on the map stage ---- */
const clampK = (k) => Math.max(0.2, Math.min(2.4, k));
function applyView() {
  const st = $("#gstage"); if (!st) return;
  const v = state.graph.view || { k: 1, x: 0, y: 0 };
  st.style.transform = `translate(${v.x}px,${v.y}px) scale(${v.k})`;
}
function fitView(lay) {
  const vp = $("#gviewport"); if (!vp) return;
  const r = vp.getBoundingClientRect();
  const fitW = (r.width - 48) / lay.width;
  const fitH = (r.height - 48) / lay.height;
  const k = clampK(lay.orientation === "top-down" ? Math.min(fitW, 1.05) : Math.min(fitW, fitH, 1.05));
  state.graph.view = { k, x: Math.max(24, (r.width - lay.width * k) / 2), y: 20 };
  applyView();
}
function zoomCmd(cmd, lay) {
  const vp = $("#gviewport"); if (!vp) return;
  const r = vp.getBoundingClientRect();
  const v = state.graph.view || { k: 1, x: 0, y: 0 };
  if (cmd === "fit") return fitView(lay);
  if (cmd === "reset") { state.graph.view = { k: 1, x: 24, y: 20 }; return applyView(); }
  const factor = cmd === "in" ? 1.25 : 0.8;
  const cx = r.width / 2, cy = r.height / 2;
  const nk = clampK(v.k * factor);
  state.graph.view = { k: nk, x: cx - (cx - v.x) * (nk / v.k), y: cy - (cy - v.y) * (nk / v.k) };
  applyView();
}
function setupPanZoom(lay) {
  const vp = $("#gviewport"); if (!vp) return;
  if (!state.graph.view) fitView(lay); else applyView();
  vp.onwheel = (e) => {
    e.preventDefault();
    const r = vp.getBoundingClientRect(), v = state.graph.view;
    const mx = e.clientX - r.left, my = e.clientY - r.top;
    const nk = clampK(v.k * (e.deltaY < 0 ? 1.1 : 0.9));
    state.graph.view = { k: nk, x: mx - (mx - v.x) * (nk / v.k), y: my - (my - v.y) * (nk / v.k) };
    applyView();
  };
  let drag = null;
  vp.onpointerdown = (e) => {
    if (e.target.closest(".gnode") || e.target.closest(".gzoom")) return;
    drag = { sx: e.clientX, sy: e.clientY, ox: state.graph.view.x, oy: state.graph.view.y };
    vp.classList.add("panning"); vp.setPointerCapture(e.pointerId);
  };
  vp.onpointermove = (e) => {
    if (!drag) return;
    state.graph.view = { ...state.graph.view, x: drag.ox + (e.clientX - drag.sx), y: drag.oy + (e.clientY - drag.sy) };
    applyView();
  };
  vp.onpointerup = (e) => { drag = null; vp.classList.remove("panning"); try { vp.releasePointerCapture(e.pointerId); } catch {} };
}

/* ---- highlight a node's flow: light its edges + neighbours, fade the rest ---- */
function highlightConnections(id) {
  const st = $("#gstage"); if (!st) return;
  st.classList.toggle("has-sel", !!id);
  const adj = new Set();
  $$("#gstage .edge").forEach((p) => {
    const hot = id && (p.dataset.from === id || p.dataset.to === id);
    p.classList.toggle("hot", !!hot);
    if (hot) { adj.add(p.dataset.from); adj.add(p.dataset.to); }
  });
  $$("#gstage .gnode").forEach((el) => el.classList.toggle("adj", !!id && adj.has(el.dataset.id) && el.dataset.id !== id));
}

/* ---- TABLE ---- */
function renderTable(data) {
  const nodes = filteredNodes(data);
  if (!nodes.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos que coincidan “${esc(state.graph.query)}”.</p>`; return; }
  const rows = nodes.map((n) => {
    const out = n.branches ? `${n.branches.length} rama${n.branches.length === 1 ? "" : "s"}` : (n.outcome || n.referral_target || (n.evaluate ? "evaluate" : "—"));
    const sel = state.graph.selected === n.id ? " sel" : "";
    return `<tr class="gtr${sel}" data-id="${esc(n.id)}">
      <td><span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span></td>
      <td class="gtd-title">${esc(n.title || n.id)}</td>
      <td class="mono sm">${esc(n.id)}</td>
      <td class="sm">${esc(n.process || "—")}</td>
      <td class="num">${(n.needs_facts || []).length}</td>
      <td class="num">${nodeFlags(n).length ? `<span class="flag-count">${nodeFlags(n).length}</span>` : "—"}</td>
      <td class="sm">${esc(out)}</td>
      <td class="mono sm">${esc(n._file.replace(".json", ""))}</td></tr>`;
  }).join("");
  $("#g-canvas").innerHTML = `<div class="gtable-wrap card"><table class="gtable">
    <thead><tr><th>Tipo</th><th>Título</th><th>ID</th><th>Proceso</th><th>Hechos</th><th>Alertas</th><th>Resultado / flujo</th><th>Archivo</th></tr></thead>
    <tbody>${rows}</tbody></table></div>`;
  $$("#g-canvas .gtr").forEach((r) => r.addEventListener("click", () => selectNode(data, r.dataset.id)));
}

/* ---- LIST (grouped by file) ---- */
function renderList(data) {
  const nodes = filteredNodes(data);
  const byFile = {};
  for (const n of nodes) (byFile[n._file] ||= []).push(n);
  let html = "";
  for (const [file, fileNodes] of Object.entries(byFile)) {
    html += `<p class="node-group">${esc(file.replace(".json", ""))}</p>`;
    for (const n of fileNodes) html += `<button class="node-item ${state.graph.selected === n.id ? "sel" : ""}" data-id="${esc(n.id)}">
      <span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span>
      <span class="node-item-main"><span class="node-item-title">${esc(n.title || n.id)}</span><span class="node-item-id">${esc(n.id)}</span></span>
      ${nodeFlags(n).length ? `<span class="flag-count">${nodeFlags(n).length}</span>` : ""}</button>`;
  }
  $("#g-canvas").innerHTML = `<div class="glist card">${html || `<p class="nl-empty">No hay nodos que coincidan.</p>`}</div>`;
  $$("#g-canvas .node-item").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
}

/* ---- SECTIONS (manual-like hierarchy para review/editing) ---- */
function renderSecciones(data) {
  const nodes = filteredNodes(data);
  if (!nodes.length) { $("#g-canvas").innerHTML = `<p class="nl-empty">No hay nodos que coincidan.</p>`; return; }
  const groups = sectionGroups(nodes);
  $("#g-canvas").innerHTML = `<div class="sections-view">
    ${groups.map((group, idx) => `<details class="section-block" ${idx < 4 ? "open" : ""}>
      <summary><span>${esc(group.title)}</span><b>${group.nodes.length}</b></summary>
      <div class="section-node-list">
        ${group.nodes.map((n) => sectionNodeRow(n)).join("")}
      </div>
    </details>`).join("")}
  </div>`;
  $$("#g-canvas .section-node").forEach((b) => b.addEventListener("click", () => selectNode(data, b.dataset.id)));
  $$("#g-canvas .section-edit").forEach((b) => b.addEventListener("click", (e) => {
    e.stopPropagation();
    selectNode(data, b.dataset.id);
  }));
}

function sectionGroups(nodes) {
  const by = {};
  for (const n of nodes) {
    const key = sectionKey(n);
    (by[key] ||= []).push(n);
  }
  return Object.entries(by)
    .map(([title, groupNodes]) => ({
      title,
      nodes: groupNodes.sort((a, b) => (a.order ?? 1e9) - (b.order ?? 1e9) || String(a.id).localeCompare(String(b.id)))
    }))
    .sort((a, b) => (a.nodes[0].order ?? 1e9) - (b.nodes[0].order ?? 1e9) || a.title.localeCompare(b.title));
}

function sectionKey(n) {
  const src = n.source || {};
  const origin = n._origin || {};
  return src.section || src.clause || origin.path || n.process || n._file.replace(".json", "");
}

function sectionNodeRow(n) {
  const facts = (n.needs_facts || []).slice(0, 5).map((f) => `<span class="fact-chip">${esc(f)}</span>`).join("");
  const branchCount = Array.isArray(n.branches) ? n.branches.length : 0;
  const flagCount = nodeFlags(n).length;
  return `<button class="section-node ${state.graph.selected === n.id ? "sel" : ""}" data-id="${esc(n.id)}">
    <span class="ntype nt-${esc(n.type)}">${esc(titleCase(n.type))}</span>
    <span class="section-node-main">
      <span class="section-node-title">${esc(n.title || n.id)}</span>
      <span class="section-node-id">${esc(n.id)}${n.process ? " · " + esc(n.process) : ""}</span>
      ${n.source_quote ? `<span class="section-node-quote">${esc(truncate(n.source_quote, 180))}</span>` : ""}
      ${facts ? `<span class="section-node-facts">${facts}</span>` : ""}
    </span>
    <span class="section-node-meta">${branchCount ? `${branchCount} ramas` : esc(n.outcome || n.referral_target?.name || "chequeo")}${flagCount ? ` · ${flagCount} alertas` : ""}</span>
    <span class="section-edit" data-id="${esc(n.id)}">Revisar</span>
  </button>`;
}

/* ---- INSPECTOR DRAWER ---- */
function closeDrawer() {
  state.graph.selected = null;
  const d = $("#g-drawer"); if (d) { d.classList.remove("open"); d.setAttribute("aria-hidden", "true"); }
  const b = $("#g-drawer-back"); if (b) b.classList.remove("open");
  $$("#g-canvas .gnode, #g-canvas .gtr, #g-canvas .node-item, #g-canvas .section-node").forEach((el) => el.classList.remove("sel"));
  highlightConnections(null);
}

function selectNode(data, id) {
  state.graph.selected = id;
  $$("#g-canvas .gnode, #g-canvas .gtr, #g-canvas .node-item, #g-canvas .section-node").forEach((el) => el.classList.toggle("sel", el.dataset.id === id));
  const n = data.nodes.find((x) => x.id === id);
  if (!n) return;
  const ids = state.graph._ids;
  const link = (t) => {
    const id = t && typeof t === "object" ? (t.name || t.id || JSON.stringify(t)) : t;
    return ids.has(id) ? `<button class="xlink" data-goto="${esc(id)}">${esc(id)} →</button>` : `<span class="xtarget">${esc(id)}</span>`;
  };

  let branches = "";
  if (Array.isArray(n.branches) && n.branches.length) {
    branches = `<div class="ins-sec"><h4>Ramas · ${n.branches.length}</h4>${n.branches.map((b) => `
      <div class="branch">
        <div class="branch-cond"><code>${esc(humanLogic(b.when || b.evaluate))}</code></div>
        <div class="branch-arrow">→</div>
        <div class="branch-out">
          <span class="branch-outcome">${esc(b.outcome || "")}</span>
          ${b.target ? link(b.target) : ""}
          ${b.reason ? `<p class="branch-reason">${esc(b.reason)}</p>` : ""}
          ${b.source_quote ? `<blockquote class="quote sm">${esc(b.source_quote)}</blockquote>` : ""}
        </div>
      </div>`).join("")}</div>`;
  }
  let evalBlock = "";
  if (n.evaluate && !n.branches) {
    evalBlock = `<div class="ins-sec"><h4>Condición</h4><div class="branch"><div class="branch-cond"><code>${esc(humanLogic(n.evaluate))}</code></div><div class="branch-arrow">→</div>
      <div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div></div>`;
  }
  let outcomeBlock = "";
  if (!n.branches && !n.evaluate && (n.outcome || n.referral_target)) {
    outcomeBlock = `<div class="ins-sec"><h4>Resultado</h4><div class="branch-out"><span class="branch-outcome">${esc(n.outcome || "terminal")}</span>${n.referral_target ? link(n.referral_target) : ""}${n.reason ? `<p class="branch-reason">${esc(n.reason)}</p>` : ""}</div></div>`;
  }
  const facts = (n.needs_facts || []).map((f) => `<span class="fact-chip clickable" data-fact="${esc(f)}" title="${esc(factPrompt(f))}">${esc(f)}</span>`).join("");
  const flags = nodeFlags(n);
  const flagBlock = flags.length ? `<div class="ins-sec"><h4>Alertas · ${flags.length}</h4>${flags.map((f) => `
    <div class="flag-card mini">
      <div class="flag-top"><span class="flag-kind">${esc(titleCase(f.category))}</span><span class="badge ${f.status === "open" ? "badge-amber" : ""}">${esc(titleCase(f.status))}</span></div>
      <p class="flag-summary">${esc(f.summary || f.title)}</p>
      <div class="issue-actions">${f.ledger_ref ? ledgerLink(f.ledger_ref) : ""}<button class="flag-change" data-kind="${esc(f.category)}" data-target="${esc(n.id)}" data-node-id="${esc(n.id)}" data-title="${esc(n.title || n.id)}" data-summary="${esc(f.summary || "")}" data-source="${esc(n.source_quote || "")}" data-engine="${esc(state.graph.engine)}">Preparar cambio</button></div>
    </div>`).join("")}</div>` : "";
  const links = [];
  if (n.on_no_match) links.push(`<div class="ins-row"><span class="ins-k">si no coincide</span>${link(n.on_no_match)}</div>`);
  if (n.referral_target && n.branches) links.push(`<div class="ins-row"><span class="ins-k">derivación</span>${link(n.referral_target)}</div>`);
  if (Array.isArray(n.see_also)) n.see_also.forEach((s) => links.push(`<div class="ins-row"><span class="ins-k">ver también</span>${ledgerLink(s)}</div>`));
  if (n.conflict && ledgerIdFromRef(n.conflict)) links.push(`<div class="ins-row"><span class="ins-k">conflicto</span>${ledgerLink(n.conflict)}</div>`);
  if (n.row_conflict_ref) links.push(`<div class="ins-row"><span class="ins-k">conflicto de fila</span>${ledgerLink(n.row_conflict_ref)}</div>`);

  const drawer = $("#g-drawer");
  drawer.innerHTML = `
    <div class="drawer-bar node-modal-head">
      <div class="node-modal-titleblock">
        <div class="node-modal-kicker"><span class="ntype nt-${esc(n.type)} big">${esc(titleCase(n.type))}</span><span>${esc(n.process || "sin proceso")}</span></div>
        <h3 class="ins-title">${esc(n.title || n.id)}</h3>
        <span class="ins-id">${esc(n.id)} · ${esc(n._file)}${n.order !== undefined ? " · orden " + esc(n.order) : ""}</span>
      </div>
      <button class="drawer-x" id="drawer-x" title="Cerrar">✕</button>
    </div>
    <div class="drawer-body node-modal-body">
      <div class="truth-note compact node-modal-help"><b>Revisa antes de editar.</b> Este popup muestra qué condición evalúa el nodo, qué hechos lee, cómo enruta el caso y qué fuente lo respalda. Para cambiarlo, usa el chat guiado y prepara un borrador; nada se aplica automáticamente.</div>
      <div class="node-modal-grid">
        <div class="node-modal-col">
          ${n.source_quote ? `<div class="ins-sec first"><h4>Fuente citada</h4><blockquote class="quote">${esc(n.source_quote)}</blockquote></div>` : ""}
          <div class="ins-sec first"><h4>Condicion explicada</h4>${conditionDescriptionHtml(n)}</div>
          ${facts ? `<div class="ins-sec"><h4>Hechos que lee · ${(n.needs_facts || []).length}</h4><div class="step-facts">${facts}</div></div>` : ""}
          ${n.note ? `<div class="ins-sec"><h4>Nota</h4><p class="ins-note">${esc(n.note)}</p></div>` : ""}
        </div>
        <div class="node-modal-col">
          ${evalBlock}${branches}${outcomeBlock}${flagBlock}
          ${links.length ? `<div class="ins-sec"><h4>Enlaces</h4>${links.join("")}</div>` : ""}
        </div>
      </div>
    </div>
    <div class="drawer-foot node-modal-foot">
      <div class="node-modal-actions">
        <button class="btn btn-ghost" id="node-close-foot">Cerrar</button>
        <button class="btn btn-primary" id="propose-btn">Editar con chat guiado</button>
      </div>
      <p class="drawer-foot-note">El editor prepara una propuesta gobernada para revisión; no cambia el grafo ni la fuente por sí solo.</p>
    </div>`;
  drawer.classList.add("open"); drawer.setAttribute("aria-hidden", "false");
  $("#g-drawer-back").classList.add("open");
  $("#drawer-x").addEventListener("click", closeDrawer);
  $("#node-close-foot").addEventListener("click", closeDrawer);
  $("#propose-btn").addEventListener("click", () => { closeDrawer(); openProposeModal(n); });
  $$("#g-drawer .xlink").forEach((b) => b.addEventListener("click", () => { selectNode(data, b.dataset.goto); drawer.querySelector(".drawer-body").scrollTop = 0; }));
  bindIncidenciaActions("#g-drawer");
  $$("#g-drawer .fact-chip.clickable").forEach((c) => c.addEventListener("click", () => toast(`${c.dataset.fact}: ${factPrompt(c.dataset.fact) || "sin pregunta"}`)));
  highlightConnections(id);
}

function factPrompt(f) { const d = state.cache.defs[state.graph.engine] || {}; return d[f] ? d[f].prompt : ""; }
function nodeFlags(n) {
  const out = [];
  if (n.conflict) {
    const c = n.conflict;
    out.push({ category: c.kind || "conflict", status: c.status || "open", summary: c.summary || _briefUI(c), ledger_ref: ledgerIdFromRef(c) });
  }
  if (n.row_conflict_ref) out.push({ category: "row_conflict", status: "open", summary: String(n.row_conflict_ref), ledger_ref: n.row_conflict_ref });
  for (const key of ["flag", "flags", "band_boundary_flag", "conflict_flag", "inconsistency_flag"]) {
    if (n[key]) out.push({ category: key, status: "open", summary: _briefUI(n[key]) });
  }
  return out.filter((f) => f.summary || f.ledger_ref);
}
function _briefUI(v) {
  const text = typeof v === "string" ? v : JSON.stringify(v);
  return truncate(text.replace(/\s+/g, " "), 320);
}
function ledgerLink(ref) {
  const id = ledgerIdFromRef(ref);
  return `<button class="ledger-link" data-ledger="${esc(id)}">⌗ ${esc(id)}</button>`;
}
function ledgerIdFromRef(ref) {
  if (!ref) return "";
  const raw = typeof ref === "object" ? (ref.ledger_ref || ref.ref || "") : String(ref);
  return raw.replace(/^rulings\//, "").replace(/\.md$/, "");
}
function bindIncidenciaActions(rootSel) {
  $$(`${rootSel} .ledger-link`).forEach((b) => b.addEventListener("click", () => go("flags", { mode: "conflicts", id: b.dataset.ledger })));
  $$(`${rootSel} .flag-change`).forEach((b) => b.addEventListener("click", () => {
    const engine = b.dataset.engine || state.graph.engine || "uw";
    const linkedNode = cachedGraphNode(engine, b.dataset.nodeId || b.dataset.target);
    openProposeModal({
      ...(linkedNode || {}),
      id: linkedNode?.id || b.dataset.nodeId || b.dataset.target,
      target: b.dataset.target,
      node_id: b.dataset.nodeId || linkedNode?.id || "",
      title: linkedNode?.title || b.dataset.title,
      issue_title: b.dataset.title,
      issue_category: b.dataset.kind,
      issue_summary: b.dataset.summary,
      issue_source: b.dataset.source,
      category: b.dataset.kind,
      engine,
      source_quote: linkedNode?.source_quote || b.dataset.source || b.dataset.summary,
      proposal_title: `Resolver ${b.dataset.kind}: ${b.dataset.title}`,
      proposal_kind: "RUL"
    });
  }));
}

/* JSONLogic → readable */
function humanLogic(l) {
  if (l === null || l === undefined) return "—";
  if (typeof l !== "object") return JSON.stringify(l);
  if (Array.isArray(l)) return "[" + l.map(humanLogic).join(", ") + "]";
  const op = Object.keys(l)[0], a = l[op];
  if (op === "var") return String(a);
  const ops = { "==": "=", "!=": "≠", ">": ">", ">=": "≥", "<": "<", "<=": "≤" };
  if (ops[op] && Array.isArray(a)) return `${humanLogic(a[0])} ${ops[op]} ${humanLogic(a[1])}`;
  if (op === "in" && Array.isArray(a)) return `${humanLogic(a[0])} ∈ {${(Array.isArray(a[1]) ? a[1] : [a[1]]).map(humanLogic).join(", ")}}`;
  if (op === "and") return a.map(humanLogic).join("  AND  ");
  if (op === "or") return a.map(humanLogic).join("  OR  ");
  if (op === "!" || op === "not") return `NOT ${humanLogic(Array.isArray(a) ? a[0] : a)}`;
  return `${op}(${(Array.isArray(a) ? a : [a]).map(humanLogic).join(", ")})`;
}

function targetLabel(v) {
  if (!v) return "";
  if (typeof v === "object") return v.name || v.id || JSON.stringify(v);
  return String(v);
}

function decisionPhrase(obj = {}) {
  const pieces = [];
  if (obj.outcome) pieces.push(`devuelve "${titleCase(obj.outcome)}"`);
  if (obj.target) pieces.push(`continua en ${targetLabel(obj.target)}`);
  if (obj.referral_target) pieces.push(`deriva a ${targetLabel(obj.referral_target)}`);
  if (obj.on_no_match) pieces.push(`si no coincide va a ${targetLabel(obj.on_no_match)}`);
  if (obj.reason) pieces.push(`motivo: ${_briefUI(obj.reason)}`);
  return pieces.join("; ") || "no declara resultado, derivacion o siguiente objetivo explicito";
}

function nodeConditionParts(node = {}) {
  const facts = Array.isArray(node.needs_facts) ? node.needs_facts.filter(Boolean) : [];
  const factText = facts.length
    ? `Lee ${facts.length} dato${facts.length === 1 ? "" : "s"} del caso: ${facts.join(", ")}.`
    : "No declara datos requeridos propios; depende del contexto acumulado o es un nodo terminal.";
  if (Array.isArray(node.branches) && node.branches.length) {
    return {
      overview: `${factText} Luego decide entre ${node.branches.length} rama${node.branches.length === 1 ? "" : "s"} segun la condicion de cada rama.`,
      details: node.branches.map((b, i) => `Rama ${i + 1}: cuando ${humanLogic(b.when || b.evaluate)}, ${decisionPhrase(b)}.`)
    };
  }
  if (node.evaluate) {
    return {
      overview: `${factText} La condicion principal se cumple cuando: ${humanLogic(node.evaluate)}.`,
      details: [`Si se cumple, ${decisionPhrase(node)}.`]
    };
  }
  if (node.outcome || node.referral_target || node.on_no_match) {
    return {
      overview: `${factText} Este nodo no evalua una condicion propia.`,
      details: [`Resultado configurado: ${decisionPhrase(node)}.`]
    };
  }
  return {
    overview: `${factText} No hay condicion ejecutable visible en este objetivo.`,
    details: []
  };
}

function nodeConditionDescription(node = {}) {
  const parts = nodeConditionParts(node);
  return [parts.overview, ...parts.details].join(" ");
}

function conditionDescriptionHtml(node = {}) {
  const parts = nodeConditionParts(node);
  return `<p class="ins-note">${esc(parts.overview)}</p>${parts.details.length ? `<ul class="condition-list">${parts.details.map((d) => `<li>${esc(d)}</li>`).join("")}</ul>` : ""}`;
}

function nodeIssueDescription(node = {}) {
  const flags = node.type ? nodeFlags(node) : [];
  if (node.issue_description) return node.issue_description;
  if (node.issue_summary) {
    return `Problema reportado: ${_briefUI(node.issue_summary)}${node.issue_category ? ` Categoria: ${titleCase(node.issue_category)}.` : ""}`;
  }
  if (node.summary && !node.type) return `Problema reportado: ${_briefUI(node.summary)}`;
  if (flags.length) {
    return `Este nodo tiene ${flags.length} alerta${flags.length === 1 ? "" : "s"} abierta${flags.length === 1 ? "" : "s"}: ${flags.map((f) => `${titleCase(f.category)} - ${_briefUI(f.summary || f.ledger_ref)}`).join("; ")}.`;
  }
  if (node.conflict) return `Tiene un conflicto registrado: ${_briefUI(node.conflict)}.`;
  if (node.row_conflict_ref) return `Tiene conflicto de fila registrado en ${node.row_conflict_ref}.`;
  return `No hay una incidencia especifica adjunta; la propuesta sera una edicion gobernada sobre ${node.title || node.target || node.id || "este objetivo"}.`;
}

function flagIssueDescription(item = {}) {
  const target = item.node_id && item.node_id !== item.target ? `${item.target} (nodo ${item.node_id})` : item.target;
  const pieces = [
    `Esta incidencia marca ${titleCase(item.category || "alerta")} sobre ${target || "un objetivo sin id"}.`,
    item.summary ? `Problema: ${_briefUI(item.summary)}.` : "No trae resumen automatico suficiente; revisa la fuente visible antes de resolver.",
    item.ledger_ref ? `Existe registro vinculado ${ledgerIdFromRef(item.ledger_ref)}.` : "",
    item.source ? `Evidencia visible: ${_briefUI(item.source)}.` : "",
    "La resolucion debe decir si se corrige el nodo ejecutable, se agrega un overlay o se deja como observacion de fuente."
  ].filter(Boolean);
  return pieces.join(" ");
}

function markdownPlainText(md) {
  return String(md || "")
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/[*_`>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function rulingIssueDescription(detail = {}, fm = {}) {
  const kind = titleCase(fm.kind || "dictamen");
  const status = fm.status ? ` Estado: ${titleCase(fm.status)}.` : "";
  const refs = fm.source_refs ? ` Referencias fuente: ${fm.source_refs}.` : "";
  const body = markdownPlainText(detail.body);
  return `${kind} ${detail.id || ""}.${status}${refs} Tema principal: ${truncate(body || "sin fundamento visible", 360)}.`;
}

function cachedGraphNode(engine, id) {
  const graph = state.cache.graph[engine] || state.cache.graph[state.graph.engine];
  if (!graph || !Array.isArray(graph.nodes) || !id) return null;
  return graph.nodes.find((n) => n.id === id) || null;
}

function proposalContext(node = {}) {
  const engine = ["uw", "coverage"].includes(node.engine) ? node.engine : (state.graph.engine || state.runner.engine || "uw");
  const target = node.target || node.node_id || node.id || "";
  const isNode = Boolean(node.type || node.evaluate || node.branches || node.outcome || node.referral_target || node.on_no_match);
  const source = node.source_quote || node.source || node.issue_source || node.summary || "";
  return {
    engine,
    target,
    isNode,
    title: node.title || node.issue_title || node.proposal_title || target,
    condition: isNode ? nodeConditionDescription(node) : "La incidencia no esta enlazada a un nodo ejecutable cargado en memoria.",
    issue: nodeIssueDescription(node),
    source: source ? _briefUI(source) : "Sin cita fuente copiada en el contexto visible.",
    decision: isNode ? decisionPhrase(node) : "Sin decision ejecutable cargada.",
    facts: Array.isArray(node.needs_facts) ? node.needs_facts.join(", ") : ""
  };
}

function proposalContextPanel(node) {
  const ctx = proposalContext(node);
  return `<div class="proposal-context">
    <div class="proposal-context-block">
      <span class="proposal-context-label">${ctx.isNode ? "Condicion del objetivo" : "Contexto del objetivo"}</span>
      <p>${esc(ctx.condition)}</p>
    </div>
    <div class="proposal-context-block">
      <span class="proposal-context-label">Problema a resolver</span>
      <p>${esc(ctx.issue)}</p>
    </div>
  </div>`;
}

function proposalAssistantPanel() {
  return `<div class="proposal-ai chat-col">
    <div class="proposal-ai-head">
      <div><h3>Chat para proponer el cambio</h3><p>Describe lo que quieres corregir. El chat explica el impacto y luego lo convierte en una propuesta revisable.</p></div>
    </div>
    <div class="chat-thread proposal-ai-log" id="m-ai-log" aria-live="polite"></div>
    <div class="composer-area proposal-ai-compose">
      <div class="composer">
        <textarea id="m-ai-input" class="composer-input" rows="1" placeholder="Ej: esta condicion deberia mandar a rechazo cuando el riesgo no esta cubierto por la poliza"></textarea>
        <button class="composer-send" id="m-ai-send" type="button" title="Enviar" aria-label="Enviar">↑</button>
      </div>
      <div class="composer-bar">
        <button class="btn btn-ghost composer-confirm" id="m-ai-explain" type="button">Explicar contexto</button>
        <div class="composer-bar-right">
          <span class="composer-hint">Enter envia · Shift+Enter salto</span>
          <button class="btn btn-primary composer-confirm" id="m-ai-apply" type="button" disabled>Usar como propuesta</button>
        </div>
      </div>
    </div>
  </div>`;
}

function appendProposalAi(root, role, text) {
  const log = root.querySelector("#m-ai-log");
  if (!log) return;
  const el = document.createElement("div");
  const isUser = role === "user";
  el.className = `msg msg-${isUser ? "user" : "bot"}`;
  el.innerHTML = `<div class="msg-avatar">${isUser ? "T" : "AI"}</div>
    <div class="msg-content">
      <div class="msg-name">${isUser ? "Tu" : "Chat de cambio"}</div>
      <div class="msg-text">${esc(text)}</div>
    </div>`;
  log.appendChild(el);
  log.scrollTop = log.scrollHeight;
}

function proposalContextExplanation(ctx) {
  return [
    `Objetivo: ${ctx.target || "sin id visible"} (${engineLabel(ctx.engine)}).`,
    `Condicion actual: ${ctx.condition}`,
    `Problema: ${ctx.issue}`,
    `Decision actual: ${ctx.decision}`,
    ctx.facts ? `Datos que lee: ${ctx.facts}.` : "No hay lista de datos requeridos en este contexto.",
    `Cita/evidencia: ${ctx.source}`,
    "No aplico nada automaticamente: primero convierto la conversacion en una propuesta revisable."
  ].join("\n");
}

function choosePatchType(prompt) {
  const p = prompt.toLowerCase();
  if (/(rama|ramas|ruta|rute|deriv|target|siguiente|fallback|flujo)/.test(p)) return "branches";
  if (/(condicion|condición|jsonlogic|cuando|si\s|criterio|umbral)/.test(p)) return "condition";
  if (/(hecho|dato|fact|campo|leer|capturar)/.test(p)) return "facts";
  if (/(resultado|cubiert|rechaz|declin|elegible|no\s+cubre|cubre|aprobar|denegar)/.test(p)) return "outcome_flow";
  if (/(titulo|título|nota|texto|descripcion|descripción|nombre)/.test(p)) return "metadata";
  return "full_node_reading";
}

function assistantImpactSentence(patchType, ctx) {
  const map = {
    condition: `El cambio debe modificar cuando se activa ${ctx.target}; casos que antes no cumplian la condicion podrian entrar, y casos que antes entraban podrian salir.`,
    branches: `El cambio debe mover casos entre rutas o destinos; revisa que cada rama conserve una condicion clara y un resultado/destino unico.`,
    outcome_flow: `El cambio debe alterar el resultado o fallback del objetivo; en reclamos esto debe decir claramente si el riesgo queda cubierto, no cubierto o pendiente por dato faltante.`,
    facts: `El cambio debe ajustar los datos que el nodo lee; despues habra que confirmar que esos hechos existen en el extractor o formulario.`,
    metadata: `El cambio debe mejorar la lectura humana del nodo sin cambiar necesariamente la logica ejecutable.`,
    full_node_reading: `El cambio debe registrar una nueva lectura gobernada del objetivo completo y dejar claro que parte de la logica cambia.`
  };
  return map[patchType] || map.full_node_reading;
}

function extractJsonCandidate(text) {
  const raw = String(text || "");
  const starts = [raw.indexOf("{"), raw.indexOf("[")].filter((i) => i >= 0);
  if (!starts.length) return null;
  const start = Math.min(...starts);
  const end = raw.lastIndexOf(raw[start] === "[" ? "]" : "}");
  if (end <= start) return null;
  try { return JSON.parse(raw.slice(start, end + 1)); }
  catch { return null; }
}

function proposalAssistantReply(node, prompt) {
  const ctx = proposalContext(node);
  const patchType = choosePatchType(prompt);
  const json = extractJsonCandidate(prompt);
  const impact = assistantImpactSentence(patchType, ctx);
  const titleBit = truncate(prompt.replace(/\s+/g, " ").trim(), 72);
  const suggestion = {
    patch_type: patchType,
    title: `Resolver ${ctx.target || "objetivo"}: ${titleBit}`,
    rationale: `Contexto: ${ctx.issue} Pedido del usuario: ${prompt}`,
    change: `${impact} Cambio conversado: ${prompt}`,
    note: /(nota|texto|descripcion|descripción)/i.test(prompt) ? prompt : ""
  };
  if (json && patchType === "condition" && !Array.isArray(json)) suggestion.condition = JSON.stringify(json, null, 2);
  if (json && patchType === "branches") suggestion.branches = JSON.stringify(Array.isArray(json) ? json : [json], null, 2);
  const jsonHint = json
    ? "Detecte JSON en tu mensaje y lo puedo copiar al campo estructurado correspondiente."
    : "No veo JSON estructurado en el mensaje; dejare la propuesta como cambio explicado para que ajustes los campos editables antes de preparar el borrador.";
  return {
    suggestion,
    message: [
      `Lo prepararia como cambio de ${titleCase(patchType)}.`,
      `Que deberia hacer: ${impact}`,
      `Por que: ${ctx.issue}`,
      jsonHint,
      "Cuando estes conforme, usa 'Usar ultima propuesta' y luego 'Preparar borrador'."
    ].join("\n")
  };
}

function applyAssistantSuggestion(root, suggestion) {
  const set = (sel, value) => {
    const el = root.querySelector(sel);
    if (el && value !== undefined && value !== null && String(value).trim() !== "") el.value = value;
  };
  set("#m-title", suggestion.title);
  set("#m-rationale", suggestion.rationale);
  set("#m-change", suggestion.change);
  set("#m-note", suggestion.note);
  set("#m-condition", suggestion.condition);
  set("#m-branches", suggestion.branches);
  const patchType = root.querySelector("#m-patch-type");
  if (patchType && [...patchType.options].some((o) => o.value === suggestion.patch_type)) {
    patchType.value = suggestion.patch_type;
    patchType.dispatchEvent(new Event("change"));
  }
}

function bindProposalAssistant(root, node) {
  const input = root.querySelector("#m-ai-input");
  const send = root.querySelector("#m-ai-send");
  const explain = root.querySelector("#m-ai-explain");
  const apply = root.querySelector("#m-ai-apply");
  if (!input || !send || !explain || !apply) return;
  const session = { lastSuggestion: null };
  const ctx = proposalContext(node);
  appendProposalAi(root, "assistant", `Tengo contexto de ${engineLabel(ctx.engine)} para ${ctx.target || "este objetivo"}. Cuéntame el cambio en lenguaje normal; te diré qué afectaría y después puedes usarlo como propuesta.`);
  explain.addEventListener("click", () => {
    appendProposalAi(root, "user", "Explicame el contexto antes de proponer.");
    appendProposalAi(root, "assistant", proposalContextExplanation(ctx));
  });
  const run = () => {
    const prompt = input.value.trim();
    if (!prompt) { toast("Describe primero el cambio que quieres conversar", true); return; }
    appendProposalAi(root, "user", prompt);
    const reply = proposalAssistantReply(node, prompt);
    session.lastSuggestion = reply.suggestion;
    appendProposalAi(root, "assistant", reply.message);
    apply.disabled = false;
    input.value = "";
  };
  send.addEventListener("click", run);
  const grow = () => { input.style.height = "auto"; input.style.height = Math.min(input.scrollHeight, 180) + "px"; };
  input.addEventListener("input", grow);
  input.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); run(); }
  });
  grow();
  apply.addEventListener("click", () => {
    if (!session.lastSuggestion) return;
    applyAssistantSuggestion(root, session.lastSuggestion);
    appendProposalAi(root, "assistant", "Copie la ultima propuesta al formulario de abajo. Todavia no se aplica al grafo; revisa los campos y prepara el borrador cuando este correcto.");
  });
}

/* =====================================================================
   VIEW: ISSUES (FLAGS + CONFLICTS)
   ===================================================================== */
VIEWS.flags = async function (params) {
  if (params.engine) state.flags.engine = params.engine;
  if (params.mode) state.flags.mode = params.mode;
  const engine = state.flags.engine;
  const mode = state.flags.mode || "flags";
  setTopbar("Incidencias", "Posibles errores, conflictos, ambigüedades y dictámenes RUL/OVL gobernados. Los cambios quedan como borradores, nunca como ediciones de fuente.",
    `<div class="seg" id="issue-mode">
       <button class="seg-btn ${mode === "flags" ? "active" : ""}" data-mode="flags">Alertas</button>
       <button class="seg-btn ${mode === "conflicts" ? "active" : ""}" data-mode="conflicts">Conflictos</button>
     </div>
     <div class="seg${mode === "flags" ? "" : " seg-reserved"}" id="flag-engine" aria-hidden="${mode === "flags" ? "false" : "true"}">
       <button class="seg-btn ${engine === "all" ? "active" : ""}" data-engine="all">Todos</button>
       ${registeredMotors().map((item) => `<button class="seg-btn ${engine === item.id ? "active" : ""}" data-engine="${esc(item.id)}">${esc(engineLabel(item.id))}</button>`).join("")}
       <button class="seg-btn ${engine === "source" ? "active" : ""}" data-engine="source">Fuente</button>
     </div>`);
  $$("#issue-mode .seg-btn").forEach((b) => b.addEventListener("click", () => go("flags", { mode: b.dataset.mode })));
  if (mode === "conflicts") return renderConflictosPanel(params);
  $("#view").innerHTML = `<section class="kpis alertas-kpis">
      <div class="kpi"><span class="kpi-label">Alertas</span><span class="kpi-value" id="flag-total">—</span><span class="kpi-sub">objetivos de revisión</span></div>
      <div class="kpi is-warn"><span class="kpi-label">Abiertas</span><span class="kpi-value" id="flag-open">—</span><span class="kpi-sub">registro / grafo</span></div>
      <div class="kpi"><span class="kpi-label">Fuente</span><span class="kpi-value" id="flag-source">—</span><span class="kpi-sub">observado, inmutable</span></div>
      <div class="kpi"><span class="kpi-label">Grafo</span><span class="kpi-value" id="flag-graph">—</span><span class="kpi-sub">refs ejecutables</span></div>
    </section>
    <div class="reviewer">
      <div class="card node-list"><div class="card-head"><h2>Alertas</h2><span class="badge" id="f-count">…</span></div>
        <div class="search wide"><span class="search-ico">⌕</span><input id="f-search" type="text" placeholder="Buscar alertas…" value="${esc(state.flags.query)}"/></div>
        <div class="node-scroll" id="f-list"><p class="nl-empty">Cargando…</p></div></div>
      <div class="card node-inspect"><div class="card-body" id="f-detail"><div class="empty"><div class="empty-ico">!</div><p class="empty-title">Selecciona una alerta</p><p class="empty-sub">Revisa la incidencia respaldada por fuente y prepara una resolución gobernada o un borrador de overlay.</p></div></div></div>
    </div>`;
  $$("#flag-engine .seg-btn").forEach((b) => b.addEventListener("click", () => go("flags", { engine: b.dataset.engine })));
  let data;
  try { data = await alertasData(engine); } catch { $("#f-list").innerHTML = `<p class="nl-empty">No se pudieron cargar las alertas.</p>`; return; }
  renderFlagSummary(data.summary || {});
  const draw = (q) => {
    state.flags.query = q;
    const items = (data.items || []).filter((f) => !q || `${f.id} ${f.category} ${f.status} ${f.title} ${f.summary} ${f.target} ${f.ledger_ref || ""}`.toLowerCase().includes(q.toLowerCase()));
    $("#f-count").textContent = `${items.length}`;
    $("#f-list").innerHTML = items.map((f) => `<button class="node-item ${state.flags.selected === f.id ? "sel" : ""}" data-id="${esc(f.id)}">
      <span class="status-dot ${f.status === "open" ? "s-open" : f.status === "source_observed" ? "s-source" : "s-closed"}"></span>
      <span class="node-item-main"><span class="node-item-title">${esc(f.title)}</span><span class="node-item-id">${esc(f.category)} · ${esc(f.target)}</span></span></button>`).join("") || `<p class="nl-empty">No hay alertas que coincidan.</p>`;
    $$("#f-list .node-item").forEach((b) => b.addEventListener("click", () => openFlag(data, b.dataset.id)));
  };
  draw(state.flags.query);
  $("#f-search").addEventListener("input", (e) => draw(e.target.value));
  if (params.id) openFlag(data, params.id);
};

function renderFlagSummary(s) {
  $("#flag-total").textContent = s.total ?? 0;
  $("#flag-open").textContent = s.open ?? 0;
  $("#flag-source").textContent = s.source_observed ?? 0;
  $("#flag-graph").textContent = s.graph ?? 0;
}

function openFlag(data, id) {
  const item = (data.items || []).find((f) => f.id === id);
  if (!item) return;
  state.flags.selected = id;
  $$("#f-list .node-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
  const canAbiertasNode = item.node_id && ["uw", "coverage"].includes(item.engine);
  const issueText = flagIssueDescription(item);
  $("#f-detail").innerHTML = `<div class="ins-head"><span class="ntype nt-ruling big">${esc(titleCase(item.category))}</span>
      <div><h3 class="ins-title">${esc(item.title)}</h3><span class="ins-id">${esc(item.id)} · ${esc(titleCase(item.status))} · ${esc(titleCase(item.engine))}</span></div></div>
    <div class="flag-detail-grid">
      <div class="ins-row"><span class="ins-k">objetivo</span><span class="ins-v mono">${esc(item.target)}</span></div>
      <div class="ins-row"><span class="ins-k">estado</span><span class="ins-v">${esc(titleCase(item.status))}</span></div>
      ${item.ledger_ref ? `<div class="ins-row"><span class="ins-k">registro</span>${ledgerLink(item.ledger_ref)}</div>` : ""}
      ${canAbiertasNode ? `<div class="ins-row"><span class="ins-k">nodo</span><button class="xlink" id="flag-open-node">Abrir en grafo →</button></div>` : ""}
    </div>
    <div class="ins-sec"><h4>Que esta pasando</h4><p class="ins-note">${esc(issueText)}</p></div>
    <div class="ins-sec"><h4>Resumen original</h4><p class="ins-note">${esc(item.summary || "No se proporcionó resumen.")}</p></div>
    ${item.source ? `<div class="ins-sec"><h4>Fuente / referencia</h4><blockquote class="quote sm">${esc(_briefUI(item.source))}</blockquote></div>` : ""}
    <div class="flag-detail-actions">
      <button class="btn btn-primary flag-change" data-kind="${esc(item.category)}" data-target="${esc(item.target)}" data-node-id="${esc(item.node_id || "")}" data-title="${esc(item.title)}" data-summary="${esc(issueText)}" data-source="${esc(item.source || item.summary || "")}" data-engine="${esc(item.engine === "source" || item.engine === "ledger" ? "uw" : item.engine)}">Preparar resolución</button>
      ${item.ledger_ref ? ledgerLink(item.ledger_ref) : ""}
    </div>`;
  bindIncidenciaActions("#f-detail");
  const openNode = $("#flag-open-node");
  if (openNode) openNode.addEventListener("click", () => go("graph", { engine: item.engine, selected: item.node_id }));
}

async function renderConflictosPanel(params = {}) {
  $("#view").innerHTML = `<div class="reviewer"><div class="card node-list"><div class="card-head"><h2>Dictámenes</h2><span class="badge" id="l-count">…</span></div>
      <div class="search wide"><span class="search-ico">⌕</span><input id="l-search" type="text" placeholder="Buscar dictamen…"/></div>
      <div class="node-scroll" id="l-list"><p class="nl-empty">Cargando…</p></div></div>
    <div class="card node-inspect"><div class="card-body" id="l-detail"><div class="empty"><div class="empty-ico">⌗</div><p class="empty-title">Selecciona un dictamen</p><p class="empty-sub">Cada dictamen registra un conflicto o ambigüedad real de los manuales fuente, cómo se trató y a qué cláusulas se vincula.</p></div></div></div></div>`;
  let list;
  try { list = await ledgerList(); } catch { $("#l-list").innerHTML = `<p class="nl-empty">No se pudo cargar.</p>`; return; }
  const items = list.filter((r) => r.id !== "README");
  $("#l-count").textContent = `${items.length}`;
  const draw = (q) => {
    const f = items.filter((r) => !q || `${r.id} ${r.kind} ${r.source_refs || ""}`.toLowerCase().includes(q.toLowerCase()));
    $("#l-list").innerHTML = f.map((r) => `<button class="node-item ${state.ledger.selected === r.id ? "sel" : ""}" data-id="${esc(r.id)}">
      <span class="status-dot ${r.status === "open" ? "s-open" : "s-closed"}" title="${esc(titleCase(r.status))}"></span>
      <span class="node-item-main"><span class="node-item-title">${esc(r.id)}</span><span class="node-item-id">${esc(r.kind)}</span></span></button>`).join("") || `<p class="nl-empty">Sin coincidencias.</p>`;
    $$("#l-list .node-item").forEach((b) => b.addEventListener("click", () => openRuling(b.dataset.id)));
  };
  draw("");
  $("#l-search").addEventListener("input", (e) => draw(e.target.value));
  if (params.id) openRuling(params.id);
}

VIEWS.ledger = function (params) {
  return VIEWS.flags({ ...(params || {}), mode: "conflicts" });
};

async function openRuling(id) {
  state.ledger.selected = id;
  $$("#l-list .node-item").forEach((b) => b.classList.toggle("sel", b.dataset.id === id));
  $("#l-detail").innerHTML = `<p class="nl-empty">Cargando ${esc(id)}…</p>`;
  let d;
  try { d = await getJSON(`/api/ledger/${encodeURIComponent(id)}`); } catch { $("#l-detail").innerHTML = `<p class="nl-empty">No se pudo cargar ${esc(id)}.</p>`; return; }
  const fm = d.frontmatter || {};
  const meta = Object.entries(fm).filter(([k]) => k !== "id").map(([k, v]) => `<div class="ins-row"><span class="ins-k">${esc(k)}</span><span class="ins-v">${esc(v)}</span></div>`).join("");
  const issueText = rulingIssueDescription(d, fm);
  $("#l-detail").innerHTML = `<div class="ins-head"><span class="ntype nt-ruling big">${esc(titleCase(fm.kind || "dictamen"))}</span>
      <div><h3 class="ins-title">${esc(d.id)}</h3><span class="ins-id">${esc(d.path)} ${fm.status ? "· " + esc(titleCase(fm.status)) : ""}</span></div></div>
    ${meta ? `<div class="ins-sec"><h4>Metadatos</h4>${meta}</div>` : ""}
    <div class="ins-sec"><h4>Que esta pasando</h4><p class="ins-note">${esc(issueText)}</p></div>
    <div class="ins-sec"><h4>Fundamento</h4><div class="doc">${mdLite(d.body)}</div></div>
    <div class="flag-detail-actions">
      <button class="btn btn-primary flag-change" data-kind="${esc(fm.kind || "ruling")}" data-target="${esc(d.id)}" data-title="${esc(d.id)}" data-summary="${esc(issueText)}" data-source="${esc(d.body.slice(0, 700))}" data-engine="uw">Preparar resolución</button>
    </div>`;
  bindIncidenciaActions("#l-detail");
};

/* tiny markdown → html (headings, bold, code, listas, párrafos) */
function mdLite(md) {
  const lines = String(md || "").split("\n");
  let html = "", inList = false, inCode = false;
  const inline = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/`(.+?)`/g, "<code>$1</code>");
  for (let raw of lines) {
    if (raw.trim().startsWith("```")) { inCode = !inCode; html += inCode ? "<pre>" : "</pre>"; continue; }
    if (inCode) { html += esc(raw) + "\n"; continue; }
    const line = raw.trimEnd();
    if (/^#{1,6}\s/.test(line)) { if (inList) { html += "</ul>"; inList = false; } const lvl = line.match(/^#+/)[0].length; html += `<h${Math.min(lvl + 2, 6)}>${inline(line.replace(/^#+\s/, ""))}</h${Math.min(lvl + 2, 6)}>`; }
    else if (/^[-*]\s/.test(line)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(line.replace(/^[-*]\s/, ""))}</li>`; }
    else if (line.trim() === "") { if (inList) { html += "</ul>"; inList = false; } }
    else { if (inList) { html += "</ul>"; inList = false; } html += `<p>${inline(line)}</p>`; }
  }
  if (inList) html += "</ul>";
  if (inCode) html += "</pre>";
  return html;
}

/* =====================================================================
   PROPOSE CORRECTION — modal launched from graph reviewer
   ===================================================================== */
function openProposeModal(node) {
  const engine = ["uw", "coverage"].includes(node.engine) ? node.engine : (state.graph.engine || state.runner.engine || "uw");
  const target = node.target || node.node_id || node.id || "";
  const sourceQuote = node.source_quote || node.issue_source || node.source || node.issue_summary || node.summary || "";
  const defaultTitle = node.proposal_title || (node.type ? `Cambiar ${node.title || target}` : "");
  const defaultKind = node.proposal_kind || "RUL";
  const isNode = Boolean(node.type || node.evaluate || node.branches || node.outcome || node.referral_target || node.on_no_match);
  const truthTarget = isNode
    ? "un reemplazo propuesto para este nodo ejecutable"
    : "una resolucion propuesta para esta incidencia o dictamen";
  const modalTitle = isNode ? "Editar nodo con chat" : "Resolver incidencia con chat";
  const back = document.createElement("div");
  back.className = "modal-back";
  back.innerHTML = `
    <div class="modal proposal-modal" role="dialog" aria-modal="true">
      <div class="modal-head">
        <div><h2 class="modal-title">${esc(modalTitle)}</h2>
          <p class="modal-sub">Objetivo <span class="mono">${esc(target)}</span>${node._file ? " · " + esc(node._file) : ""}</p></div>
        <button class="drawer-x" id="m-close" title="Cerrar">✕</button>
      </div>
      <div class="modal-body">
        <div class="truth-note"><b>La fuente permanece inmutable.</b> Estás editando ${truthTarget}. El grafo actual no cambia hasta revisión, regeneración, validador VERDE y publicación.</div>
        ${proposalContextPanel(node)}
        ${proposalAssistantPanel()}
        <div class="pform">
          <label class="pf"><span>Tipo</span><select id="m-kind"><option value="RUL" ${defaultKind === "RUL" ? "selected" : ""}>RUL — dictamen de conflicto</option><option value="OVL" ${defaultKind === "OVL" ? "selected" : ""}>OVL — overlay / excepción</option></select></label>
          <label class="pf"><span>Motor</span><select id="m-engine"><option value="uw" ${engine === "uw" ? "selected" : ""}>Suscripción</option><option value="coverage" ${engine === "coverage" ? "selected" : ""}>Reclamos</option></select></label>
          <label class="pf full"><span>Título de propuesta</span><input id="m-title" type="text" placeholder="Resumen breve del cambio propuesto de decisión/texto" value="${esc(defaultTitle)}"/></label>
          <label class="pf full"><span>Nodo / cláusula / alerta objetivo</span><input id="m-target" type="text" value="${esc(target)}"/></label>
          <label class="pf full"><span>Evidencia fuente copiada del nodo <em>(no edita la fuente)</em></span><textarea id="m-source" rows="2" placeholder="Pega el texto fuente exacto que sustenta la propuesta">${esc(sourceQuote)}</textarea></label>
          <label class="pf full"><span>Justificación</span><textarea id="m-rationale" rows="2" placeholder="Por qué la lógica actual es incorrecta o ambigua"></textarea></label>
        </div>
        ${isNode ? proposalStructuredEditaror(node) : ""}
        <div class="pform">
          <label class="pf full"><span>Resumen del cambio propuesto</span><textarea id="m-change" rows="2" placeholder="Resumen breve en lenguaje claro de cómo debería quedar la lógica corregida"></textarea></label>
        </div>
        <div id="m-pipeline"></div>
      </div>
      <div class="modal-foot">
        <button class="btn btn-ghost" id="m-cancel">Cancelar</button>
        <button class="btn btn-primary" id="m-submit">✎ Preparar borrador</button>
      </div>
    </div>`;
  document.body.appendChild(back);
  requestAnimationFrame(() => back.classList.add("open"));
  const close = () => { back.classList.remove("open"); setTimeout(() => back.remove(), 180); };
  back.addEventListener("click", (e) => { if (e.target === back) close(); });
  back.querySelector("#m-close").addEventListener("click", close);
  back.querySelector("#m-cancel").addEventListener("click", close);
  bindProposalEditaror(back, node);
  bindProposalAssistant(back, node);
  back.querySelector("#m-submit").addEventListener("click", () => submitDraft(back));
}

function proposalStructuredEditaror(node) {
  const facts = Array.isArray(node.needs_facts) ? node.needs_facts.join(", ") : "";
  const condition = node.evaluate ? JSON.stringify(node.evaluate, null, 2) : "";
  const branches = Array.isArray(node.branches) ? JSON.stringify(node.branches, null, 2) : "";
  const referral = typeof node.referral_target === "object" ? (node.referral_target.name || JSON.stringify(node.referral_target)) : (node.referral_target || "");
  const currentSnapshot = JSON.stringify(proposalNodeSnapshot(node), null, 2);
  const readableCondición = node.evaluate ? humanLogic(node.evaluate) : "Sin condición a nivel de nodo";
  const readableBranches = Array.isArray(node.branches) && node.branches.length
    ? node.branches.map((b, i) => `${i + 1}. ${humanLogic(b.when || b.evaluate)} -> ${b.outcome || b.target || "rama"}`).join("\n")
    : "Sin lista de ramas en este nodo";
  const currentDecisión = [
    node.outcome ? `outcome: ${node.outcome}` : "",
    node.on_no_match ? `on_no_match: ${node.on_no_match}` : "",
    referral ? `referral_target: ${referral}` : ""
  ].filter(Boolean).join("\n") || "Sin resultado o fallback explícito en este nodo";
  return `<div class="proposal-editor">
    <div class="section-label inline">Nodo actual → nodo propuesto</div>
    <div class="truth-note compact"><b>¿Qué había antes?</b> Los campos de solo lectura “Actual” son lo que tiene hoy el grafo ejecutable. Los campos editables “Propuesto” inician como copia; cambia solo lo que debería ser distinto.</div>
    <div class="pform">
      <label class="pf"><span>Categoría de cambio</span><select id="m-patch-type">
        <option value="condition">Condición / JSONLogic</option>
        <option value="branches">Ramas / ruteo</option>
        <option value="outcome_flow">Resultado / siguiente objetivo</option>
        <option value="facts">Hechos requeridos</option>
        <option value="metadata">Título / nota / lectura de fuente</option>
        <option value="full_node_reading">Lectura completa del nodo</option>
      </select></label>
      <label class="pf"><span>Tipo de nodo actual</span><input type="text" value="${esc(node.type || "nodo")}" readonly/></label>
      <label class="pf full"><span>Texto visible actual</span><textarea class="readonly-area" rows="2" readonly>${esc(node.title || "")}</textarea></label>
      <label class="pf full"><span>Texto visible propuesto</span><input id="m-node-title" type="text" value="${esc(node.title || "")}"/></label>
      <label class="pf full"><span>Hechos requeridos actuales</span><input class="readonly-area" type="text" value="${esc(facts || "Sin hechos requeridos")}" readonly/></label>
      <label class="pf full"><span>Hechos requeridos propuestos <em>ids de hechos separados por coma</em></span><input id="m-needs-facts" type="text" value="${esc(facts)}"/></label>
      <label class="pf full"><span>Condición actual <em>vista legible</em></span><textarea class="mono-area readonly-area" rows="2" readonly>${esc(readableCondición)}</textarea></label>
      <label class="pf full"><span>Condición JSONLogic propuesta <em>editable</em></span><textarea id="m-condition" class="mono-area" rows="7" placeholder='{"==":[{"var":"field"},"value"]}'>${esc(condition)}</textarea></label>
      <label class="pf full"><span>Ramas actuales <em>vista legible</em></span><textarea class="mono-area readonly-area" rows="3" readonly>${esc(readableBranches)}</textarea></label>
      <label class="pf full"><span>Ramas JSON propuestas <em>lista editable</em></span><textarea id="m-branches" class="mono-area" rows="8" placeholder='[{"when": {...}, "outcome": "advance", "target": "node.id"}]'>${esc(branches)}</textarea></label>
      <label class="pf full"><span>Decisión / ruteo actual</span><textarea class="mono-area readonly-area" rows="3" readonly>${esc(currentDecisión)}</textarea></label>
      <label class="pf"><span>Decisión / resultado propuesto</span><input id="m-outcome" type="text" value="${esc(node.outcome || "")}" placeholder="eligible / decline / refer_authority / advance"/></label>
      <label class="pf"><span>Fallback / siguiente objetivo propuesto</span><input id="m-on-no-match" type="text" value="${esc(node.on_no_match || "")}" placeholder="id de nodo objetivo"/></label>
      <label class="pf"><span>Destino de derivación propuesto</span><input id="m-referral-target" type="text" value="${esc(referral)}" placeholder="id de proceso o nodo"/></label>
      <label class="pf"><span>Política de impacto propuesta</span><input id="m-hit-policy" type="text" value="${esc(node.hit_policy || "")}" placeholder="unique / first / all"/></label>
      <label class="pf full"><span>Nota / interpretación actual</span><textarea class="readonly-area" rows="3" readonly>${esc(node.note || "")}</textarea></label>
      <label class="pf full"><span>Nota / interpretación propuesta</span><textarea id="m-note" rows="3" placeholder="Nota o interpretación propuesta">${esc(node.note || "")}</textarea></label>
    </div>
    <details class="proposal-current">
      <summary>Instantánea ejecutable actual</summary>
      <textarea id="m-current-json" class="mono-area" rows="10" readonly>${esc(currentSnapshot)}</textarea>
    </details>
  </div>`;
}

function proposalNodeSnapshot(node) {
  const keys = ["id", "type", "process", "order", "title", "needs_facts", "evaluate", "branches", "outcome", "on_no_match", "referral_target", "hit_policy", "note", "source_quote", "source", "_origin"];
  const out = {};
  keys.forEach((k) => {
    if (node[k] !== undefined) out[k] = node[k];
  });
  return out;
}

function bindProposalEditaror(root, node) {
  const type = root.querySelector("#m-patch-type");
  if (!type) return;
  const summary = root.querySelector("#m-change");
  const update = () => {
    if (!summary || summary.value.trim()) return;
    const target = node.id || node.target || "target";
    const labels = {
      condition: "Cambiar condición del nodo / JSONLogic",
      branches: "Cambiar ruteo o resultados de ramas",
      outcome_flow: "Cambiar resultado o fallback objetivo",
      facts: "Cambiar los hechos que lee este nodo",
      metadata: "Cambiar el título, nota o lectura de fuente",
      full_node_reading: "Reemplazar la lectura gobernada de este nodo"
    };
    summary.placeholder = `${labels[type.value] || "Cambiar lógica del nodo"} para ${target}`;
  };
  type.addEventListener("change", update);
  update();
}

function collectStructuredPatch(root) {
  const patchTipoEl = root.querySelector("#m-patch-type");
  if (!patchTipoEl) return { ok: true, patch_type: "freeform", patch: null };

  let current = {};
  try {
    current = JSON.parse(root.querySelector("#m-current-json").value || "{}");
  } catch {
    current = {};
  }

  const get = (id) => (root.querySelector(id) ? root.querySelector(id).value : "");
  const parseJsonField = (id, label, allowEmpty) => {
    const raw = get(id).trim();
    if (!raw && allowEmpty) return { ok: true, value: undefined };
    try { return { ok: true, value: JSON.parse(raw) }; }
    catch { return { ok: false, error: `El campo ${label} debe ser JSON válido.` }; }
  };

  const condition = parseJsonField("#m-condition", "Condición JSONLogic", true);
  if (!condition.ok) return condition;
  const branches = parseJsonField("#m-branches", "JSON de ramas", true);
  if (!branches.ok) return branches;
  if (branches.value !== undefined && !Array.isArray(branches.value)) {
    return { ok: false, error: "JSON de ramas debe ser una lista." };
  }

  const facts = get("#m-needs-facts").split(",").map((s) => s.trim()).filter(Boolean);
  const proposed = {
    title: get("#m-node-title").trim(),
    needs_facts: facts,
    evaluate: condition.value,
    branches: branches.value,
    outcome: get("#m-outcome").trim(),
    on_no_match: get("#m-on-no-match").trim(),
    referral_target: get("#m-referral-target").trim(),
    hit_policy: get("#m-hit-policy").trim(),
    note: get("#m-note").trim(),
  };
  Object.keys(proposed).forEach((k) => {
    if (proposed[k] === "" || proposed[k] === undefined || (Array.isArray(proposed[k]) && !proposed[k].length)) delete proposed[k];
  });

  const changed = {};
  for (const [key, value] of Object.entries(proposed)) {
    const comparableCurrent = key === "referral_target" && typeof current[key] === "object" ? current[key].name : current[key];
    if (JSON.stringify(comparableCurrent ?? null) !== JSON.stringify(value ?? null)) {
      changed[key] = { from: comparableCurrent ?? null, to: value };
    }
  }

  return {
    ok: true,
    patch_type: patchTipoEl.value,
    patch: {
      target_type: "node",
      patch_type: patchTipoEl.value,
      current,
      proposed,
      changed,
    }
  };
}

async function submitDraft(root) {
  const v = (id) => root.querySelector(id).value;
  const structured = collectStructuredPatch(root);
  if (!structured.ok) { toast(structured.error, true); return; }
  const body = {
    kind: v("#m-kind"), engine: v("#m-engine"), title: v("#m-title"), target: v("#m-target"),
    source_quote: v("#m-source"), rationale: v("#m-rationale"), proposed_change: v("#m-change"),
    patch_type: structured.patch_type,
    structured_patch: structured.patch
  };
  if (!body.title.trim() || !body.target.trim()) { toast("Título y objetivo son requeridos", true); return; }
  const btn = root.querySelector("#m-submit"); btn.classList.add("loading"); btn.disabled = true;
  try {
    const r = await postJSON("/api/proposals/draft", body, "uw_user");
    state.cache.drafts = null;
    renderPipeline(root.querySelector("#m-pipeline"), r);
    toast(`Borrador ${r.draft.draft_id} preparado`);
  } catch { toast("No se pudo preparar el borrador", true); }
  finally { btn.classList.remove("loading"); btn.disabled = false; }
}

function renderPipeline(el, r) {
  const steps = r.pipeline || [];
  el.innerHTML = `<div class="pipe-card">
    <div class="pipe-head"><span class="mono">${esc(r.draft.draft_id)}</span>
      <span class="badge ${r.publish_allowed ? "badge-ok" : "badge-bad"}">${r.publish_allowed ? "publicación permitida" : "bloqueado"}</span></div>
    <p class="pipe-reason">${esc(r.publish_blocked_reason)}</p>
    <div class="pipe">${steps.map((s, i) => `<div class="pstep ${s.done ? "done" : "todo"}">
      <span class="pstep-dot">${s.done ? "✓" : i + 1}</span><span class="pstep-label">${esc(s.label)}</span></div>`).join("")}</div></div>`;
}

/* =====================================================================
   VIEWS: SIMULATION + INSIGHTS
   ===================================================================== */
VIEWS.simulation = async function () {
  const meta = await simulationFilters();
  const candidates = await simulationCandidates();
  if (!state.simulation.result) {
    state.simulation.result = await runSimulationPayload({
      filters: simulationApiFilters(state.simulation.filters),
      candidate_id: state.simulation.candidate_id,
      controls: state.simulation.controls
    });
  }
  setTopbar(
    "Simulación",
    "Laboratorio vivo de riesgo: cambia precio, cobertura, frecuencia, severidad y renovaciones.",
    `<button class="btn btn-ghost" id="sim-reset">Restablecer</button><button class="btn btn-primary" id="sim-run">Ejecutar simulación</button>`
  );
  $("#view").innerHTML = simulationLayout(meta, candidates, state.simulation.result);
  bindSimulationControls();
};

VIEWS.insights = async function () {
  if (!state.simulation.insightsResult) {
    state.simulation.insightsResult = await runSimulationPayload({
      filters: { engine: "coverage" },
      candidate_id: state.simulation.candidate_id
    });
  }
  setTopbar(
    "Insights",
    "Pérdidas por nodo, cláusulas con fricción broker y rutas más tocadas en reclamos mock.",
    `<button class="btn btn-primary" id="insights-refresh">Actualizar</button>`
  );
  $("#view").innerHTML = insightsLayout(state.simulation.insightsResult);
  $("#insights-refresh").addEventListener("click", async () => {
    $("#insights-refresh").disabled = true;
    state.simulation.insightsResult = await runSimulationPayload({ filters: { engine: "coverage" }, candidate_id: state.simulation.candidate_id });
    go("insights");
  });
};

VIEWS.supervision = async function () {
  if (!state.supervision.result) {
    state.supervision.result = await supervisionPayload();
  }
  setTopbar(
    "Supervisión",
    "Control room de riesgo actual: clientes, accidentes, severidad, nodos de salida y renovaciones.",
    `<button class="btn btn-primary" id="supervision-refresh">Actualizar ahora</button>`
  );
  $("#view").innerHTML = supervisionLayout(state.supervision.result);
  $("#supervision-refresh").addEventListener("click", async () => {
    $("#supervision-refresh").disabled = true;
    state.supervision.result = await supervisionPayload();
    go("supervision");
  });
};

function supervisionLayout(result) {
  const s = result?.summary || {};
  const tables = result?.tables || {};
  return `<div class="supervision-page">
    <section class="kpis sim-kpis">
      <div class="kpi is-info"><span class="kpi-label">Clientes activos</span><span class="kpi-value">${esc(s.active_clients || 0)}</span><span class="kpi-sub">${esc(s.claim_count || 0)} reclamos observados</span></div>
      <div class="kpi ${Number(s.risk_score || 0) > 55 ? "is-warn" : "is-ok"}"><span class="kpi-label">Risk score</span><span class="kpi-value">${esc(s.risk_score || 0)}</span><span class="kpi-sub">LR ${Number(s.loss_ratio || 0).toFixed(2)} · freq ${Number(s.accident_frequency || 0).toFixed(2)}</span></div>
      <div class="kpi is-warn"><span class="kpi-label">Cash-out exposure</span><span class="kpi-value">Bs ${moneyBob(s.cashout_exposure_bob)}</span><span class="kpi-sub">nodos con salida monetaria</span></div>
      <div class="kpi is-info"><span class="kpi-label">Severidad promedio</span><span class="kpi-value">Bs ${moneyBob(s.avg_severity_bob)}</span><span class="kpi-sub">mock-live</span></div>
    </section>
    <section class="supervision-grid">
      ${tableCard("Alertas de riesgo", alertRows(tables.risk_alerts || []))}
      ${tableCard("Salud por cliente", clientHealthRows(tables.client_health || []))}
      ${tableCard("Cash-out nodes", cashoutRows(tables.cashout_nodes || []))}
      ${tableCard("Frecuencia de accidentes", frequencyRows(tables.accident_frequency || []))}
      ${tableCard("Severidad por causa", severityRows(tables.severity || []))}
      ${tableCard("Cola de renovación", renewalRows(tables.renewal_queue || []))}
    </section>
  </div>`;
}

function simulationLayout(meta, candidates, result) {
  const db = meta.mock_database || {};
  const counts = db.row_counts || {};
  return `<div class="sim-page">
    <section class="sim-intro">
      <div class="sim-intro-text">
        <h2>Simulación de impacto</h2>
        <p>Compara el árbol <b>actual</b> con una versión <b>candidata</b> sobre una cartera mock y mide el efecto antes de lanzar cambios.</p>
      </div>
      <div class="sim-counts">
        <span class="badge badge-amber">datos mock</span>
        <div class="sim-count"><b>${esc(counts.submissions || 0)}</b> solicitudes</div>
        <div class="sim-count"><b>${esc(counts.claims || 0)}</b> reclamos</div>
      </div>
    </section>

    <section class="card sim-controls">
      <div class="card-body">${simulationControls(meta, candidates)}</div>
    </section>

    <div id="sim-summary-wrap">${simulationSummary(result)}</div>
    <div id="sim-risk-wrap">${simulationRiskLab(result)}</div>

    <section class="card sim-detail">
      <div class="card-head">
        <h2>Detalle de resultados</h2>
        ${simulationTabs()}
      </div>
      <div class="card-body gtable-wrap" id="sim-detail-body">${simulationActiveTable(result)}</div>
    </section>
  </div>`;
}

// Two primary controls (candidate version + engine) always visible; the rest of
// the cohort filters and the overlay diff stay tucked away to reduce noise.
function simulationControls(meta, candidates) {
  const f = state.simulation.filters;
  const opts = meta.filters || {};
  const active = candidates.find((c) => c.candidate_id === state.simulation.candidate_id) || candidates[0] || {};
  const showFilters = state.simulation.showFilters;
  const controls = simulationEffectiveControls(active);
  return `<div class="sim-control-row">
      ${simSelect("sim-candidate", "Versión a comparar", candidates.map((c) => ({ value: c.candidate_id, label: c.label })), state.simulation.candidate_id, "sim-field-lg")}
      ${simSelect("sim-engine", "Motor", opts.engines || [], f.engine || "all")}
      <button class="sim-disclose" id="sim-morefilters" type="button" aria-expanded="${showFilters}">${showFilters ? "Ocultar filtros" : "Más filtros de cohorte"}</button>
    </div>
    <p class="sim-candidate-desc" id="sim-candidate-desc">${esc(active.description || "")}</p>
    <div class="sim-extra-filters ${showFilters ? "" : "hidden"}" id="sim-extra-filters">
      ${simSelect("sim-city", "Ciudad", ["all", ...(opts.cities || [])], f.cities || "")}
      ${simSelect("sim-broker", "Broker", ["all", ...(opts.brokers || [])], f.brokers || "")}
      ${simSelect("sim-business", "Tipo de negocio", ["all", ...(opts.business_types || [])], f.business_types || "")}
      ${simSelect("sim-make", "Marca", ["all", ...(opts.vehicle_makes || [])], f.vehicle_makes || "")}
      ${simSelect("sim-policy", "Producto / cobertura", ["all", ...(opts.policy_types || [])], f.policy_types || "")}
      ${simSelect("sim-cause", "Causa reclamo", ["all", ...(opts.claim_causes || [])], f.claim_causes || "")}
      <label class="sim-field"><span>Edad mínima</span><input id="sim-age-min" type="number" min="0" value="${esc(f.age_min)}" placeholder="${esc(opts.age?.min || "")}"></label>
      <label class="sim-field"><span>Edad máxima</span><input id="sim-age-max" type="number" min="0" value="${esc(f.age_max)}" placeholder="${esc(opts.age?.max || "")}"></label>
    </div>
    ${simulationLeverPanel(controls)}
    <details class="sim-changes">
      <summary>Qué cambia esta versión candidata</summary>
      <div class="sandbox-edits" id="sim-overlay-edits">${simulationOverlayRows(active)}</div>
      <p class="sim-footnote">El overlay no edita los archivos fuente; compara una versión candidata gobernada contra el árbol actual.</p>
    </details>`;
}

function simulationEffectiveControls(active) {
  return { ...DEFAULT_SIM_CONTROLS, ...((active && active.overlays) || {}), ...(state.simulation.controls || {}) };
}

function simulationLeverPanel(c) {
  return `<section class="sim-levers" aria-label="Palancas de simulación">
    ${simRange("sim-price-mult", "Precio cobertura", c.coverage_price_multiplier, 0.75, 1.5, 0.01, `${Math.round(c.coverage_price_multiplier * 100)}%`)}
    ${simRange("sim-deductible-mult", "Deducible", c.deductible_multiplier, 0.8, 1.6, 0.01, `${Math.round(c.deductible_multiplier * 100)}%`)}
    ${simRange("sim-frequency-mult", "Frecuencia accidentes", c.accident_frequency_multiplier, 0.5, 1.8, 0.01, `${Math.round(c.accident_frequency_multiplier * 100)}%`)}
    ${simRange("sim-severity-mult", "Severidad", c.severity_multiplier, 0.5, 1.8, 0.01, `${Math.round(c.severity_multiplier * 100)}%`)}
    ${simRange("sim-renewal-price", "Renovación precio", c.renewal_price_change_percent, -15, 30, 1, `${Number(c.renewal_price_change_percent).toFixed(0)}%`)}
    ${simRange("sim-notice-days", "Aviso reclamo días", c.coverage_notice_days_limit, 3, 20, 1, `${Number(c.coverage_notice_days_limit).toFixed(0)} días`)}
    ${simRange("sim-replacement-threshold", "Cambio de parte", c.coverage_replacement_threshold, 45, 80, 1, `${Number(c.coverage_replacement_threshold).toFixed(0)}%`)}
    <label class="sim-field sim-field-sm"><span>Alcoholemia</span><select id="sim-alcohol-outcome" data-sim-control="coverage_alcohol_outcome">
      ${simOption("not_covered", "No cubrir", c.coverage_alcohol_outcome)}
      ${simOption("refer_adjuster", "Revisión humana", c.coverage_alcohol_outcome)}
    </select></label>
    <label class="sim-field sim-field-sm"><span>Robo partes moto</span><select id="sim-moto-outcome" data-sim-control="coverage_moto_parts_outcome">
      ${simOption("not_covered", "No cubrir", c.coverage_moto_parts_outcome)}
      ${simOption("refer_adjuster", "Revisión humana", c.coverage_moto_parts_outcome)}
      ${simOption("likely_covered", "Cubrir", c.coverage_moto_parts_outcome)}
    </select></label>
  </section>`;
}

function simRange(id, label, value, min, max, step, display) {
  return `<label class="sim-lever"><span>${esc(label)}</span><input id="${id}" data-sim-control="${esc(controlKeyFor(id))}" type="range" min="${min}" max="${max}" step="${step}" value="${esc(value)}"><b>${esc(display)}</b></label>`;
}

function controlKeyFor(id) {
  return {
    "sim-price-mult": "coverage_price_multiplier",
    "sim-deductible-mult": "deductible_multiplier",
    "sim-frequency-mult": "accident_frequency_multiplier",
    "sim-severity-mult": "severity_multiplier",
    "sim-renewal-price": "renewal_price_change_percent",
    "sim-notice-days": "coverage_notice_days_limit",
    "sim-replacement-threshold": "coverage_replacement_threshold"
  }[id];
}

function simOption(value, label, selected) {
  return `<option value="${esc(value)}" ${String(value) === String(selected) ? "selected" : ""}>${esc(label)}</option>`;
}

function simulationOverlayRows(active) {
  const ov = (active && active.overlays) || {};
  return [
    sandboxRow("standard.elig.antique_vehicle", "Antigüedad de renovación", `vehicle_age_years > ${fmt(ov.uw_antique_age_limit || 20)}`),
    sandboxRow("standard.elig.rent_a_car", "Rent-a-car no petrolero", fmt(ov.uw_rental_non_petroleum_outcome || "decline")),
    sandboxRow("coverage.duty.notice_delay", "Aviso tardío reclamos", `insurer_notice_days > ${fmt(ov.coverage_notice_days_limit || 10)}`),
    sandboxRow("coverage.general.alcohol", "Alcoholemia", fmt(ov.coverage_alcohol_outcome || "not_covered")),
    sandboxRow("coverage.parts.replacement_threshold", "Cambio de parte", `reparación <= ${fmt(ov.coverage_replacement_threshold || 65)}%`),
  ].join("");
}

function sandboxRow(node, title, value) {
  return `<div class="sandbox-row"><code>${esc(node)}</code><span>${esc(title)}</span><b>${esc(value)}</b></div>`;
}

const SIM_TABS = [
  { id: "cases", label: "Casos cambiados" },
  { id: "cashout", label: "Cash-out nodes" },
  { id: "loss", label: "Pérdida por nodo" },
  { id: "brokers", label: "Fricción broker" },
  { id: "pricing", label: "Precio cobertura" },
  { id: "renewals", label: "Renovaciones" },
  { id: "renewal_tree", label: "Árbol renovación" },
  { id: "nodes", label: "Nodos recorridos" },
];

function simulationTabs() {
  const tab = state.simulation.tab;
  return `<div class="seg sim-tabs">${SIM_TABS.map((t) =>
    `<button class="seg-btn ${tab === t.id ? "active" : ""}" data-simtab="${t.id}">${esc(t.label)}</button>`
  ).join("")}</div>`;
}

// Renders only the table for the active tab — one table at a time instead of four.
function simulationActiveTable(result) {
  const tables = result?.tables || {};
  switch (state.simulation.tab) {
    case "cashout": return cashoutRows((tables.cashout_nodes || []).slice(0, 18));
    case "loss":    return lossRows((tables.loss_nodes || []).slice(0, 12));
    case "brokers": return clauseRows((tables.broker_clause_friction || []).slice(0, 12));
    case "pricing": return priceCurveRows(result?.price_curve || []);
    case "renewals": return renewalRows(result?.renewal?.queue || []);
    case "renewal_tree": return renewalTreeRows(result?.renewal?.tree || []);
    case "nodes":   return nodeRows((tables.node_hits || []).slice(0, 12));
    case "cases":
    default: {
      const cases = tables.cases || [];
      const ordered = cases.filter((r) => r.outcome_changed).concat(cases.filter((r) => !r.outcome_changed));
      return caseRows(ordered.slice(0, 15));
    }
  }
}

function simulationSummary(result) {
  const s = result?.summary || {};
  const d = s.delta || {};
  const sel = result?.selection || {};
  return `<section class="kpis sim-kpis">
    <div class="kpi is-info"><span class="kpi-label">Cohorte</span><span class="kpi-value">${esc(sel.selected_count || 0)}</span><span class="kpi-sub">${esc(sel.uw_count || 0)} suscripción · ${esc(sel.coverage_count || 0)} reclamos</span></div>
    <div class="kpi ${Number(d.profit_bob || 0) >= 0 ? "is-ok" : "is-bad"}"><span class="kpi-label">Delta utilidad</span><span class="kpi-value">${signedMoneyBob(d.profit_bob)}</span><span class="kpi-sub">BOB modelado mock</span></div>
    <div class="kpi ${Number(d.claim_loss_bob || 0) <= 0 ? "is-ok" : "is-warn"}"><span class="kpi-label">Delta pérdida reclamos</span><span class="kpi-value">${signedMoneyBob(d.claim_loss_bob)}</span><span class="kpi-sub">pagado + reserva esperado</span></div>
    <div class="kpi ${Number(d.risk_score || 0) <= 0 ? "is-ok" : "is-warn"}"><span class="kpi-label">Delta riesgo</span><span class="kpi-value">${signedNumber(d.risk_score || 0, 1)}</span><span class="kpi-sub">loss ratio ${signedNumber(d.loss_ratio || 0, 3)} · outcome ${esc(d.outcome_changed_count || 0)}</span></div>
  </section>`;
}

function simulationRiskLab(result) {
  const risk = result?.risk || {};
  const candidate = risk.candidate || {};
  const delta = risk.delta || {};
  const renewal = result?.renewal || {};
  return `<section class="sim-lab-grid">
    <section class="card">
      <div class="card-head"><h2>Riesgo en vivo</h2><span class="badge ${Number(delta.risk_score || 0) <= 0 ? "badge-ok" : "badge-amber"}">${signedNumber(delta.risk_score || 0, 1)}</span></div>
      <div class="card-body sim-risk-metrics">
        ${riskMetric("Risk score", candidate.risk_score, signedNumber(delta.risk_score || 0, 1))}
        ${riskMetric("Loss ratio", candidate.loss_ratio, signedNumber(delta.loss_ratio || 0, 3))}
        ${riskMetric("Frecuencia", candidate.accident_frequency, signedNumber(delta.accident_frequency || 0, 3))}
        ${riskMetric("Severidad", `Bs ${moneyBob(candidate.avg_severity_bob)}`, signedMoneyBob(delta.avg_severity_bob || 0))}
        ${riskMetric("Cash-out exposure", `Bs ${moneyBob(candidate.cashout_exposure_bob)}`, signedMoneyBob(delta.cashout_exposure_bob || 0))}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Curva de precio cobertura</h2><span class="badge">profit max</span></div>
      <div class="card-body">${priceCurveBars(result?.price_curve || [])}</div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Renovaciones</h2><span class="badge badge-ok">mejor ${esc(renewal.best_price_change_percent ?? "--")}%</span></div>
      <div class="card-body">${renewalCurveBars(renewal.curve || [])}</div>
    </section>
  </section>`;
}

function riskMetric(label, value, delta) {
  return `<div class="risk-metric"><span>${esc(label)}</span><b>${esc(value ?? "--")}</b><em>${esc(delta)}</em></div>`;
}

function priceCurveBars(rows) {
  const maxProfit = Math.max(1, ...rows.map((r) => Math.abs(Number(r.profit_bob || 0))));
  return `<div class="curve-list">${rows.map((r) => `<div class="curve-row">
    <span>${Math.round(Number(r.coverage_price_multiplier) * 100)}%</span>
    <div class="curve-track"><i style="width:${Math.max(4, Math.round(Math.abs(Number(r.profit_bob || 0)) / maxProfit * 100))}%"></i></div>
    <b>Bs ${moneyBob(r.profit_bob)}</b>
    <em>LR ${Number(r.loss_ratio || 0).toFixed(2)}</em>
  </div>`).join("")}</div>`;
}

function renewalCurveBars(rows) {
  const maxProfit = Math.max(1, ...rows.map((r) => Math.abs(Number(r.profit_bob || 0))));
  return `<div class="curve-list">${rows.map((r) => `<div class="curve-row">
    <span>${signedNumber(r.price_change_percent, 0)}%</span>
    <div class="curve-track"><i style="width:${Math.max(4, Math.round(Math.abs(Number(r.profit_bob || 0)) / maxProfit * 100))}%"></i></div>
    <b>Bs ${moneyBob(r.profit_bob)}</b>
    <em>ret ${Math.round(Number(r.retention_rate || 0) * 100)}%</em>
  </div>`).join("")}</div>`;
}

function insightsLayout(result) {
  return `<div class="sim-page">
    ${simulationSummary(result)}
    <section class="sim-table-grid insights-tables">
      ${tableCard("Pérdida por nodo de reclamo", lossRows(result.tables.loss_nodes || []))}
      ${tableCard("Cláusulas que molestan a brokers", clauseRows(result.tables.broker_clause_friction || []))}
      ${tableCard("Rutas más tocadas", nodeRows(result.tables.node_hits || []))}
      ${tableCard("Casos de reclamos", caseRows(result.tables.cases || []))}
    </section>
  </div>`;
}

// Shared "hero" metric card used at the top of Supervisión and Simulación.
// tone: "ok" | "warn" | "bad" | "info" → color accent; tag is an optional short qualifier.
function heroKpi(label, value, sub, tone = "info", tag = "") {
  const toneClass = tone === "ok" ? "is-ok" : tone === "warn" ? "is-warn" : tone === "bad" ? "is-bad" : "";
  return `<div class="hero-kpi ${toneClass}">
    <span class="hero-label">${esc(label)}</span>
    <span class="hero-value">${esc(value)}</span>
    ${sub ? `<span class="hero-sub">${esc(sub)}</span>` : ""}
    ${tag ? `<span class="badge hero-tag">${esc(tag)}</span>` : ""}
  </div>`;
}

// Labeled band header so a group of tables never floats without context.
function bandHead(title, hint = "") {
  return `<div class="band-head"><h2>${esc(title)}</h2>${hint ? `<span class="band-hint">${esc(hint)}</span>` : ""}</div>`;
}

function tableCard(title, rowsHtml) {
  return `<section class="card sim-table-card">
    <div class="card-head"><h2>${esc(title)}</h2></div>
    <div class="card-body gtable-wrap">${rowsHtml}</div>
  </section>`;
}

function caseRows(rows) {
  return `<table class="gtable"><thead><tr><th>Caso</th><th>Cliente</th><th>Actual</th><th>Sandbox</th><th>Impacto</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td class="mono">${esc(r.case_id)}</td><td><b>${esc(r.client_name)}</b><div class="sim-sub">${esc(r.city)} · ${esc(r.vehicle_make)}</div></td><td>${esc(titleCase(r.current_outcome))}</td><td>${esc(titleCase(r.candidate_outcome))}</td><td class="${Number(r.profit_bob || 0) >= 0 ? "sim-pos" : "sim-neg"}">${signedMoneyBob(r.profit_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function lossRows(rows) {
  return `<table class="gtable"><thead><tr><th>Lado</th><th>Nodo</th><th>Reclamos</th><th>Pérdida</th><th>Broker</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(r.side)}</td><td class="mono">${esc(truncate(r.node_id, 44))}</td><td class="num">${esc(r.claim_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="num">${esc(r.avg_broker_satisfaction)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function clauseRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cláusula</th><th>Reclamos</th><th>Inconformes</th><th>Pérdida</th><th>Feedback</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td class="mono">${esc(r.clause_code)}</td><td class="num">${esc(r.claim_count)}</td><td class="num">${esc(r.unhappy_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="sm">${esc(truncate(r.sample_feedback || "—", 90))}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function cashoutRows(rows) {
  return `<table class="gtable"><thead><tr><th>Lado</th><th>Caso</th><th>Cliente</th><th>Nodo</th><th>Salida</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(r.side)}</td><td class="mono">${esc(r.case_id)}</td><td>${esc(r.client_name)}<div class="sim-sub">${esc(titleCase(r.cause))} · ${esc(r.broker)}</div></td><td class="mono">${esc(truncate(r.node_id, 48))}</td><td class="num">Bs ${moneyBob(r.cashout_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function alertRows(rows) {
  return `<table class="gtable"><thead><tr><th>Sev</th><th>Alerta</th><th>Owner</th><th>Nodo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><span class="badge ${r.severity === "high" ? "badge-bad" : "badge-amber"}">${esc(r.severity)}</span></td><td><b>${esc(r.title)}</b><div class="sim-sub">${esc(r.detail)}</div></td><td>${esc(titleCase(r.owner))}</td><td class="mono">${esc(truncate(r.node, 38))}</td></tr>`).join("") || emptyTableRow(4)}
  </tbody></table>`;
}

function clientHealthRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cliente</th><th>Riesgo</th><th>LR</th><th>Freq</th><th>Incurrido</th><th>Nodos</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><b>${esc(r.client_name)}</b><div class="sim-sub">${esc(r.city)} · ${esc(r.broker)}</div></td><td class="num">${esc(r.risk_score)}</td><td class="num">${Number(r.loss_ratio || 0).toFixed(2)}</td><td class="num">${Number(r.accident_frequency || 0).toFixed(2)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td><td class="mono">${esc(truncate((r.risk_nodes || []).join(", "), 50))}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function frequencyRows(rows) {
  return `<table class="gtable"><thead><tr><th>Ciudad</th><th>Negocio</th><th>Clientes</th><th>Reclamos</th><th>Freq</th><th>Incurrido</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(r.city)}</td><td>${esc(titleCase(r.business_type))}</td><td class="num">${esc(r.client_count)}</td><td class="num">${esc(r.claim_count)}</td><td class="num">${Number(r.accident_frequency || 0).toFixed(2)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function severityRows(rows) {
  return `<table class="gtable"><thead><tr><th>Causa</th><th>Reclamos</th><th>Incurrido</th><th>Severidad prom.</th><th>Máximo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(titleCase(r.claim_cause))}</td><td class="num">${esc(r.claim_count)}</td><td class="num">Bs ${moneyBob(r.incurred_bob)}</td><td class="num">Bs ${moneyBob(r.avg_severity_bob)}</td><td class="num">Bs ${moneyBob(r.max_case_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function priceCurveRows(rows) {
  return `<table class="gtable"><thead><tr><th>Precio</th><th>Prima</th><th>Pérdida</th><th>Utilidad</th><th>LR</th><th>Riesgo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${Math.round(Number(r.coverage_price_multiplier) * 100)}%</td><td class="num">Bs ${moneyBob(r.premium_bob)}</td><td class="num">Bs ${moneyBob(r.claim_loss_bob)}</td><td class="num ${Number(r.profit_bob || 0) >= 0 ? "sim-pos" : "sim-neg"}">Bs ${moneyBob(r.profit_bob)}</td><td class="num">${Number(r.loss_ratio || 0).toFixed(2)}</td><td class="num">${esc(r.risk_score)}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function renewalRows(rows) {
  return `<table class="gtable"><thead><tr><th>Cliente</th><th>Actual</th><th>LR</th><th>Churn</th><th>Recomendado</th><th>Nodo</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><b>${esc(r.client_name)}</b><div class="sim-sub">${esc(r.city)} · ${esc(r.broker)}</div></td><td class="num">Bs ${moneyBob(r.current_premium_bob)}</td><td class="num">${Number(r.loss_ratio || 0).toFixed(2)}</td><td class="num">${Math.round(Number(r.churn_probability || 0) * 100)}%</td><td class="num">${signedNumber(r.recommended_price_change_percent, 1)}%</td><td class="mono">${esc(r.renewal_node)}</td></tr>`).join("") || emptyTableRow(6)}
  </tbody></table>`;
}

function renewalTreeRows(rows) {
  return `<table class="gtable"><thead><tr><th>Nodo</th><th>Padre</th><th>Métrica</th><th>Valor</th><th>Decisión</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td><span class="mono">${esc(r.id)}</span><div class="sim-sub">${esc(r.title)}</div></td><td class="mono">${esc(r.parent || "root")}</td><td>${esc(r.metric || r.condition || "—")}</td><td>${esc(r.value_bob ? `Bs ${moneyBob(r.value_bob)}` : r.value ?? "—")}</td><td>${esc(titleCase(r.decision))}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function nodeRows(rows) {
  return `<table class="gtable"><thead><tr><th>Lado</th><th>Nodo</th><th>Hits</th><th>Pérdida</th><th>Utilidad</th></tr></thead><tbody>
    ${rows.map((r) => `<tr class="gtr"><td>${esc(r.side)}</td><td><span class="mono">${esc(truncate(r.node_id, 48))}</span><div class="sim-sub">${esc(truncate(r.title || "", 70))}</div></td><td class="num">${esc(r.hit_count)}</td><td class="num">Bs ${moneyBob(r.loss_bob)}</td><td class="num">Bs ${moneyBob(r.profit_bob)}</td></tr>`).join("") || emptyTableRow(5)}
  </tbody></table>`;
}

function emptyTableRow(cols) {
  return `<tr><td colspan="${cols}" class="sm">Sin filas para esta selección.</td></tr>`;
}

function simSelect(id, label, rawOptions, selected, extraClass = "") {
  const options = rawOptions.map((item) => typeof item === "object" ? item : { value: item, label: item === "all" ? "Todos" : titleCase(item) });
  return `<label class="sim-field ${extraClass}"><span>${esc(label)}</span><select id="${id}">
    ${options.map((o) => `<option value="${esc(o.value)}" ${String(selected || "all") === String(o.value) ? "selected" : ""}>${esc(o.label)}</option>`).join("")}
  </select></label>`;
}

function bindSimulationControls() {
  $("#sim-run").addEventListener("click", runSimulationFromUi);
  $("#sim-reset").addEventListener("click", async () => {
    state.simulation.filters = { engine: "all", age_min: "", age_max: "", cities: "", brokers: "", business_types: "", vehicle_makes: "", policy_types: "", claim_causes: "" };
    state.simulation.controls = { ...DEFAULT_SIM_CONTROLS };
    state.simulation.candidate_id = "growth_sandbox";
    state.simulation.tab = "cases";
    state.simulation.showFilters = false;
    state.simulation.result = null;
    await go("simulation");
  });
  $("#sim-candidate").addEventListener("change", (e) => {
    state.simulation.candidate_id = e.target.value;
    const candidates = state.cache.simulationCandidates || [];
    const active = candidates.find((c) => c.candidate_id === e.target.value) || candidates[0] || {};
    state.simulation.controls = { ...DEFAULT_SIM_CONTROLS, ...(active.overlays || {}) };
    const edits = $("#sim-overlay-edits");
    if (edits) edits.innerHTML = simulationOverlayRows(active);
    const desc = $("#sim-candidate-desc");
    if (desc) desc.textContent = active.description || "";
    const levers = $(".sim-levers");
    if (levers) levers.outerHTML = simulationLeverPanel(simulationEffectiveControls(active));
    bindSimulationLeverControls();
    runSimulationLive();
  });
  const more = $("#sim-morefilters");
  if (more) more.addEventListener("click", () => {
    state.simulation.showFilters = !state.simulation.showFilters;
    const panel = $("#sim-extra-filters");
    if (panel) panel.classList.toggle("hidden", !state.simulation.showFilters);
    more.setAttribute("aria-expanded", String(state.simulation.showFilters));
    more.textContent = state.simulation.showFilters ? "Ocultar filtros" : "Más filtros de cohorte";
  });
  $$(".sim-tabs [data-simtab]").forEach((b) => b.addEventListener("click", () => {
    state.simulation.tab = b.dataset.simtab;
    $$(".sim-tabs [data-simtab]").forEach((x) => x.classList.toggle("active", x === b));
    const body = $("#sim-detail-body");
    if (body) body.innerHTML = simulationActiveTable(state.simulation.result);
  }));
  bindSimulationLeverControls();
}

async function runSimulationFromUi() {
  const btn = $("#sim-run");
  btn.disabled = true;
  btn.classList.add("loading");
  collectSimulationFormState();
  try {
    state.simulation.result = await runSimulationPayload({
      filters: simulationApiFilters(state.simulation.filters),
      candidate_id: state.simulation.candidate_id,
      controls: state.simulation.controls
    });
    state.simulation.insightsResult = null;
    go("simulation");
    toast("Simulación ejecutada");
  } catch {
    toast("No se pudo ejecutar la simulación", true);
  } finally {
    btn.disabled = false;
    btn.classList.remove("loading");
  }
}

function collectSimulationFormState() {
  state.simulation.filters = {
    engine: $("#sim-engine")?.value || "all",
    age_min: $("#sim-age-min")?.value || "",
    age_max: $("#sim-age-max")?.value || "",
    cities: $("#sim-city")?.value || "",
    brokers: $("#sim-broker")?.value || "",
    business_types: $("#sim-business")?.value || "",
    vehicle_makes: $("#sim-make")?.value || "",
    policy_types: $("#sim-policy")?.value || "",
    claim_causes: $("#sim-cause")?.value || ""
  };
  state.simulation.candidate_id = $("#sim-candidate")?.value || state.simulation.candidate_id;
  const nextControls = { ...(state.simulation.controls || {}) };
  $$("[data-sim-control]").forEach((el) => {
    const key = el.dataset.simControl;
    if (!key) return;
    nextControls[key] = el.type === "range" || el.type === "number" ? Number(el.value) : el.value;
  });
  state.simulation.controls = nextControls;
}

let simulationLiveTimer;
function bindSimulationLeverControls() {
  $$("[data-sim-control]").forEach((el) => {
    el.addEventListener("input", () => {
      collectSimulationFormState();
      const label = el.closest(".sim-lever")?.querySelector("b");
      if (label) label.textContent = liveControlLabel(el.dataset.simControl, state.simulation.controls[el.dataset.simControl]);
      clearTimeout(simulationLiveTimer);
      simulationLiveTimer = setTimeout(runSimulationLive, 260);
    });
    el.addEventListener("change", () => {
      collectSimulationFormState();
      clearTimeout(simulationLiveTimer);
      simulationLiveTimer = setTimeout(runSimulationLive, 80);
    });
  });
}

function liveControlLabel(key, value) {
  if (key === "coverage_notice_days_limit") return `${Number(value).toFixed(0)} días`;
  if (key === "renewal_price_change_percent") return `${Number(value).toFixed(0)}%`;
  if (key === "coverage_replacement_threshold") return `${Number(value).toFixed(0)}%`;
  return `${Math.round(Number(value) * 100)}%`;
}

async function runSimulationLive() {
  collectSimulationFormState();
  try {
    state.simulation.result = await runSimulationPayload({
      filters: simulationApiFilters(state.simulation.filters),
      candidate_id: state.simulation.candidate_id,
      controls: state.simulation.controls
    });
    const summary = $("#sim-summary-wrap");
    if (summary) summary.innerHTML = simulationSummary(state.simulation.result);
    const risk = $("#sim-risk-wrap");
    if (risk) risk.innerHTML = simulationRiskLab(state.simulation.result);
    const body = $("#sim-detail-body");
    if (body) body.innerHTML = simulationActiveTable(state.simulation.result);
    state.simulation.insightsResult = null;
  } catch {
    toast("No se pudo recalcular la simulación", true);
  }
}

function simulationApiFilters(filters) {
  const out = { engine: filters.engine || "all" };
  if (filters.age_min) out.age_min = Number(filters.age_min);
  if (filters.age_max) out.age_max = Number(filters.age_max);
  for (const key of ["cities", "brokers", "business_types", "vehicle_makes", "policy_types", "claim_causes"]) {
    if (filters[key] && filters[key] !== "all") out[key] = [filters[key]];
  }
  return out;
}

/* ---------- boot ---------- */
async function init() {
  $("#back-btn").addEventListener("click", () => go(DEFAULT_ROUTE));
  $(".brand").addEventListener("click", () => go(DEFAULT_ROUTE));
  window.addEventListener("hashchange", () => {
    const route = routeFromHash();
    go(route);
  });
  renderNav();
  await loadCore();
  go(routeFromHash());
}
init();
