# crawlable/node_schema.md — the authoritative Part-2 node schema

> **Status:** authoritative. Written once at the start of Part 2 and treated as the
> contract every `crawlable/graph/*.json` node and `crawlable/tables.json` table obeys.
> "Their skeleton, our data": the spine is **Approach-1's** node schema
> (`reference_approach1/schema.py` + `graph/3.1.2.json`), reproduced as-is; the only
> additions are the two required fidelity extensions, **Task S1** and **Task S2**
> (`Crawlable_Roadmap.md` §1.5–1.6, §Skeleton). No new skeleton was designed.
>
> Anything here that governs *machinery* obeys CLAUDE.md §3 (minimum structure). Anything
> that governs *fidelity* (S1, conflicts, verbatim) is maximal by mandate.

---

## 0. Expression language (the one decision made from the data)

Two machine forms, chosen by condition shape — see `decisions.md` D-P1 for the full
rationale and the per-shape inventory that drove it.

- **Node conditions** (`evaluate`, `branches[].when`, `exception.conditions/applies_when`)
  are **JSONLogic** — structured JSON, never strings. The data's whole condition universe
  is closed and shallow (boolean · numeric compare · enum/set membership · and/or/not ·
  any/all over an explicit listed set). JSONLogic covers it exactly, is mechanically
  walkable by the validator (every `var` and every `@tables.*` ref is a node in a tree,
  not a token to parse), needs no bespoke interpreter, and serialises to DMN FEEL unary
  tests in Phase 9.
- **Bracket / band logic** (siniestralidad bands, VA brackets, franquicia-by-plaza) is a
  **DMN-style decision table** (Task S2) — data, not an inequality chain inside an
  expression. Rows carry explicit `lower` / `upper` + `lower_inclusive` / `upper_inclusive`
  + a table-level `hit_policy`. This is the only place boundary inclusivity could drift, so
  it is the only place it is made explicit; ambiguous edges become a flagged row → ledger.

### 0.1 The supported JSONLogic operator set (closed — the evaluator implements exactly these)
```
var            { "var": "fact_id" }                 // reads a fact OR an @tables.* value
==  !=         { "==": [a, b] }                      // strict; no type coercion games
>  >=  <  <=   { ">": [a, b] }                       // numeric only (operands must be numbers)
and or         { "and": [c1, c2, ...] }              // boolean
!  (not)       { "!": c }
in             { "in": [needle, [h1, h2, ...]] }     // SET membership; 2nd arg ALWAYS an array
!in            { "!": { "in": [needle, [...]] } }    // "not in" = negated in
```
- `in`'s second operand is **always** an array (a literal list or an injected
  `@tables.<id>.values`). It is never used for substring matching — that ambiguity is
  banned so a membership test can never silently become a string test.
- `>,>=,<,<=` operands must resolve to numbers; comparing to a missing fact raises
  `MissingFact` (→ `on_missing`), never a coerced `0`/`null`.
- No arithmetic operator is in the set, because **no node condition in the source computes
  a value** — derived numeric definitions (e.g. the loss-ratio formula R-076) are recorded
  as data/notes, not as branch logic. If a future manual needs arithmetic in a condition,
  extend the set deliberately and re-validate; do not improvise.

### 0.2 `@tables.*` references
A condition may read a parameter table value as `{ "var": "@tables.<id>.<key>" }` (scalar)
or `{ "var": "@tables.<id>.values" }` (allowlist array). The crawler builds the evaluation
context as **facts ∪ flattened tables** (table values keyed under the `@tables.` prefix), so
JSONLogic `var` addresses both. The validator statically asserts every `@tables.*` path
resolves in `crawlable/tables.json`. Bracket/band tables are **not** referenced this way —
they are consumed by a `bracket_lookup` step (§5), never inlined into a condition.

---

## 1. Node — common fields

| Field | Req | Type / values | Notes |
|---|---|---|---|
| `id` | ✓ | string, dotted namespace | e.g. `standard.elig.heavy_over_8tn`. Unique across the whole graph. |
| `type` | ✓ | `router\|gate\|condition\|authority\|referral\|accumulator\|terminal` | Approach-1's 7 types, unchanged (`schema.py`). |
| `process` | ✓ | `standard\|automatica\|case_underwriting\|masiva\|licitaciones\|all\|null` | `null` only for `root.process_router`. `all` = cross-cutting 4.x/5.x policy. |
| `order` | ✓* | int | Evaluation order within a process/section. Eligibility nodes compose as an ordered filter: first node whose `evaluate` is true yields its outcome/exception; else fall through by `order`. Required on all nodes except `terminal`/`router`. |
| `title` | ✓ | string (derived) | Short human label. Tagged derived; never canonical. |
| `needs_facts` | ✓ | [fact_id] | Every fact the node reads. Must be defined in `facts.json`. The crawl's input contract (A1). |
| `evaluate` | – | JSONLogic | Single-predicate nodes (gate/referral/most conditions). A node has `evaluate` **xor** `branches`. |
| `branches` | – | [{`when`:JSONLogic, `outcome`, `target`?, `reason`?}] | Multi-way nodes (router, multi-outcome condition). Evaluated by `hit_policy`. |
| `outcome` | – | OUTCOME enum | For `evaluate`-style nodes that yield one outcome when true. |
| `referral_target` | – | {`kind`:`process\|line\|committee\|external`, `name`, `reason`} | Required when an outcome is `refer_*`. `name` of a `process` must be a real graph entry. |
| `exception` | – | see §3 | Liftable exclusions ("excluded unless…"). |
| `items` | – | [string] | Verbatim source terms for an `any-of` gate (§2, hard-exclusions). Annotation only; the executable form is the `evaluate` `or`. |
| `hit_policy` | ✓ on router/gate & any `branches` node | `unique\|first\|priority\|collect\|any` | DMN hit policy. See §4. |
| `on_no_match` | ✓ on router/gate | target id **or** OUTCOME | Exhaustiveness valve — never undefined. |
| `see_also` | – | [section/node id] | Cross-pointers (e.g. `["4.1","4.8"]`). Non-executable. |
| `note` | – | string | Source clarifications carried verbatim where short (e.g. the camión-vs-camioneta note). |

`OUTCOMES = {eligible, conditional_eligible, decline, refer_authority, refer_process, refer_line}`
(unchanged from `schema.py`).

---

## 2. Node types (semantics)

- **router** — selects a process. `branches` + `hit_policy` + `on_no_match`. Only `root.process_router`.
- **gate** — a pass/block check. Either an admitted-types gate (`evaluate` true ⇒ proceed,
  false ⇒ `on_no_match`) or an any-of hard-exclusion gate (`evaluate` = `or` over boolean
  facts, with `items` listing the verbatim terms; true ⇒ `outcome:decline`).
- **condition** — an eligibility/business test. `evaluate`+`outcome`, or `branches`, optionally
  with an `exception`.
- **referral** — routes elsewhere. `evaluate` true ⇒ `referral_target` (a `refer_*` outcome).
- **authority** — a `matrix_lookup` against an authority table (suscriptor → max vehiculos/valor).
- **accumulator** — a stacking rate adjustment (renovación surcharges). Carries `adjustment`
  `{target, type, table_ref}` pointing at a bracket/band table (S2). Does not itself end the crawl.
- **terminal** — a leaf outcome with no further traversal.

---

## 3. `exception{}` — liftable exclusions (A4)

Models "excluded unless …". Our `lift_condition` / `lift_conditions[]` map onto it 1:1.
```jsonc
"exception": {
  "liftable": true,
  "authority_required": ["subgerente_comercial","gerente_sucursal"] | null,
  "conditions": [ <JSONLogic>, ... ],          // ALL must hold to lift (single-case lift)
  "cases": [                                    // multi-branch lift (e.g. antiguo a/b)
    { "case": "renovacion",
      "applies_when": <JSONLogic>,
      "required_clauses": ["CG-2045", ...],     // clause ids the lift obliges (forward edge)
      "rating_rule": "…",                       // free text where the source states one
      "on_lift_outcome": "conditional_eligible",
      "source_quote": "…" },                    // S1 per case
    ...
  ],
  "on_lift_outcome": "conditional_eligible",
  "no_lift_outcome": "decline"
}
```
- A lift that depends on a contested clause (e.g. the antiguo "Nota Aclaratoria" that
  `linkage.json` marks `unmatched`) carries a `conflict` (§S1) on the case.
- `conditions` use the same JSONLogic + `@tables.*` rules as `evaluate`.

---

## 4. `hit_policy` + `on_no_match` (leg 3 — resolution)

`hit_policy` (DMN): `unique` (exactly one branch may match; >1 ⇒ overlap error or, when the
overlap is the source's own unresolved precedence, escalate→ledger), `first` (ordered, first
match wins), `priority` (match by listed output priority), `collect` (gather all), `any` (≥1
true ⇒ the shared outcome). The **router** uses `unique` with `on_no_match:standard`: 0
explicit triggers ⇒ default to Standard (sourced, R-010); exactly 1 ⇒ route; **>1 ⇒ the
unresolved cross-process precedence** ⇒ escalate citing `rulings/RUL-ROUTER-PRECEDENCE`
(D2 honoured — no invented order is shipped as logic).

`on_no_match` is mandatory on every router/gate: an input that lands nowhere routes to a
declared target/outcome, never to undefined.

---

## S1 — fidelity fields on EVERY node (Task S1)

These are the non-negotiable extension. **No emitted node may lack `source_quote` and
`source`.** A flagged conflict must resolve to a ledger id.

| Field | Req | Notes |
|---|---|---|
| `source_quote` | ✓ | The **verbatim** trigger sentence, copied character-for-character from `rules.json.quote_verbatim` / `decision_trees.json` (`excluded`/`admitted_types_quote`/`*_verbatim`) / `clause_texts/`. **Never paraphrased.** This is the C1 discipline: sentence-level pinning on the node itself. The semantic-fidelity pass (COVERAGE_REPORT dimension B) checks `evaluate` back against exactly this string. |
| `source` | ✓ | `{ section, pdf_page, printed_page, version }`. `printed_page = pdf_page − 7` for the manual; `null` for clauses (no printed numbers). |
| `source.version` | ✓ | The version **literally stamped on the page the quote is read from**. For every manual content page that is `"3.0"` (page headers + info table). The cover/changelog "4.0" discrepancy is **not** silently picked per node — it is one document-level conflict `RUL-MAN-VERSION`, pointed to by `graph/*.json` `_doc_conflicts`. Recording `3.0` per node is the literal truth at the read site; the conflict is preserved in the ledger. |
| `source.provenance` | – | For values lifted from a table: `verbatim_table` \| `parameter_digest` (carried from `tables.json`). |
| `conflict` | – (✓ if contested) | **First-class object, replaces the bare `needs_human_review` boolean.** See below. |
| `derived` | – | `true` if the structured reading involved judgment beyond restating the sentence (mirrors representation `_derived`/`flags`, e.g. the X15 high-value bullet). A `derived:true` node SHOULD carry a `conflict` or `review_reason`. |
| `_origin` | ✓ | Back-pointer to the exact source element this node was compiled from: `{ artifact: "decision_trees.json", path: "T-ELIG-ESTANDAR.exclusiones[0]", source_id: "X01" }` or `{ artifact:"rules.json", source_id:"R-012" }`. **This is the spine of the coverage manifest** — every source id maps to ≥1 node via `_origin`, or to a line in `NOT_CONVERTED.md`. |

### The `conflict` object
```jsonc
"conflict": {
  "status": "open",                       // open | ruled
  "ledger_ref": "rulings/RUL-CG-2023.md", // MUST exist; resolves a flagged conflict to a ruling
  "kind": "dual_text | undefined_boundary | overlap | derived_reading | cross_doc_tension | version_identity | threshold_variance | absent_code",
  "summary": "one line, neutral",
  "source_variants": [                    // both/all sides preserved verbatim — never collapsed
    { "label": "print_p51",  "quote": "…", "source": {…} },
    { "label": "print_p237", "quote": "…", "source": {…} }
  ],
  "recommended_resolution": null          // non-binding draft for the underwriter (per D-P2); null if none drafted
}
```
- `ledger_ref` is written **relative to `crawlable/`** (e.g. `rulings/RUL-X.md`), not relative
  to the referring file; the validator and crawler resolve it from the `crawlable/` root.
- When `status:"open"`, the crawler **does not pick a branch** at this node — it escalates
  (refer-to-human) with the node id, both texts, and `ledger_ref`. It never resolves.
- `recommended_resolution` is the only place a suggested answer may appear, it is clearly
  non-binding, and it lives in the **ledger entry**, mirrored here for convenience — never in
  the executable branch logic. The graph stays unresolved until the ledger entry flips to
  `ruled` and the graph is regenerated (never hand-patched — PROJECT_CONTEXT §9.4).

---

## S2 — bracket/band decision tables (Task S2) — defined in `crawlable/tables.json`

Tables are **role-typed** (A2). A table is consumed either as a value (`@tables.*` in a
condition) or by a `bracket_lookup`/`matrix_lookup` step — never as an inequality chain.

| `role` | shape | consumed by |
|---|---|---|
| `scalar_limit` | `{ value, unit }` | `@tables.<id>.value` in a condition |
| `allowlist` | `{ values:[…] }` | `@tables.<id>.values` in an `in` test |
| `bracket_map` | DMN decision table (below) | `bracket_lookup` (S2) |
| `matrix_lookup` | rows `{ key…, output… }` | `authority` node |
| `rate_output` | resolved value(s) at a leaf | `accumulator`/`terminal` |

Every table carries `source{section,pdf_page,printed_page,version}` + `provenance`
(`verbatim_table`/`parameter_digest`, carried from `representation/.../tables.json`).

### `bracket_map` (the S2 core)
```jsonc
{
  "id": "TBL-FRANQ-MOTO",
  "role": "bracket_map",
  "hit_policy": "unique",                 // unique => rows must partition the domain
  "input": "valor_asegurado",             // the fact looked up (or a tuple of inputs)
  "rows": [
    { "lower": 0, "upper": 35000,
      "lower_inclusive": true, "upper_inclusive": true,
      "output": { "franquicia_scl_lpz_tri_bob": 350, "franquicia_resto_bob": 350 },
      "source_quote": "Hasta Bs. 35.000,00 …" },
    …
  ],
  "boundary_conflicts": [                  // any undefined/overlapping edge — NEVER a silent <
    { "between_rows": [1,2], "edge": 70000,
      "kind": "overlap", "ledger_ref": "rulings/RUL-FRANQ-MOTO-OVERLAP.md" }
  ],
  "source": { … }, "provenance": "verbatim_table"
}
```
- `lower_inclusive` / `upper_inclusive` are **mandatory** on every row. There is no implicit
  open/closed convention.
- The 50/51 · 60 · 250 renovación edges and the moto-VA gap (21.000,00 → 21.000,01) and the
  franquicia overlap (>35k vs >70k) are recorded in `boundary_conflicts` → ledger. The
  `bracket_lookup` step, on a value that lands on such an edge, escalates rather than guessing.
- *Done (S2):* the validator confirms each `bracket_map` either partitions its domain under
  its `hit_policy` or has every gap/overlap edge listed in `boundary_conflicts` with a
  resolvable `ledger_ref`.

---

## §9.5 validator contract (what `crawlable/validate.py` enforces)

A graph is not done until every check passes:
1. Every node has `id` (unique), `type`∈types, `process`∈processes, `source`, **`source_quote`**, `_origin`.
2. Every `fact` named in any `needs_facts` / `evaluate` / `branches` / `exception` is defined in `facts.json`.
3. Every `@tables.<id>.<key>` resolves in `tables.json`.
4. Every `referral_target` (and every `branch.target`) names a real graph node/entry.
5. Every `outcome` ∈ OUTCOMES.
6. Every `router`/`gate` (and any `branches` node) has `hit_policy` + `on_no_match`.
7. No unreachable leaf; no `order` collision within a process.
8. Every `bracket_map`: rows partition the domain under `hit_policy`, OR each gap/overlap edge
   is in `boundary_conflicts` with a resolvable `ledger_ref`. No band boundary ambiguous unless flagged.
9. Every `conflict.ledger_ref` and every `boundary_conflicts[].ledger_ref` points to an
   existing `rulings/*` entry.
10. JSONLogic in every condition uses only the §0.1 operator set; `in`'s 2nd arg is an array.

This **extends** `verification_report.md` from "matches source" to "executes deterministically".
The semantic-fidelity pass (COVERAGE_REPORT dimension B) is separate and adversarial.

---

## Coverage Domain Extension (`graph_coverage/`)

Coverage graphs use the same fidelity fields and JSONLogic expression language, but are run by the
reusable platform `ArtifactGraphEngine` rather than the UW process crawler. The engine contract is
intentionally data-shaped so later manuals can reuse the skeleton:

```jsonc
{
  "id": "coverage.robo.scope",
  "type": "coverage-grant",
  "order": 222,
  "applies_to": ["robo_parcial"],
  "needs_facts": ["event_type"],
  "evaluate": { "!=": [ { "var": "event_type" }, "robo_partes" ] },
  "outcome": "not_covered",
  "source_quote": "la Aseguradora cubre el robo de partes y piezas del vehículo asegurado",
  "source": { "section": "Sección V Cláusula 1", "pdf_page": 35, "version": "101 - 910547 - 2017 09 400" },
  "_origin": { "artifact": "base_policy.json", "path": "secciones[4].text_file:Cláusula 1", "source_id": "seccion[5].clausula[1].cobertura_robo" }
}
```

Allowed coverage node types:

| type | meaning |
|---|---|
| `coverage-grant` | establishes whether the section grant/scope applies |
| `condition` | source-backed condition that may continue or terminate |
| `document-duty` | obligation/document requirement; missing/non-compliance is surfaced |
| `exclusion-check` | source-backed exclusion |
| `clause-modifier` | attached clause that changes reading/limits/duties |
| `limit-deductible` | limit, threshold, deductible, or indemnity rule |
| `terminal` | explicit final leaf |

Coverage outcome enum:

`{likely_covered, not_covered, conditionally_covered, partially_covered, missing_fact,
missing_document, refer_adjuster, refer_legal, conflict_escalation}`.

Coverage-specific required fields:

- `applies_to`: `["*"]` or coverage section ids. This is the reusable equivalent of UW `process`.
- `graph_version`: each coverage graph file declares version metadata (`engine`, line of business,
  product/slice, status, vigencia, source version, legal guardrail).
- `reference_elements`: non-executable source elements that still must be accounted for by the
  reconciliation manifest. This preserves forward-looking metadata/examples/pointers without
  forcing every sentence into a decision node.

Legal/claims guardrail: coverage output is **orientation, not a coverage determination**. Spanish
source wording remains canonical; ambiguity, causation, valuation, fraud, or source conflict must
escalate rather than be smoothed into a binary outcome.

Validator/reconciler:

- `coverage_validate.py` checks the reusable coverage graph contract.
- `coverage_reconcile.py` writes `coverage_slice_manifest.json` and
  `COVERAGE_SLICE_REPORT.md`, accounting every declared Section III/V slice source id as
  converted, ledgered, or reference.
