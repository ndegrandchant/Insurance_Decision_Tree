# Inteligencia Screens Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the three overlapping "Inteligencia" screens into two sharpened modules — Supervisión ("now", absorbing the old Insights tables) and Simulación ("what-if", scenario-first) — each following a shared hero → KPI row → grouped-bands layout.

**Architecture:** Pure frontend change to a vanilla-JS SPA (`platform/frontend/public/app.js`) plus a small CSS addition (`styles.css`). No backend/API changes: same endpoints (`/api/supervision`, `/api/simulations/run`, `/api/simulations/candidates`, `/api/simulations/filters`) and same row-renderer functions. The Insights route is deleted and its table renderers are re-called from inside Supervisión, fed by a baseline `/api/simulations/run` call. Simulación keeps live recalc but hides levers/filters behind one disclosure and collapses 8 tabs into 4 views.

**Tech Stack:** Vanilla JS (no framework/build), template-string rendering, plain CSS. Dev server: `python platform/backend/dev_server.py` → serves on http://127.0.0.1:8765.

**Verification note (per repo CLAUDE.md):** This repo verifies against behavior, **not** a unit-test suite. Each task's verification is done by running the dev server and inspecting the rendered screens in the browser preview (snapshot/screenshot), confirming data renders and nothing 404s. Do **not** add a JS test framework.

---

## File Structure

- `platform/frontend/public/app.js` — all logic/markup. Sections touched:
  - `MODULES` array (lines ~22-27): remove the `insights` entry, sharpen `simulation`/`supervision` descriptions.
  - `state.simulation` / `state.supervision` (lines ~290-299): drop `insightsResult`, add `baseline` to supervision.
  - `VIEWS.insights` (lines ~3742-3760): delete.
  - `VIEWS.supervision` + `supervisionLayout` (lines ~3762-3798): rewrite for hero + 3 bands + dual data load.
  - `VIEWS.simulation` + `simulationLayout` + `simulationControls` (lines ~3723-3863): scenario-first, collapsed levers.
  - `SIM_TABS` + `simulationTabs` + `simulationActiveTable` (lines ~3925-3961): 8 tabs → 4 views.
  - `simulationRiskLab` (lines ~3975-4000): split — keep "Riesgo en vivo" card; move price/renewal cards into a new view renderer `simulationPriceRenewalView`.
  - `insightsLayout` (lines ~4026-4036): delete after its tables are relocated.
  - `bindSimulationControls` (lines ~4128-4168) + `runSimulationFromUi`/`runSimulationLive` (lines ~4170-4257): drop `insightsResult` references; ensure new view ids bind.
- `platform/frontend/public/styles.css` — append `.hero-kpi` and `.band-head` styles.

---

## Task 1: Reduce nav to two modules and sharpen descriptions

**Files:**
- Modify: `platform/frontend/public/app.js:22-27` (MODULES), `:290-299` (state)

- [ ] **Step 1: Remove the Insights nav entry and sharpen the two remaining descriptions**

In the `MODULES` array, replace the three Inteligencia entries (currently `simulation`, `supervision`, `insights`) with just these two:

```js
  { id: "simulation", name: "Simulación",        icon: "~", group: "Inteligencia", status: "ready",
    desc: "Qué pasa si cambias una regla o precio: elige una versión candidata y mide el impacto antes de lanzarla." },
  { id: "supervision", name: "Supervisión",      icon: "⌁", group: "Inteligencia", status: "ready",
    desc: "Cómo está la cartera hoy: riesgo, clientes, severidad, dónde se pierde dinero y cola de renovación." }
```

Delete the entire `insights` object literal from `MODULES` (the `{ id: "insights", ... }` entry).

- [ ] **Step 2: Update state — drop insightsResult, add supervision.baseline**

Replace the `simulation` state block's `insightsResult: null,` line by removing it, and replace `supervision: { result: null }` with:

```js
  supervision: { result: null, baseline: null }
```

So `state.simulation` ends at `result: null` with no `insightsResult`, and `state.supervision` carries both `result` and `baseline`.

- [ ] **Step 3: Verify the app still boots with two modules**

Start the dev server (`python platform/backend/dev_server.py`) and load http://127.0.0.1:8765. Expected: the "Inteligencia" nav group shows exactly two items (Simulación, Supervisión); no Insights item. Console has no errors. (`VIEWS.insights` still exists at this point — that's fine; it's just unreachable from nav. It is removed in Task 4.)

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/public/app.js
git commit -m "Reduce Inteligencia nav to Supervisión + Simulación, sharpen descriptions"
```

---

## Task 2: Add shared hero + band-header CSS and helper renderers

**Files:**
- Modify: `platform/frontend/public/styles.css` (append at end)
- Modify: `platform/frontend/public/app.js` (add two helpers near `tableCard`, ~line 4038)

- [ ] **Step 1: Append CSS for the hero card and band headers**

Add to the end of `styles.css`:

```css
/* ---------- Inteligencia shared spine: hero + band headers ---------- */
.hero-kpi {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 22px 26px;
  border-radius: 16px;
  background: var(--surface, #12151b);
  border: 1px solid var(--border, #232a36);
  margin-bottom: 18px;
}
.hero-kpi .hero-label { font-size: 13px; letter-spacing: .04em; text-transform: uppercase; opacity: .7; }
.hero-kpi .hero-value { font-family: "Fraunces", serif; font-size: 44px; line-height: 1.05; font-weight: 600; }
.hero-kpi .hero-sub { font-size: 13px; opacity: .75; }
.hero-kpi.is-ok   { border-color: #2e6f4e; }
.hero-kpi.is-warn { border-color: #8a6d1f; }
.hero-kpi.is-bad  { border-color: #8a2f2f; }
.hero-kpi .hero-tag { align-self: flex-start; margin-top: 4px; }

.band-head {
  display: flex;
  align-items: baseline;
  gap: 10px;
  margin: 26px 0 12px;
}
.band-head h2 { font-size: 16px; margin: 0; }
.band-head .band-hint { font-size: 12px; opacity: .65; }
```

- [ ] **Step 2: Add `heroKpi` and `bandHead` helpers in app.js**

Immediately above `function tableCard(title, rowsHtml) {` (~line 4038), add:

```js
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
```

- [ ] **Step 3: Verify helpers load without error**

Reload http://127.0.0.1:8765. Expected: no console errors (the helpers are defined but not yet called — this just confirms valid syntax).

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/public/app.js platform/frontend/public/styles.css
git commit -m "Add shared hero-kpi and band-header helpers + styles"
```

---

## Task 3: Rebuild Supervisión (hero + 3 bands, absorbing Insights tables)

**Files:**
- Modify: `platform/frontend/public/app.js:3762-3798` (`VIEWS.supervision`, `supervisionLayout`)

- [ ] **Step 1: Rewrite `VIEWS.supervision` to load both data sources**

Replace the whole `VIEWS.supervision = async function () { ... };` block (lines ~3762-3777) with:

```js
VIEWS.supervision = async function () {
  if (!state.supervision.result || !state.supervision.baseline) {
    const [result, baseline] = await Promise.all([
      supervisionPayload(),
      runSimulationPayload({})
    ]);
    state.supervision.result = result;
    state.supervision.baseline = baseline;
  }
  setTopbar(
    "Supervisión",
    "Cómo está la cartera hoy: riesgo, clientes, severidad y dónde se pierde dinero.",
    `<button class="btn btn-primary" id="supervision-refresh">Actualizar ahora</button>`
  );
  $("#view").innerHTML = supervisionLayout(state.supervision.result, state.supervision.baseline);
  $("#supervision-refresh").addEventListener("click", async () => {
    $("#supervision-refresh").disabled = true;
    const [result, baseline] = await Promise.all([supervisionPayload(), runSimulationPayload({})]);
    state.supervision.result = result;
    state.supervision.baseline = baseline;
    go("supervision");
  });
};
```

- [ ] **Step 2: Rewrite `supervisionLayout` to hero + KPI row + 3 bands**

Replace the whole `function supervisionLayout(result) { ... }` block (lines ~3779-3798) with:

```js
function supervisionLayout(result, baseline) {
  const s = result?.summary || {};
  const t = result?.tables || {};
  const b = baseline?.tables || {};
  const riskTone = Number(s.risk_score || 0) > 55 ? "warn" : "ok";
  return `<div class="supervision-page">
    ${heroKpi(
      "Risk score de la cartera",
      esc(s.risk_score || 0),
      `LR ${Number(s.loss_ratio || 0).toFixed(2)} · frecuencia ${Number(s.accident_frequency || 0).toFixed(2)}`,
      riskTone,
      riskTone === "warn" ? "vigilar" : "estable"
    )}
    <section class="kpis sim-kpis">
      <div class="kpi is-info"><span class="kpi-label">Clientes activos</span><span class="kpi-value">${esc(s.active_clients || 0)}</span><span class="kpi-sub">${esc(s.claim_count || 0)} reclamos observados</span></div>
      <div class="kpi is-warn"><span class="kpi-label">Cash-out exposure</span><span class="kpi-value">Bs ${moneyBob(s.cashout_exposure_bob)}</span><span class="kpi-sub">salida monetaria en nodos</span></div>
      <div class="kpi is-info"><span class="kpi-label">Severidad promedio</span><span class="kpi-value">Bs ${moneyBob(s.avg_severity_bob)}</span><span class="kpi-sub">por reclamo (mock)</span></div>
      <div class="kpi is-info"><span class="kpi-label">Reclamos observados</span><span class="kpi-value">${esc(s.claim_count || 0)}</span><span class="kpi-sub">en la ventana actual</span></div>
    </section>

    ${bandHead("Riesgo ahora", "estado operativo de la cartera viva")}
    <section class="supervision-grid">
      ${tableCard("Alertas de riesgo", alertRows(t.risk_alerts || []))}
      ${tableCard("Salud por cliente", clientHealthRows(t.client_health || []))}
      ${tableCard("Frecuencia de accidentes", frequencyRows(t.accident_frequency || []))}
      ${tableCard("Severidad por causa", severityRows(t.severity || []))}
    </section>

    ${bandHead("Por qué y dónde se pierde", "diagnóstico sobre el árbol actual (datos mock trazables)")}
    <section class="supervision-grid">
      ${tableCard("Pérdida por nodo de reclamo", lossRows(b.loss_nodes || []))}
      ${tableCard("Cash-out nodes", cashoutRows(t.cashout_nodes || []))}
      ${tableCard("Cláusulas con fricción broker", clauseRows(b.broker_clause_friction || []))}
      ${tableCard("Rutas más tocadas", nodeRows(b.node_hits || []))}
    </section>

    ${bandHead("Renovaciones", "cola priorizada por vencimiento")}
    <section class="supervision-grid">
      ${tableCard("Cola de renovación", renewalRows(t.renewal_queue || []))}
    </section>
  </div>`;
}
```

- [ ] **Step 3: Verify Supervisión renders hero + all relocated tables**

Reload, navigate to Supervisión. Use the browser preview snapshot. Expected:
- A large hero "Risk score de la cartera" card at top with color accent.
- A 4-card KPI row.
- Three labeled bands: "Riesgo ahora" (4 tables), "Por qué y dónde se pierde" (4 tables incl. Pérdida por nodo / Fricción broker / Rutas — the old Insights content), "Renovaciones" (1 table).
- The "Actualizar ahora" button reloads without console errors.
- No 404s in the network panel.

- [ ] **Step 4: Commit**

```bash
git add platform/frontend/public/app.js
git commit -m "Rebuild Supervisión: hero + KPI row + 3 labeled bands, absorbing Insights tables"
```

---

## Task 4: Make Simulación scenario-first and collapse 8 tabs into 4 views

**Files:**
- Modify: `platform/frontend/public/app.js` — `VIEWS.simulation` (~3723), delete `VIEWS.insights` (~3742-3760), `simulationLayout` (~3800), `simulationControls` (~3835), `simulationLeverPanel`/filters disclosure default, `SIM_TABS` (~3925), `simulationActiveTable` (~3944), `simulationRiskLab` (~3975), delete `insightsLayout` (~4026), `bindSimulationControls`/`runSimulationFromUi`/`runSimulationLive` (drop `insightsResult`).

- [ ] **Step 1: Delete the `VIEWS.insights` block**

Remove the entire `VIEWS.insights = async function () { ... };` block (lines ~3742-3760). The route is gone from nav (Task 1) and `go()` already falls back to the default route for unknown hashes, so `#insights` deep-links degrade gracefully.

- [ ] **Step 2: Default the levers/filters to collapsed (scenario-first)**

In `state.simulation` (~line 290), `showFilters: false` already exists for cohort filters. Add a sibling flag for the lever disclosure by changing the block to include:

```js
    showFilters: false,
    showLevers: false,
    result: null
```

(Remove the old `insightsResult: null` line if not already removed in Task 1.)

- [ ] **Step 3: Wrap the lever panel + cohort filters in one "Ajustar palancas" disclosure**

In `simulationControls(meta, candidates)` (~line 3835), the function currently returns a control row, the candidate description, the extra-filters block, `simulationLeverPanel(controls)`, and the `<details class="sim-changes">`. Replace the trailing portion — from the `<div class="sim-extra-filters ...">` block through `${simulationLeverPanel(controls)}` — so both the cohort filters and the levers live inside a single collapsible panel. Replace that span with:

```js
    <details class="sim-adjust" id="sim-adjust" ${state.simulation.showLevers ? "open" : ""}>
      <summary>Ajustar palancas y cohorte</summary>
      <div class="sim-extra-filters" id="sim-extra-filters">
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
    </details>
    <details class="sim-changes">
      <summary>Qué cambia esta versión candidata</summary>
      <div class="sandbox-edits" id="sim-overlay-edits">${simulationOverlayRows(active)}</div>
      <p class="sim-footnote">El overlay no edita los archivos fuente; compara una versión candidata gobernada contra el árbol actual.</p>
    </details>`;
```

Then in the control row at the top of the same function, remove the old `sim-morefilters` disclosure button (the `<button class="sim-disclose" id="sim-morefilters" ...>` line), since the new `<details class="sim-adjust">` replaces it. The control row should now contain only the candidate select and engine select.

- [ ] **Step 4: Remove the now-dead `sim-morefilters` handler**

In `bindSimulationControls` (~line 4153), delete the block:

```js
  const more = $("#sim-morefilters");
  if (more) more.addEventListener("click", () => { ... });
```

The native `<details>` element handles open/close, so no JS is needed. (Optional: persist state by adding, after the levers bind, `const adj = $("#sim-adjust"); if (adj) adj.addEventListener("toggle", () => { state.simulation.showLevers = adj.open; });`)

- [ ] **Step 5: Add a hero to `simulationLayout` and rename the lab wrap**

In `simulationLayout(meta, candidates, result)` (~line 3800), insert the hero immediately after `<section class="sim-intro">...</section>` and before `<section class="card sim-controls">`. The hero shows Δ utilidad (the headline impact). Add this line right after the `sim-intro` section's closing `</section>`:

```js
    ${simulationHero(result)}
```

And add the `simulationHero` function just above `simulationLayout`:

```js
function simulationHero(result) {
  const d = result?.summary?.delta || {};
  const profit = Number(d.profit_bob || 0);
  const tone = profit > 0 ? "ok" : profit < 0 ? "bad" : "info";
  return heroKpi(
    "Impacto en utilidad (Δ)",
    signedMoneyBob(d.profit_bob),
    `${esc(d.outcome_changed_count || 0)} casos cambian de resultado · riesgo ${signedNumber(d.risk_score || 0, 1)}`,
    tone,
    profit >= 0 ? "favorable" : "adverso"
  );
}
```

Wrap it so live recalc can refresh it: change the hero insertion to `<div id="sim-hero-wrap">${simulationHero(result)}</div>`.

- [ ] **Step 6: Collapse `SIM_TABS` from 8 to 4 views**

Replace the `SIM_TABS` array (~line 3925) with:

```js
const SIM_TABS = [
  { id: "cases",  label: "Casos cambiados" },
  { id: "losses", label: "Dónde se pierde" },
  { id: "price",  label: "Precio y renovación" },
  { id: "nodes",  label: "Nodos recorridos" },
];
```

- [ ] **Step 7: Rewrite `simulationActiveTable` for the 4 views**

Replace `function simulationActiveTable(result) { ... }` (~line 3944) with:

```js
function simulationActiveTable(result) {
  const tables = result?.tables || {};
  switch (state.simulation.tab) {
    case "losses":
      return `${bandHead("Pérdida por nodo")}${lossRows((tables.loss_nodes || []).slice(0, 12))}
              ${bandHead("Cash-out nodes")}${cashoutRows((tables.cashout_nodes || []).slice(0, 18))}`;
    case "price":
      return simulationPriceRenewalView(result);
    case "nodes":
      return nodeRows((tables.node_hits || []).slice(0, 12));
    case "cases":
    default: {
      const cases = tables.cases || [];
      const ordered = cases.filter((r) => r.outcome_changed).concat(cases.filter((r) => !r.outcome_changed));
      return caseRows(ordered.slice(0, 15));
    }
  }
}
```

- [ ] **Step 8: Split `simulationRiskLab` — keep "Riesgo en vivo", move price/renewal into the price view**

Replace `function simulationRiskLab(result) { ... }` (~line 3975) with a version that returns only the "Riesgo en vivo" card:

```js
function simulationRiskLab(result) {
  const risk = result?.risk || {};
  const candidate = risk.candidate || {};
  const delta = risk.delta || {};
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
  </section>`;
}
```

Then add the new price/renewal view renderer just below it:

```js
function simulationPriceRenewalView(result) {
  const renewal = result?.renewal || {};
  return `<section class="sim-lab-grid">
    <section class="card">
      <div class="card-head"><h2>Curva de precio cobertura</h2><span class="badge">profit max</span></div>
      <div class="card-body">${priceCurveBars(result?.price_curve || [])}</div>
    </section>
    <section class="card">
      <div class="card-head"><h2>Renovaciones</h2><span class="badge badge-ok">mejor ${esc(renewal.best_price_change_percent ?? "--")}%</span></div>
      <div class="card-body">${renewalCurveBars(renewal.curve || [])}</div>
    </section>
  </section>
  ${bandHead("Árbol de renovación")}${renewalTreeRows(renewal.tree || [])}`;
}
```

- [ ] **Step 9: Drop `insightsResult` references and delete `insightsLayout`**

- In `runSimulationFromUi` (~line 4181) delete the line `state.simulation.insightsResult = null;`.
- In `runSimulationLive` (~line 4253) delete the line `state.simulation.insightsResult = null;`.
- In `bindSimulationControls`'s reset handler (~line 4134) the `state.simulation.tab = "cases";` line stays valid (still a real view). Leave it.
- Delete the entire `function insightsLayout(result) { ... }` block (~lines 4026-4036) — its tables now live in Supervisión.

- [ ] **Step 10: Verify Simulación scenario-first flow**

Reload, navigate to Simulación. Browser preview snapshot/screenshot. Expected:
- The "Impacto en utilidad (Δ)" hero shows directly under the intro, colored by sign.
- The control area shows only the candidate-version select and engine select; levers and cohort filters are hidden inside a closed "Ajustar palancas y cohorte" disclosure.
- Opening the disclosure reveals sliders + cohort filters; moving a slider live-updates the hero, the KPI summary, the "Riesgo en vivo" card, and the active table (no full reload, no console errors).
- The Detalle de resultados segmented control shows exactly 4 buttons: Casos cambiados · Dónde se pierde · Precio y renovación · Nodos recorridos. Each renders its data; "Precio y renovación" shows both curves + the renewal tree.
- Changing the candidate version updates the description and re-runs.

- [ ] **Step 11: Commit**

```bash
git add platform/frontend/public/app.js
git commit -m "Make Simulación scenario-first: hero impact, collapsed levers, 4 result views; remove Insights"
```

---

## Task 5: Cross-screen verification pass

**Files:** none (verification only)

- [ ] **Step 1: Full click-through against the running dev server**

With `python platform/backend/dev_server.py` running, in the browser preview confirm all of:
- Nav "Inteligencia" group shows only Supervisión and Simulación.
- Direct-loading `#insights` in the URL hash lands on the default route (no blank screen, no console error).
- Supervisión: hero + 4 KPIs + 3 bands all populate; "Actualizar ahora" refreshes both data sources.
- Simulación: hero + scenario-first controls + 4 views all work; live recalc works; "Restablecer" resets to a closed-levers, "Casos cambiados" default.
- Network panel shows only the expected endpoints (`/api/supervision`, `/api/simulations/run`, `/api/simulations/candidates`, `/api/simulations/filters`) — no 404s.

- [ ] **Step 2: Grep for orphaned references**

Run a search to confirm no dangling references remain:

```bash
grep -n "insightsResult\|insightsLayout\|VIEWS.insights\|sim-morefilters" platform/frontend/public/app.js
```

Expected: no matches.

- [ ] **Step 3: Capture before/after screenshots for the user**

Use the browser preview to screenshot both finished screens (Supervisión and Simulación) and share them with the user as proof.

- [ ] **Step 4: Final commit if any cleanup was needed**

```bash
git add platform/frontend/public/app.js platform/frontend/public/styles.css
git commit -m "Cleanup: remove orphaned Insights references after Inteligencia redesign"
```

(Skip if Step 2 found nothing and no edits were made.)

---

## Self-Review (completed during planning)

- **Spec coverage:** Nav→2 modules (Task 1) ✓; shared hero/KPI/band spine (Task 2 + used in 3 & 4) ✓; Supervisión hero=Risk score, 4 KPIs, "Riesgo ahora" / "Por qué y dónde se pierde" / "Renovaciones" bands fed by `/api/supervision` + baseline `/api/simulations/run` (Task 3) ✓; Simulación scenario-first, hero=Δ utilidad, 3-KPI summary (existing `simulationSummary` retained), collapsed levers, 4 views with price/renewal lab moved into view 3 (Task 4) ✓; non-goals (no API/no test-framework/relocate-not-delete renderers) honored ✓; verification via dev server, not unit tests ✓.
- **Placeholder scan:** No TBD/TODO; every code step shows full code.
- **Type/name consistency:** `heroKpi`/`bandHead` defined in Task 2 and called in Tasks 3-4; `simulationHero`, `simulationPriceRenewalView` defined and referenced consistently; `state.supervision.baseline` set in Task 1 and consumed in Task 3; `SIM_TABS` ids (`cases`/`losses`/`price`/`nodes`) match the `simulationActiveTable` switch.
- **Note:** `simulationSummary` (the existing 3-4 KPI delta row) is intentionally kept as the supporting KPI row under the new hero — the spec's "KPI row (3)" is satisfied by it; no rename needed.
