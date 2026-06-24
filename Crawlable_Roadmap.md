# Crawlable Decision Tree — Roadmap (this approach)

> **What this is.** Your Approach-1 master sequence (`A-PROJECT-TODO-SEQUENCE.md`), transferred onto *this* approach — the accuracy-first extraction in `representation/`. Same end goal, same load-bearing order, but re-authored for a different and higher-fidelity starting point. Where this approach is already ahead of where the Approach-1 plan assumed, the phase **shrinks to "complete/reconcile" instead of "build."**
>
> **End goal (unchanged).** An underwriter or agent inputs risk attributes and gets back eligibility, routing, authority, pricing, and deductibles — **with a full audit trail to the manual rule *and* the governing contract clause** — built from the Automotores manual + cláusulas, generalizable to other manuals, eventually exportable to DMN.
>
> **The one strategic decision up front (see §Skeleton at the bottom):** do **not** design a new skeleton. Pour *this approach's data* into *Approach-1's node schema*. **Their skeleton, our data and fidelity.**
>
> Conventions: **GATE** = don't start until true. ⚠ = do before the thing it precedes.

---

## ▶ STATUS DASHBOARD — as of 2026-06-24

> **This roadmap was authored pre-platform.** Since then: (a) Phases 0–1 + Tasks S1/S2 are **built and verified**; (b) a collaborator ("santi") merged a **platform** (FastAPI backend + `insurance_engine/` + React frontend + Postgres) that **consumes this graph at runtime** — it does not replace it; (c) santi also added a **coverage adjudication engine** (`crawlable/graph_coverage/`) modeling 2 of 7 policy Secciones; (d) regression harnesses now exist (`troubleshoot testing/` UW golden snapshot + santi's `smoke.py`). The badges below and the rewritten Phases 3/5/5-COV/6/7 reflect that reality.
>
> **Legend:** ✅ done · 🔶 partial · ⬜ not started · ⏸️ deferred (trigger noted) · ❌ superseded / out-of-scope (genuinely re-scoped, not just unfinished).

| Phase / Task | Status | Where it actually stands |
|---|---|---|
| **P0** prove core on a thin slice | ✅ **done** | crawler resolves real cases with an audit trail (`crawler/run_cases.py`) |
| **P1** executable spine + validator | ✅ **done** | 61 nodes; `validate.py` GREEN; engine-aware `[11]` (D-P9) |
| **S1** fidelity fields on every node | ✅ **done** | every node carries `source_quote` + `source.version` + first-class `conflict` |
| **S2** brackets → DMN decision tables | ✅ **done** (UW) | real decision tables w/ inclusivity + `hit_policy` + boundary→ledger |
| **P2** rulings ledger (operate) | 🔶 **partial** | 18 seeded OPEN (incl. santi's 2 coverage rulings); **0 resolved** — loop built, unexercised (underwriter-gated) |
| **P3** fact registry + adapter seam | 🔶 **partial / re-scoped** | registry ✅ (55 facts); adapter is now santi's **AI extraction behind a confirmed-facts wall** → re-scoped to "audit, never fabricate" |
| **P4** clause linking (both directions) | 🔶 **partial** | **O16:** ~2/84 forward edges; reverse + glossary unbuilt |
| **P5** full crawler + regression | 🔶 **partial** | 5 processes built; **`masiva`/`automática` = out-of-scope ✅ decided**; **O3** stage-chaining ⬜; coverage/rating golden snapshot ⬜ |
| **P5-COV** full-policy coverage adjudication *(NEW — santi's engine)* | 🔶 **partial** | **2 of 7 Secciones** modeled (III + V; ~31/152 clauses wired) — **5 Secciones unbuilt** |
| **P6** human layer | ❌ **superseded** | santi's React frontend + DB `human_task`/`chat` tables ARE the human layer; Obsidian vault **dropped** |
| **P7** manual-integrity report | 🔶 **partial** | findings exist + partly operationalized by santi's DB governance; a business-readable view remains |
| **P8** standardization (engine + profile) | ⏸️ **deferred** | trigger: a real 2nd manual (premature now); santi's `EngineSpec` is a partial down-payment |
| **P9** DMN export | ⏸️ **deferred** | trigger: a real DMN consumer (S2 already DMN-aligned internally) |
| **P10** per-manual loop | ⏸️ **deferred** | depends on P8 |

**To FINISH THE CORE (recommended build order):** **O3** stage-chaining → **O12b** wire the source-anchored rating tables → **P5-COV** coverage golden snapshot + extend to the other 5 Secciones → **O16** clause edges. Then **operate** P2 (underwriter rulings). Everything else is superseded (P6), trigger-gated (P8/P9/P10), or low (P7).

---

## What this approach already has (the starting inventory)

| Asset | File | Means we are AHEAD on… |
|---|---|---|
| 84 quote-anchored rules | `representation/underwriting_manual/rules.json` | Phase 1 fidelity (every rule carries verbatim trigger) |
| 24 provenance-tagged tables | `…/tables.json` (`verbatim_table` vs `parameter_digest`) | Phase 3 tables |
| 4 verified decision trees | `…/decision_trees.json` + `decision_trees_view.html` | Phase 1 skeleton seed |
| **Full cláusulas bundle** | `representation/clausulas_generales/` — 152 clauses verbatim + `base_policy.json` | **Phase 4 — most of it already done, not cite-driven** |
| Conflicts captured **as data** | `document.json`, `conflict_flag`, `band_boundary_flag`, flota thresholds | **Phase 2 — both sides already recorded** |
| Cross-document map | `representation/linkage.json` (match-confidence) | Phase 4 forward edges, partly built |
| Two-layer verification | `verification_report.md` (mechanical 100% + full semantic pass) | Phase 1/7 trust |
| Reusable method | `Manual Prompt.md` | **Phase 8/10 engine** |
| **Platform (runtime consumer)** *(santi)* | `platform/` (backend + `insurance_engine/` + frontend + db), `deploy/` | **a running app that CONSUMES this graph — reinforces P1/S1/S2, supersedes P6** |
| **Coverage engine** *(santi)* | `crawlable/graph_coverage/`, `coverage_validate.py` | **new P5-COV (2/7 Secciones)** |
| **Regression harnesses** | `troubleshoot testing/` (UW golden snapshot, Layers A–D) + `platform/backend/scripts/smoke.py` | **P5.2 / O4 infrastructure already exists** |

The net effect: Approach-1's roadmap front-loaded extraction breadth. **Here that work largely exists** — so the center of gravity is *proving + finishing the core* (P5/P5-COV), with standardization (P8+) correctly deferred.

---

## PHASE 0 — Prove the core on a thin vertical slice ✅ DONE
*GATE: none. The de-risking joint, pulled to the front.*

✅ **Done.** One hand-grafted path (Standard eligibility gate → exclusions incl. a liftable antique-vehicle → `refer_process` to Case UW → outcome + the `@tables` high-value branch) runs through a minimal crawler with escalation-with-context and an audit trail; 3 cases resolve (`crawlable/crawler/run_cases.py`, `CONVERSION_RECORD.md` §2). **Milestone met:** the architecture resolves real cases with audit trails.

---

## PHASE 1 — Graft the executable spine onto the fidelity layer ✅ DONE
*GATE: Phase 0 proved the shape.*

✅ **Done.** The Approach-1 node schema (`router|gate|condition|authority|referral|accumulator|terminal`; outcomes `eligible|conditional_eligible|decline|refer_authority|refer_process|refer_line`) extended with fidelity fields; `rules.json` + `decision_trees.json` converted into **61 nodes**; the validator (`validate.py`) enforces the full "executes deterministically" contract and is **GREEN** (now engine-aware over the shared ledger — D-P9). The verbatim is on every node (S1).

### ▶ Task S1 — fidelity fields on every node ✅ DONE
Every node emits `source_quote` (verbatim trigger), `source.version`, and a first-class `conflict` object pointing to its `rulings/` ledger entry. *Done:* no node lacks a `source_quote`; every flagged conflict resolves to a ledger id (validator check [1]/[9]/[11]).

### ▶ Task S2 — brackets/bands as DMN decision tables ✅ DONE (UW side)
Siniestralidad bands, VA brackets, franquicia-by-plaza are decision tables with explicit `lower`/`upper` + `lower_inclusive`/`upper_inclusive` + `hit_policy`; ambiguous edges (50/51, 60, 250) → ledger, never a silent inequality (`tables_rating.json`, `tables_renovacion.json`; validator check [8]). *Done:* no band boundary is ambiguous; Phase 9 can serialize with zero redesign. **(Coverage-side rating/limits not yet table-modeled — see P5-COV.)**

---

## PHASE 2 — Rulings ledger (operate the loop) 🔶 PARTIAL
*GATE: any node depending on a contested rule is untrustworthy until ruled.*

✅ **Built:** a portable, versioned `rulings/` ledger seeded with every captured conflict (now **18** OPEN, including santi's 2 coverage rulings), each with both source texts + a non-binding recommendation; the crawler escalates and **never hand-patches** the graph; `validate.py [11]` enforces every ruling is anchored.

🔶 **Not done (the operational loop is unexercised):** **0 of 18 resolved.** The "underwriter rules → flip to `ruled` → regenerate from `representation/` + `rulings/`" loop has never been run end-to-end. This is **operate-work, not build-work** — the resolutions are underwriter decisions. *Recommended:* exercise the loop **once** (resolve one clean ruling → regenerate → confirm determinism) to prove it; the rest waits on underwriters.

**Key items needing a human ruling (already identified, not to be guessed):** renovación Consumer-vs-pesados overlap; band inclusivity (50/51, 60, 250); clause 2023 prevailing text; alcoholemia 0.50 vs 0.70; router precedence; the "vehículo pesado" definition; **+ santi's** extraterritorialidad 30/90-day (RUL-CG-2027) and talleres eligibility-vs-free-choice (RUL-CG-2045-2053).

---

## PHASE 3 — Fact registry & adapter seam 🔶 PARTIAL / RE-SCOPED
*GATE: trusted graph.*

✅ **3.1 Done:** `facts.json` — 55 typed, sourced facts with `on_missing`, each auditable to its verbatim sentence; `sync_facts.py` regenerates the impact index.

🔶 **3.2 RE-SCOPED (reality changed).** The roadmap planned the supply side as a *stub contract* ("an adapter may map-and-flag-missing, **never fabricate**"). **santi's platform already implements a real supply side: OpenAI fact extraction** (`platform/engine/insurance_engine/ai_parser.py`, `nl.py`) — vision/audio/text. This is exactly the fabrication risk the "never fabricate" rule was written to forbid, so the seam is now an **audit target, not a design task**. The good news: the invariant is *already enforced in code* — extracted facts carry `confirmed: false`, and `services._assert_confirmed()` **blocks any unconfirmed AI fact from reaching the engines** (proven by `smoke.py`). **Re-scoped P3 deliverable:** keep the AI layer strictly advisory and **audit the confirmed-facts wall** (no path lets an unconfirmed/AI-fabricated fact drive an outcome) — not "define a contract."

---

## PHASE 4 — Clause linking, both directions 🔶 PARTIAL
*GATE: Phases 1–3.*

The full bundle is already extracted (152 clauses + `base_policy.json`), so the costly part is done. What remains is **edge completeness**:

🔶 **4.1 Forward (rule → clause) — O16:** only **~2 of 84** rules carry a clause edge (`linkage_edges.json`), so `governing_clauses` on outcomes is sparse. This is its own work, **not** fixed by the Phase-2 rulings loop, and affects clause *citations*, not decision logic.
⬜ **4.2 Reverse (clause → section):** a free inversion of 4.1 — unbuilt (blocked on 4.1).
⬜ **4.3 Definitional concordance** (the "vehículo pesado" canary, from `base_policy.json → definiciones`): unbuilt — would prove the manual is not self-contained.

---

## PHASE 5 — Full crawler + regression 🔶 PARTIAL
*GATE: trusted resolvable graph (1–3) + clause links (4).*

🔶 **5.1 Crawler across processes.** ✅ Built & node-ified: **Standard, Case-UW, Licitaciones, Renovación, Retroactividad** (router + `hit_policy`/`on_no_match` everywhere).
❌ **`masiva` & `automática` — OUT-OF-SCOPE for node-ification (decided 2026-06-24, source-faithful).** The source defines **no branchable logic** for them: **Automática §3.2** explicitly states *"no aplican autoridades de suscripción"* (closed "enlatado" products, predefined T&C — only product-membership, which is the router trigger); **Masiva §3.4** is governance/profile prose (R-080–R-085: risk profile, annual-revalidation cadence, single-party authority reservation — no exclusion list, no authority matrix, no bands). Corroborated by `rule_buckets.json` (R-060/R-080 = `partial_router`; R-081–085 = `reference`; none `node_converted`). **The router stubs are correct and sourced; node-ifying would invent logic the manual disclaims.** (Action: record in `NOT_CONVERTED.md` so the absence reads as deliberate.)
⬜ **O3 — stage-chaining (the real core gap):** lifted/eligible outcomes terminate **before** re-entering authority/rating, so those stages are unreachable for such cases. Faithful end-to-end resolution needs every eligible/conditional path to continue through later stages.

🔶 **5.2 Regression.** ✅ **Infrastructure already exists and passes:** the UW **golden snapshot** (`troubleshoot testing/`, 43 cases, Layers A–D — outcome+path+caveat drift) and santi's **`smoke.py`** (40 exact-value assertions across UW/coverage/rating/simulation). The deterministic core is cleanly separable from the OpenAI layer (env kill-switches + the confirmed-facts wall), so it is **regressable as-is**.
⬜ **Missing to complete (O4):** (a) a **coverage + rating golden snapshot** (small — the snapshot machinery exists, just needs a blessed corpus); (b) the **correctness-vs-underwriter ground-truth corpus** (the real O4 milestone — *human-gated*); (c) optional pytest/CI wiring (today both harnesses are manual `python3` scripts).

---

## PHASE 5-COV — Full-policy coverage adjudication 🔶 PARTIAL  *(NEW — added by santi's platform; not in the original plan)*
*GATE: the coverage engine exists and validates (`coverage_validate.py` GREEN).*

santi added a **second engine** (`crawlable/graph_coverage/`, run via the same `ArtifactGraphEngine`) that adjudicates *policy coverage* — covered / not-covered / refer-adjuster — with its own node schema (`coverage-grant`/`exclusion-check`/`clause-modifier`/…) and `facts_coverage.json`.

🔶 **Status: 2 of 7 Secciones modeled.** **III Daños Propios** + **V Robo Parcial** (35 nodes, 32 facts), plus shared Obligaciones-en-siniestro and base Exclusiones Generales. **~31 of 152 clauses** are wired to a runtime effect.
⬜ **Gap — it CANNOT check every clause's effect today.** Secciones **I (Pérdida Total Accidente), II (Pérdida Total Robo), IV (HMACC-AMITT), VI (Responsabilidad Civil), VII (Accidentes Personales)** have **zero** coverage nodes; ~141 endorsement clauses have no runtime consumer (only CG-2027/2045/2053 are wired). 
**Build:** additive content on the existing engine/schema/validator (no new architecture) — roughly **2–4× the current coverage graph** + a coverage golden snapshot + coverage stress layers (the UW engine has Layers A–E; the coverage engine has *structural* validation only). **Worth building to the degree full-policy coverage adjudication is a product goal** — it is half of the end-goal ("deductibles/coverage with an audit trail to the governing clause").

---

## PHASE 6 — Human layer ❌ SUPERSEDED (re-scoped 2026-06-24)
*Original GATE: clause notes (4) + working crawler (5).*

❌ **Superseded — do not build the planned Obsidian vault / `decision_trees_view.html` extension.** santi shipped a **React frontend** (`platform/frontend/`) + FastAPI backend + Postgres **`human_task` / `chat_conversation` / `proposal` / `approval`** tables — that **is** the human/escalation/decision surface the roadmap envisioned, and building a parallel vault would duplicate it.

**Residual (optional, only if wanted):** if rule→clause **backlinks** are desired, generate them as **data the existing frontend renders** (a free by-product of the Phase-4 reverse edges) — never a separate app, never hand-written notes.

---

## PHASE 7 — Manual-audit capability 🔶 PARTIAL
*GATE: validator (1.4) + rulings ledger (2).*

🔶 The raw findings exist and are verified (`verification_report.md` + `document.json → structural_inconsistencies`), and are **partly operationalized** by santi's DB (`ledger_entry`, `human_task`) + `registry.py` (`issue_flags()`, `ledger_entries()`). **Remaining:** promote them into a **business-readable "manual integrity report" / frontend view** (per section: overlaps/gaps/contradictions + plain-language "why this blocks automation"). **Low priority** — near-free, do it when a stakeholder needs the report. Resolution still flows **only** through the rulings ledger (no in-tree authoring).

---

## PHASE 8 — Standardization (engine + profile) + bind `Manual Prompt.md` as the engine ⏸️ DEFERRED
*GATE: do NOT start until Phases 1–7 give a proven baseline. **Trigger to start: a real 2nd manual.***

⏸️ **Deferred — premature now** (generalizing before a second manual violates the project's own simplicity rule). The target is unchanged: a manual-agnostic engine + a per-manual **profile** (clause prefix, process taxonomy, routing keywords, `normalize_clause_id()`, ledger location, *Definiciones* location), with `Manual Prompt.md` bound as the **extraction engine prompt (Opus 4.8 max)**.
**Down-payment already made:** santi's `catalog.py` `EngineSpec`/`ENGINE_SPECS` already externalizes artifact roots, fact paths, allowed sections, and outcome labels per engine — **build P8 on that abstraction, don't design anew.** The remaining hardcode is `validate.py`'s LBC vocab (`PROCESSES`/`LINES`/`COMMITTEES`, flagged in-file) + `lbc_auto_rating.py`'s constants.

---

## PHASE 9 — DMN export ⏸️ DEFERRED (held — template only)
*GATE: do NOT build until standardization reveals the full node-type set. **Trigger: a real DMN consumer (e.g. Camunda).***

⏸️ **Deferred.** A one-way serializer; every node type gets an export rule + round-trip test; never auto-pick a hit policy; flagged/unruled nodes must not export as settled logic. Because **Task S2 already modeled bracket/band tables as DMN decision tables**, this is mostly **serialization, not redesign** — so it costs little and pays off only when something downstream actually consumes DMN.

---

## PHASE 10 — Per-manual loop ⏸️ DEFERRED
*Trigger: Phase 8 done + a real 2nd manual.*

⏸️ **Deferred** (depends on P8/P9). Once standardized, each new manual is: author the **profile** → run the `Manual Prompt.md` engine on Opus 4.8 max section-by-section → hand-validate → record rulings → complete forward clause edges (invert for free) → glossary/concordance → crawler/regression → extend DMN for any new node type. No code edits per manual.

---

## §Skeleton — extend Approach-1's, don't build a new one  *(unchanged — still valid)*

**No new skeleton. Use Approach-1's node schema as the spine; feed it this approach's data.** Reasons:
- Approach-1's schema is **proven and DMN-aligned**; its validator already caught real gaps (router overlap).
- Its 7 node types **cover everything in this approach's UW data** — no node type our richer data needs that theirs can't express. *(Note: santi's **coverage** engine introduced its own additional node-type set — `coverage-grant`/`exclusion-check`/`clause-modifier`/`limit-deductible`/`document-duty` — for the contract-text domain; that is an additive sibling schema, validated by `coverage_validate.py`, not a replacement of the UW skeleton.)*

Two deliberate extensions (tracked as Phase-1 tasks, both ✅ done): **S1** fidelity fields on every node; **S2** bracket/band logic as DMN decision tables.

**When a fresh skeleton *would* be worth it:** only if a later manual surfaces a node type the schema can't express. Re-evaluate then, per-node-type.

---

## §On Fable's ban — is Opus 4.8 max + `Manual Prompt.md` enough?  *(unchanged)*

**Yes, with high confidence — the artifacts in `representation/` are themselves the proof.** Everything here was built and verified on **Opus 4.8 (1M context)**. The fidelity is **method-driven** (mechanical extraction + two-layer verification), which is model-portable — so Phase 8/10 binds `Manual Prompt.md` to **Opus 4.8 max** as the engine and does not depend on Fable.
