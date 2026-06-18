# Crawlable Migration Notes — what to borrow from Approach 1 (and what not to)

> **Purpose.** When this approach (the verbatim, source-faithful representation in `representation/`) is later turned into a *crawlable* decision tree, some ideas from the earlier `Manual_Processor/Approach1` pipeline are worth importing wholesale. This file is the **curated** list. The bar is deliberately high: an item is listed under **BORROW** only if it is (a) genuinely excellent *and* (b) a true fit for our data. Anything that is merely "fine" or that fits their data better than ours is sent to **REDO** or **DON'T BORROW** — because going through the creative process again on our own terms is cheaper than inheriting a decision that doesn't fit.
>
> **One-line framing of each approach.** Approach 1 = an *executable, crawlable graph* (broad manual coverage, `evaluate` expressions, `@tables`, router, validation + tests). This approach = a *high-fidelity, audited representation* (both source documents, verbatim quotes on every node, conflicts encoded as data, two-layer verification). The migration goal is: **keep our fidelity layer, graft their execution spine.**

---

## Part A — BORROW (exceptional *and* truly fits our data)

### A1. Fact ontology + `needs_facts` per node — *the crawl's input contract*
**Theirs.** Every node lists `needs_facts: [...]` (the variables it reads), and a `new_facts` glossary defines each one (`is_heavy`, `design_modified_capacity`, …). The router does the same at the top.
**Why it's excellent.** A crawler cannot run without knowing *what to ask*. `needs_facts` turns each node into a self-describing step: collect these facts → evaluate. The glossary is the ontology that keeps fact names consistent across nodes.
**Why it fits our data.** Our trees encode the same conditions in prose ("siniestralidad histórica es nula", "Valor Asegurado ≥ Bs. 1.050.000") but never name the underlying variables. The facts are *already implicit in our quotes* — we just haven't lifted them out.
**Graft.** Add `needs_facts[]` to each of our tree nodes; create one `facts.json` glossary (typed: enum / number / bool / money_bob), each fact tagged with the verbatim source phrase it was derived from. This is additive — it does not touch our verbatim layer.

### A2. `@tables.*` references *inside* conditions + role-typed table buckets
**Theirs.** Conditions reference parameters by name (`valor_asegurado >= @tables.limits.valor_max_standard_bob`; `importer in @tables.allowlist_importadores`), and `tables.json` is bucketed by kind (limits, allowlists, rate_tables, deductible_tables, authority_matrix, …) with `applies_when` selectors inside rate rows.
**Why it's excellent.** It separates *volatile parameters* from *stable logic*. Re-tariffing or raising a limit edits a table, not the graph. References are resolvable and testable.
**Why it fits our data.** We already have a `tables.json` (24 tables) and already reference it — but at *rule* granularity (`table_ref: TBL-RENOV-MIN`), not *inside conditions*. Our bracket tables (siniestralidad bands, VA brackets, franquicia-by-plaza) and our limits (Bs. 1.050.000, Bs. 700.000, Bs. 70.000) are exactly their `limits`/`deductible_tables` shape.
**Graft.** Let conditions reference `@tables.<id>.<key>`. Re-classify our tables by **role** (see the Tables decisions in `verification_report.md`/the review): `scalar_limit` (used in `evaluate`), `allowlist` (membership), `bracket_map` (intervals — needs boundary inclusivity), `matrix_lookup` (authority), `rate_output` (resolved at a leaf, not a branch condition). Keep our `verbatim_table` vs `parameter_digest` provenance tag — theirs lacks it.

### A3. Enumerated outcome vocabulary + referral targets
**Theirs.** Outcomes are a fixed set — `eligible / conditional_eligible / decline / refer_authority / refer_process / refer_line` — and referrals carry a typed target (`referral_target: {kind: process|line|committee|external, name}`).
**Why it's excellent.** A crawler needs to *do* something deterministic at each leaf and to *traverse* to other graphs. Enumerated outcomes make leaves machine-actionable; referral targets make the graph connected.
**Why it fits our data.** Our outcomes are prose ("NO elegible por Estándar (evaluar otro procedimiento)"), but the *targets are already there in the text*: X10 routes rent-to-petroleum → Case UW; X01/X02 → Case UW; retroactividad → **Comité de Riesgos y Siniestros** (their `kind: committee`), > 30 días → Operaciones. We just haven't enumerated them.
**Graft.** Adopt the 6-outcome enum + `referral_target`. Convert our prose outcomes; point referrals at real node/tree ids (`T-ELIG-ESTANDAR` → `T-ELIG-CASEUW`) so the crawler can walk Standard→Case UW.

### A4. The `exception{}` object for liftable exclusions
**Theirs.** "Excluded unless" is modeled as `exception: {liftable, authority_required, conditions[], on_lift_outcome, no_lift_outcome, cases[]}`, where `cases[]` handles multi-branch lifts (their antique-vehicle node has `renovacion` and `nueva` cases with `applies_when`).
**Why it's excellent.** It's the single cleanest primitive for the most common shape in this manual — a prohibition with a documented escape hatch and the authority needed to use it.
**Why it fits our data — almost exactly.** Our `lift_condition` (X07, X09) and `lift_conditions[]` (X12 a/b) map 1:1 onto their `exception`/`cases`. Their `authority_required` is our "Autoridad de Subgerentes Comerciales y Gerentes de Sucursal." This is the lowest-friction borrow we have.
**Graft.** Rename our lift fields to their `exception` schema; keep our verbatim text per condition as a sibling.

### A5. `version` stamp on every node *and* every table
**Theirs.** Every `source` block carries `version: "4.0"`; tables too.
**Why it's excellent (for *this* manual specifically).** Our single most prominent conflict is the version identity (cover/changelog "4.0" vs headers/info-table "3.0"). Stamping every datum with the version it was read under is the honest way to live with that until it's resolved — and it future-proofs against the next revision.
**Graft.** Add `version` to our `source` objects (we currently carry pdf_page/printed_page/section but not version). Near-zero cost, high audit value.

### A6. `needs_human_review` + a review queue + resolve/export UI
**Theirs.** Unresolved items carry `needs_human_review: true` + `review_reason`; the UI lists them, lets an underwriter type a ruling, and **exports/imports resolutions** as JSON.
**Why it's excellent.** It turns "we found an ambiguity" into an *operational workflow*: the conflict becomes a task an underwriter closes, and the resolution is captured as data.
**Why it fits our data.** We have *richer* conflict objects than they do (both texts of clause 2023; the renovación overlap; band boundaries; the four "flota" thresholds). What we lack is their operational loop. The two compose perfectly: our conflicts are the queue's content; their UI is the closer.
**Graft.** Feed our `flag` / `conflict` / `band_boundary_flag` objects into a review queue with the same resolve→export pattern. A resolved conflict should write back a chosen branch so the crawler can then run deterministically.

### A7. Two modeling primitives that fit our 4.x logic: `accumulator` and the `"all"` process tag
**Theirs.** An `accumulator` node type for rate adjustments that *stack* (renewal surcharges), and a `"all"` process value for cross-cutting 4.x/5.x policies rather than duplicating them per process.
**Why it fits.** Our renovación bands *are* rate-stacking (accumulator). Our retroactividad and renovación live in §4.x and apply across processes — exactly their `"all"` case. These are small, well-judged primitives that match our data's shape.

### A8. The validation discipline: typed contract + `validate.py` + golden fixtures + deterministic tests
**Theirs.** `schema.py` (NODE_TYPES, OUTCOMES, REFERRAL_KINDS, required fields, `is_param_ref`), `validate.py`, a golden fixture, and `test_deterministic.py`.
**Why it's excellent / fits.** It's the executable-graph analog of our verification harness. Once our trees become executable, our current mechanical checks (anchors, quotes, table values) should be joined by *graph* checks: every fact in an `evaluate` is defined in the ontology; every `@tables.x` resolves; every `referral_target` exists; every outcome ∈ enum; no unreachable leaf; bracket tables have no undefined/overlapping edges unless flagged.
**Graft.** Add a typed node contract + a graph-validator as CI. (One improvement on theirs — see C-note: cover more than one section with golden fixtures.)

### A9. Pipeline layering: per-section files + a flattened render graph + a canonical graph
**Theirs.** `graph/<section>.json` (units) → `graph.json` (render-flattened) → `decision_tree.json` (canonical).
**Why it fits.** Clean separation of unit / view / canonical. As our 4 trees grow toward full process coverage, splitting per-section (with a built render artifact) keeps each unit reviewable and anchored.

---

## Part B — BORROW THE IDEA, REDO THE IMPLEMENTATION (don't inherit their version)

### B1. Machine-evaluable conditions — yes; their custom `evaluate` DSL — reconsider
**Theirs.** Conditions are strings in a bespoke mini-language (`&&`, `||`, `in`, `not in`, `any_true(items)`, `@tables.`).
**The idea to keep.** Conditions must be machine-evaluable, not prose. Non-negotiable for crawlability.
**Why redo the implementation.** A custom DSL needs a bespoke interpreter you must write, secure, and test; it's not portable and not standardly verifiable. Our condition shapes are simple — boolean / comparison / set-membership / interval. **Decide the language deliberately:** JSONLogic or CEL for the boolean/comparison/membership nodes; and seriously evaluate **DMN decision tables** for the *bracket/band* logic specifically — DMN's explicit hit-policy and per-row boundary semantics directly solve the inclusivity ambiguity that is currently undefined in *both* approaches (the 50/51, 60, 250 edges). Picking a standard buys you an off-the-shelf evaluator and test tooling.

### B2. A process router — yes; an *inferred* precedence presented as logic — no
**Theirs.** `router.json` selects the process (standard/automatica/case_underwriting/masiva/licitaciones) with an ordered `branches` list — and honestly marks `needs_human_review` because the manual never states precedence.
**The idea to keep.** A crawl needs an entry point; the router is that entry point.
**Why redo carefully.** Our `decisions.md` D2 deliberately *declined* to invent a master router because the source defines no global precedence. Their router shows the honest compromise: **build it, but model the precedence as an explicit unresolved gate** (a `needs_human_review` resolution the underwriter must close), not as an asserted order. Borrow the structure with our flag-first discipline, so we don't ship inferred precedence as if it were sourced.

---

## Part C — DON'T BORROW (our way is the better data decision; redo creatively)

- **C1. Interpretation-as-canonical at the node.** Their decision node stores the paraphrase (`title`/`reason`/`evaluate`) as the canonical condition; the verbatim lives upstream in `sections.json` at *section* granularity, reachable only by a section/page lookup. **Keep our discipline:** verbatim trigger quote pinned on *each node* (`source_quote`), interpretation tagged derived. Sentence-level pinning is the thing that makes node-level audit possible — don't trade it away for compactness.
- **C2. Overlapping populations modeled as clean separate nodes.** Their renovación (4.1) splits Consumer (order 11) and Pesados/motos (order 12) as if disjoint, missing that a Consumer-segment pesado is *double-covered with contradictory outputs* (55% → "mismas tasas" vs "+17%"). **Keep our conflict-first modeling** (`T-RENOVACION.conflict_flag`). When in doubt, encode both sides as data; don't let the schema's neatness erase a source contradiction.
- **C3. Dual table source.** They keep both inline `parameter_tables` per section and a global `tables.json`. **Pick one canonical** (global, ID'd, versioned); any inline copy is a build cache, never a second source of truth.
- **C4. Section-granularity anchoring as the only anchor.** Fine for their execution goal, insufficient for ours. **Keep sentence-level trigger quotes** as the primary anchor; section/page is the secondary coordinate.

---

## Part D — illustrative target node (sketch only — not to build now)

The graft of "their spine + our fidelity," for one of our existing eligibility conditions. This is documentation of the intended shape, not an instruction to build.

```jsonc
{
  "id": "standard.elig.high_value",
  "type": "condition",
  "process": "standard",
  "order": 24,
  "needs_facts": ["valor_asegurado", "importer"],          // A1
  "branches": [                                            // A3 + B1 (language TBD)
    { "when": "valor_asegurado >= @tables.limits.valor_max_standard_bob", "outcome": "decline" },
    { "when": "valor_asegurado > @tables.limits.valor_validacion_importador_bob && importer in @tables.allowlist_importadores", "outcome": "eligible" },
    { "when": "valor_asegurado > @tables.limits.valor_validacion_importador_bob && importer not in @tables.allowlist_importadores", "outcome": "refer_authority" }
  ],
  "source_quote": "Vehículos que tengan un Valor Asegurado igual o mayor a Bs. 1.050.000,00 … para aquellos vehículos que superen los Bs. 700.000 se deberá validar que estos hayan sido importados y comercializados por …",  // C1 — OUR verbatim, kept on the node
  "source": { "section": "3.1.2", "pdf_page": 12, "printed_page": 5, "version": "4.0" },  // A5
  "needs_human_review": true,                              // A6
  "review_reason": "La fuente enlaza ambas condiciones en una sola viñeta; la lectura >=1.050.000 excluye / >700.000 valida-importador es derivada de la sintaxis.",
  "_derived": true
}
```

The point of the sketch: **every machine field (their contribution) sits beside a verbatim `source_quote` and an honest `needs_human_review` (our contribution).** Executable *and* auditable — which is what neither approach is on its own today.
