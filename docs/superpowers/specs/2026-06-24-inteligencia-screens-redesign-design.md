# Inteligencia screens redesign — design

**Date:** 2026-06-24
**Scope:** `platform/frontend/public/app.js` (+ small additions to `styles.css`)
**Goal:** Make the three "Inteligencia" screens (Simulación, Supervisión, Insights) clearer:
objectives obvious, simple to operate, still insightful.

## Decisions locked with the user

- **Primary user:** mixed — the screens must serve live monitoring, change decisions, and
  storytelling/demo at once.
- **Structure:** merge three modules into **two**. Supervisión owns "now" and absorbs the
  Insights tables; Simulación owns "what-if". **Insights leaves the nav** as a standalone module.
- **Simulación operating model:** scenario-first with progressive disclosure (pick a candidate
  version → read the impact → optionally open levers/tables).
- **Headline style:** clean, well-labeled KPIs with one clear primary metric per screen. **No
  narrative verdict sentences.**
- **Chosen approach:** B — restructure both screens around a shared hierarchy spine. Not a
  full rebuild (no new design system), not just a light reshuffle.

## Non-goals / constraints

- **No backend or API changes.** Same endpoints (`/api/supervision`, `/api/simulations/run`,
  `/api/simulations/candidates`), same row-renderer functions (`alertRows`, `clientHealthRows`,
  `cashoutRows`, `frequencyRows`, `severityRows`, `renewalRows`, `lossRows`, `clauseRows`,
  `nodeRows`, `caseRows`).
- **No new design system.** Reuse existing `.kpi`, `.card`, `.seg`, `.gtable-wrap` classes.
  Add only a small amount of CSS for the hero card and band headers.
- Mock-data badges and source-citation behavior stay exactly as they are (CLAUDE.md accuracy
  rules — no inventing or smoothing logic).
- No table renderer or data field is deleted; Insights content is **relocated**, not removed.

## Shared spine (both screens)

Every screen reads top-to-bottom as:

1. **Hero metric** — one large number that defines the screen, with a one-word qualifier and
   good/watch/bad color. New small CSS class (e.g. `.hero-kpi`).
2. **Supporting KPI row** — 3–4 existing `.kpi` cards.
3. **Optional depth** — detail tables grouped under labeled **band headers** so no table floats
   without context. Heaviest controls live behind one disclosure.

## Screen 1 — Supervisión ("now")

- **Hero:** Risk score (sub: `LR {loss_ratio} · freq {accident_frequency}`).
- **KPI row (4):** Clientes activos · Cash-out exposure (BOB) · Severidad promedio (BOB) ·
  Reclamos observados.
- **Band "Riesgo ahora"** — source `/api/supervision` (`result.tables.*`):
  Alertas de riesgo · Salud por cliente · Frecuencia de accidentes · Severidad por causa.
- **Band "Por qué y dónde se pierde"** — source baseline `/api/simulations/run` with empty
  payload (`result.tables.*`): Pérdida por nodo · Cash-out nodes · Cláusulas con fricción broker ·
  Rutas más tocadas.
- **Band "Renovaciones":** Cola de renovación (from supervision `tables.renewal_queue`).
- **Data flow:** on load `Promise.all([supervisionPayload(), runSimulationPayload({})])`; store
  both in `state.supervision` (e.g. `state.supervision.result` and
  `state.supervision.baseline`). A single "Actualizar" button refreshes both and re-renders.

## Screen 2 — Simulación ("what-if", scenario-first)

- **Step 1 — Escenario:** candidate-version select + engine select are the visible primary
  controls; the candidate description states what the version changes.
- **Hero:** Δ utilidad (BOB), colored by sign — the headline impact.
- **KPI row (3):** Δ pérdida reclamos · Δ riesgo (sub: loss-ratio + outcome-changed) ·
  Casos con resultado cambiado, shown against cohort N (`selection.selected_count`).
- **Step 2 — Ajustar palancas (collapsed by default):** the 9 levers (`simulationLeverPanel`)
  **and** the cohort "más filtros" block live inside one disclosure. Closed by default so the
  default Simulación experience is "pick a scenario, read the impact."
- **Resultados — 4 named views** (replacing the current 8 `SIM_TABS`):
  1. **Casos cambiados** → `caseRows` (changed-first ordering, as today).
  2. **Dónde se pierde** → `lossRows` (loss_nodes) + `cashoutRows` (cashout_nodes).
  3. **Precio y renovación** → price curve + renewal curve + `renewalTreeRows`.
  4. **Nodos recorridos** → `nodeRows` (node_hits).
- The "Riesgo en vivo / curva de precio / renovaciones" lab cards (`simulationRiskLab`) move
  under the relevant view (price/renewal content into view 3) to cut top-of-page noise, rather
  than sitting above the fold.

## Files touched

- `platform/frontend/public/app.js` — `MODULES` list, remove `VIEWS.insights`, rewrite
  `VIEWS.supervision` + `supervisionLayout`, rewrite `VIEWS.simulation` + `simulationLayout`,
  adjust `SIM_TABS`/`simulationActiveTable`, add hero/band helper renderers.
- `platform/frontend/public/styles.css` — `.hero-kpi` and band-header styles; minor layout.

## Verification (per CLAUDE.md — verify against source/behavior, not unit tests)

- Run the dev server and confirm both screens render with live mock data, all relocated tables
  still populate, and the single refresh button reloads both data sources on Supervisión.
- Confirm no Insights route/links remain and nothing 404s.
- Confirm Simulación defaults to collapsed levers and the 4 views each show their data.
