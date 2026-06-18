# CONVERSION_RECORD.md — exactly what was done to convert the LBC representation into a crawlable graph

> **Purpose.** A precise, honest record of the Part-2 (crawlable) work on the Automotores
> manual: the order of operations, every design decision and its reasoning, the tooling built,
> the subagent (fresh-context verifier) protocol and what each pass found, and the drifts caught
> and fixed. This is the Automotores-specific account; the *generalized* method distilled from it
> is in [`../Crawlable_Conversions.md`](../Crawlable_Conversions.md). Read this to see the raw
> mechanism; read that to apply it to a new manual.
>
> **State at writing: CONVERSION COMPLETE.** Phases 0 → 5 of the roadmap's conversion are done.
> Validator GREEN; 372/372 source ids accounted; **0 deferred**; residual semantic drift 0 across
> nine fresh-context verifier passes. Final inventory: 56 nodes, 50 facts, 29 tables, 48 reference
> rules, 214 clause-side records, 16 conflict-ledger entries.

---

## 0. The inputs, and the order I read them

Read strictly in this order before touching anything (the prompt pinned it; each file constrains
the next): **CLAUDE.md** (accuracy is the single hard priority; represent conflicts, never resolve
silently) → **PROJECT_CONTEXT.md** §9 (entry point, schema, layout) + §5b (the conflicts I must
NOT resolve) → **Crawlable_Roadmap.md** (Phase 0 prove-core → Phase 1 graft-spine; Tasks S1
fidelity-fields and S2 brackets-as-DMN-tables) → **Crawlable_Migration_Notes.md** ("their skeleton,
our data": A1–A9 borrow, C1–C4 keep-our-discipline) → **reference_approach1/** (the proven node
schema to copy) → **the representation data** I would convert (rules 84, trees 4, tables 24,
clauses 152, base_policy, linkage, both document.json, verification_report).

Then I established the **baseline counts** with `python3` one-liners — these are the denominator of
the coverage manifest; you cannot prove "nothing was lost" without counting what is there.

---

## 1. The four opening decisions (asked, not guessed)

The prompt reserved four decisions for the human; I surfaced them via one `AskUserQuestion` with
recommendations + honest trade-offs, *before* building.

| Decision | Outcome | Recorded |
|---|---|---|
| **Expression language** | Handed back to me ("choose from the data… precise") | I decided JSONLogic + DMN tables (D-P1) |
| **Conflict handling** | Ledger-all + non-binding drafted recommendations | D-P2 |
| **Runtime** | Python 3.13, write scripts now | D-P3 |
| **Master router** | Build it, ship precedence as an open ruling | D-P4 |

**Why JSONLogic + DMN tables (the one I decided):** I inventoried every condition shape in the
data first — it is closed and shallow (boolean · numeric compare · enum/set membership · and/or/not
· "any/all over an explicit list" · intervals), with **no arithmetic, string ops, or quantifiers**
in any branch. Given accuracy = *auditable + mechanically checkable + zero drift*, JSONLogic wins:
it is JSON, so the validator proves "every fact defined, every `@tables.*` resolves, no unbound
var, only allowed operators" by **walking the tree**, not parsing strings (a string DSL would make
the validator itself a fallible parser — exactly where a dropped qualifier hides); and it needs no
bespoke interpreter. Intervals leave expressions entirely → DMN-style decision tables with explicit
inclusivity + flagged edges (S2). Rejected the custom DSL (interpreter liability), CEL/FEEL (parser
deps for power the data never uses). Full reasoning in `decisions.md` D-P1.

---

## 2. Phase 0 — proving the architecture on one vertical slice (before scaling)

I did **not** start bulk conversion; the cost of a wrong schema/crawler is paid per node. Phase-0
deliverables, in build order: `node_schema.md` (Approach-1's 7 node types + S1 fidelity fields +
S2 tables) → `decisions.md` → `facts.json` → `tables.json` (role-typed + the first S2 bracket_map)
→ `graph/router.json` (precedence→ledger) → `graph/3.1.2.json` (the full Standard eligibility tree,
one node per exclusion so each keeps its own verbatim `source_quote` and maps 1:1 in the manifest)
→ `rulings/` (seeded OPEN conflicts) → `crawler/crawl.py` → `validate.py` → `crawler/run_cases.py`
→ `coverage.py` + `coverage_manifest.json` + `NOT_CONVERTED.md` → `COVERAGE_REPORT.md`.

**Crawler design choices that mattered:** a self-contained JSONLogic evaluator (no dependency);
**short-circuit `and`/`or`** so a missing fact in an un-reached operand never fires `on_missing`
(else every clean case escalates for irrelevant facts); escalation-with-context from day one; the
eval context = facts ∪ flattened `@tables.*`.

**The reconciliation bug I caught in Phase 0:** the first `coverage.py` reported the 25 converted
eligibility elements as *deferred* — tree-element ids are tree-qualified (`T-ELIG-ESTANDAR.X01`)
while `_origin` was bare (`X01`). Erring "conservative" still makes the report untruthful. Fixed
the matching to be tree-qualified. **Lesson: verify the reconciliation engine itself** — an
under-counting report is as dishonest as an over-counting one.

---

## 3. The batched conversion (Phase 1), batch by batch

Each batch was **fully reconciled (A) + semantically verified (B) before the next**, all rolling
into one `COVERAGE_REPORT.md`. Node count grew 27→40→47→50→56; always 372/372 accounted.

### Batch 1 — Case-UW eligibility (`T-ELIG-CASEUW`)
`graph/3.3.1.json`: gate (admits all; `evaluate: true`) + C01–C11 + terminal. Crawler: made
`case_underwriting` a built process so `refer_process` continues into it; added the **third
conflict tier** — `conflict.blocking` for *contested outcomes* (C05 Rent-A-Car, where the source
self-contradicts → escalate when fired, not assert decline). Fidelity refinement: split the
bundled `is_emergency_vehicle` fact into `is_bomberos_policia_ejercito` + `is_ambulance` so X19
(includes ambulances) and C09 (does not) differ faithfully. Validator: reachability follows
`refer_process`→process-entry. New tool: `sync_facts.py` (regenerate the `required_by` index).

### Batch 2 — authority matrices (`TBL-AUTH-*`)
`build_tables.py` reads the representation's verbatim authority tables and **parses** the string
values to numbers (96 rows, zero hand-transcription) → `tables_authority.json` (matrix_lookup).
Crawler: a generic `authority` node (look up the binding suscriptor, check valor/cantidad within
limits → within=advance, exceeds/unknown=refer_authority). **Stage chaining by `order`:** capacity
(35) + authority (40) inserted so the eligibility fall-through chains gate→exclusions→capacity→
authority→terminal — no new control-flow primitive. Completed R-003. Ledgered `RUL-LIZETH-RIOS-AUTH`
(a suscriptor whose limits differ across matrices), modelled **row-conditionally** (caveat only
when that suscriptor is looked up). Loaders merge `tables*.json`. `licitaciones` became built.

### Batch 3a — rating tables (the S2 centerpiece)
`tables_rating.json`: 18 rating tables role-typed — `bracket_map` (moto-VA with its two cent-gaps
flagged → ledger; franquicia-empresas with VA brackets + categorical `special_rows`), `rate_table`
(by-plaza, tasas as decimals), `scalar_limit`, `reference` (prose/`rows_text` tables verbatim). S2
gap-detection fires at lookup time. **Verifier → DRIFT 4** — real quote-fidelity slips (values
correct): a fabricated `source_quote` (TBL-FRANQ-RC), an imported `applicability_quote` + dropped
Word-comment (TBL-TAR-PESADOS), a dropped parenthetical (TBL-TAR-PNNIT-FLOTA), a reworded quote
(TBL-TAR-EMP-FLOTA). Fixed all four against the verbatim source → **re-verified DRIFT 0**.

### Batch 3b — rating RULES (the rule-level partition)
Built `rule_buckets.json` — the authoritative partition assigning **every** rule to exactly one
bucket (node_converted / tree_converted / table_realized / partial_router / reference / deferred),
asserted exact (84 = 7+2+19+6+48+2 at the time). `build_reference.py` captured the 48 non-branch
rules verbatim into `reference.json` (governance / coverage-terms / procedural / info / process /
formula / CRM-tarificación — decisions.md D1/D2: not everything is a branch). Built the RC/AP
coverage-limit overflow nodes (R-018 RC Estándar→Case UW, R-022 AP→Línea Seguros Personales, R-074
RC Case UW→Línea RC). **Audit-completeness fix:** plain-fired condition/referral nodes (decline/
refer via `_emit_outcome`) now append an audit step, so the nodes-fired path is complete.

### Batch 4 — renovación / retroactividad (headline S2 + conflict)
`tables_renovacion.json`: the 3 siniestralidad band tables (Comercial/Consumer/Pesados-motos) as
`bracket_map` with **ambiguous edges modelled as gaps between exclusive-bounded rows** — a value
exactly on a flagged edge (60/150/250, the (50,51) gap) matches no row → `bracket_lookup` escalates
→ ledger (S2: never a silent inequality). The Consumer-vs-pesados **overlap** is a blocking-conflict
node ordered before the consumer node → escalate. Retroactividad: a **committee** referral (siniestro
overlay → Comité de Riesgos y Siniestros) checked first, then ≤30/>30. Crawler: `_handle_band`
(accumulator with `band_table`), committee `referral_target` on `refer_authority`, and the
**handoff-vs-continuation** rule — `refer_process` continues into the target **only from the
router** (which selects a process to run); every other `refer_process` is a handoff that terminates
with context (fixed a case where retroactividad>30→Case-UW wrongly re-ran Case-UW eligibility).
Reachability now roots from every process entry (renovación/retroactividad are their own flows).

### Batch 5 — clause links (the clause-side; capture, not nodes)
Per decisions.md D1 the cláusulas are contract text, not a decision tree. `build_clauses.py`
mechanically captured: `clauses.json` (152 clause records + 6 cross_code_findings), `base_policy_ref.json`
(13 elements), `linkage_edges.json` (16 rule↔clause forward edges + the free reverse inversion),
`crossrefs.json` (33). Ledgered the previously-unledgered `XC-006` (clause 2018: 3,5 TN vs 3 TN) as
`RUL-2018-PESO`. All 6 clause conflicts OPEN, none resolved.

---

## 4. The subagent (fresh-context verifier) protocol — how dimension B was run

Dimension B = "no compiled expression drifts from its source," run as **independent fresh-context
adversarial passes** (the `verification_report.md` L2 discipline). I spawned **nine** verifier
subagents via the `Agent` tool (`subagent_type: general-purpose`). Each brief: **stance** ("assume
drift until proven faithful; hunt for distortions"); **source-of-truth paths** (+ encouragement to
cross-check the raw `source_text/`); **the compiled artifact**; **the distortion catalog** (added
scope / dropped qualifier / wrong actor / inverted logic / wrong threshold / wrong outcome);
**named spot-check values** so the verifier re-derives rather than eyeballs (turning "spot-check"
into full-population verification); a **fixed output contract** (verdict table + `DRIFT COUNT: N`).

| # | scope | result |
|---|---|---|
| 1 | B0: 27 Standard-elig + router nodes | DRIFT 0; flagged X20/X22 derived-destination layering + 2 QUESTIONs |
| 2 | revised router (lbc_auto overlap fix) | PASS |
| 3 | B1: 13 Case-UW nodes + X19 | DRIFT 0 |
| 4 | B2: 3 matrices (96 rows re-derived) + 6 nodes | DRIFT 0 |
| 5 | B3a: 18 rating tables | **DRIFT 4** (quote-fidelity; values correct) |
| 6 | B3a re-check: the 4 corrected tables | REMAINING DRIFT 0 |
| 7 | B3b: 3 coverage-limit nodes + the reference classification | DRIFT 0 (no decisional content hidden in reference) |
| 8 | B4: renovación bands + overlap + retroactividad | DRIFT 0 (every flagged edge a true no-match) |
| 9 | B5: 152 clauses + base policy + 16 edges + 33 cross-refs | DRIFT 0 (all 6 conflicts ledgered; no silent resolution) |

Two findings prove the value of *fresh* context (a verifier sharing my build reasoning would have
rationalized both): the X20/X22 derived-destination layering, and the four B3a quote drifts. **A
clean first pass on a data-heavy batch should make you suspicious, not relieved.** Other tools:
`mcp__ccd_session__mark_chapter` (chapters per batch), `AskUserQuestion` (the 4 decisions), and
`Bash`/`python3` for every validate/coverage/run-cases/build/sync invocation.

---

## 5. The transferable mechanisms

1. **`_origin` on every node/table/record** = the spine of the coverage manifest: every source id
   maps via `_origin` (or a `rule_buckets` bucket), or to a `NOT_CONVERTED.md` line.
2. **The reconciliation equation**, asserted per artifact: `count_in == converted + partial +
   ledger + reference + deferred + excluded`. 372/372 or it's not done.
3. **Two-dimension proof:** (A) structural reconciliation (mechanical, can't see meaning) + (B)
   fresh-context semantic verification (sees meaning, can't be trusted to one self-pass).
4. **Three conflict tiers**, all represent-never-resolve: *provenance* (caveat + continue),
   *structural* (escalate via hit_policy/lookup), *contested outcome* (`conflict.blocking` →
   escalate when the node fires). Row-level conflicts fire row-conditionally.
5. **Not everything is a node.** Branch logic → graph; intervals → S2 tables; lookups → matrix
   tables; non-branch normative content (definitions, governance, procedural, contract clauses) →
   **reference capture files** with `_origin`. Forcing contract text into a graph would invent
   structure the source lacks (D1/D2).
6. **Mechanical before model:** generators parse the representation (`build_tables`,
   `build_reference`, `build_clauses`); derived indexes regenerated (`sync_facts`). No retyping.
7. **Stage chaining by `order`** (gate→exclusions→capacity→authority→limits→terminal); no bespoke
   "next stage" primitive.
8. **Handoff vs continuation:** the router continues into the process it selects; every other
   `refer_process` is a handoff that terminates with context.
9. **Process-scoped outcomes:** `decline` = "declined by this process"; `refer_*` only where the
   source names a destination.
10. **Portability + input robustness (post-completion hardening).** Forced UTF-8 stdout on every
    script (they printed em-dashes/check-marks/arrows/accents and crashed under ascii/POSIX
    locales - verified by re-running under `PYTHONIOENCODING=ascii` and `LC_ALL=C`); and made
    bad-typed facts escalate (`evaluation_error`) instead of hard-crashing the crawler. Both run-confirmed.

---

## 6. Honest boundary
- **0 deferred** — the conversion is complete. What remains is *downstream features*, not
  unconverted source: Phase-5 full-crawler chaining (today the eligibility→authority→limits chain
  runs on the fall-through path; branch/lift terminals don't yet re-enter later stages) + a
  regression corpus; the Phase-2 operational loop (underwriters close the 16 OPEN rulings); the
  Phase-6 human layer; Phase-9 DMN export (the S2 tables + JSONLogic are already DMN-aligned).
- **16 conflicts seeded OPEN, none resolved** — by mandate.

---

## 7. Artifact inventory (Part 2, under `crawlable/`)
`node_schema.md` · `decisions.md` · `facts.json` · `tables.json` · `tables_authority.json` (gen) ·
`tables_rating.json` · `tables_renovacion.json` · `rule_buckets.json` · `reference.json` (gen) ·
`clauses.json` (gen) · `base_policy_ref.json` (gen) · `linkage_edges.json` (gen) · `crossrefs.json`
(gen) · `graph/{router,3.1.2,3.1.3,3.1.4,3.3.1,3.3.2,3.3.3,3.5.2,4.1,4.11}.json` ·
`rulings/{README + 16 RUL-*}.md` · `crawler/crawl.py` · `crawler/run_cases.py` · `validate.py` ·
`coverage.py` · `coverage_manifest.json` · `NOT_CONVERTED.md` · `build_tables.py` ·
`build_reference.py` · `build_clauses.py` · `sync_facts.py` · `COVERAGE_REPORT.md` · `README.md` ·
this `CONVERSION_RECORD.md`. `representation/` was never edited (read-only fidelity source).


---

## 8. Errors found & fixes applied (consolidated log)

Every error / drift / bug found during the conversion, each with the fix, what I did, and the
verification that confirmed it (per the "confirm against a run" discipline). Grouped by how it was
caught. All are now fixed and verified unless marked otherwise.

### A. Semantic drifts caught by the fresh-context verifier passes (dimension B)

**A1 — X20/X22 derived-destination layering (Phase 0).**
- *Error:* the refer destinations on X20→licitaciones / X22→masiva came from the representation's
  *derived* `outcome` field, not the bare verbatim bullet (which says only "excluido").
- *Fix / what I did:* kept the refer mapping (faithful to the representation + the §3.5/§3.4 process
  defs + the router) and added a `_derived_note` on both nodes disclosing the provenance, so a
  derived reading is never shipped as settled logic undisclosed.
- *Verified:* the router re-verification pass returned PASS; cases still route correctly.

**A2 — four quote-fidelity drifts in the rating tables (Batch 3a).**
- *Error:* values were all correct, but four `*_quote` fields drifted — `TBL-FRANQ-RC.source_quote`
  was a reworded sentence; `TBL-TAR-PESADOS.applicability_quote` imported R-037's segment clause as
  if from the table (and dropped the embedded Word-comment); `TBL-TAR-PNNIT-FLOTA` dropped
  "(programa vigente o por emitirse)"; `TBL-TAR-EMP-FLOTA` reworded "correspondientes al"→"del".
- *Fix / what I did:* restored each to the verbatim source — moved R-044's sentence to a labelled
  `rule_quote_R-044`; split TBL-TAR-PESADOS into table-verbatim + `applicability_derived_from_R-037`
  and restored the "Comentado [JR1]" Word-comment; restored the dropped parenthetical; restored
  "correspondientes al". Also enumerated the moto 35000 gap + the franquicia lujo-precedence in
  `RUL-BAND-EDGES`.
- *Verified:* a focused re-verification pass returned **REMAINING DRIFT: 0**.

(QUESTIONs that were NOT drift, already disclosed: the X15 two-threshold split → `conflict`→
RUL-X15-HIGHVALUE-READING; the X12 "nueva" boundary → `_derived_note`; R-016/R-097 reference calls.)

### B. Mechanical / modeling bugs I caught during the build

**B1 — coverage engine under-counted (Phase 0).**
- *Error:* the first `coverage.py` reported the 25 converted eligibility elements as *deferred* —
  tree-element ids are tree-qualified (`T-ELIG-ESTANDAR.X01`) but `_origin` was bare (`X01`).
- *Fix / what I did:* made the matching tree-qualified (derive the tree id from `_origin.path`);
  partial-overrides ordered correctly. Lesson: verify the reconciliation engine itself.
- *Verified:* coverage then showed 25/25 converted for T-ELIG-ESTANDAR; 372/372 overall.

**B2 — router silently resolved the LBC|Auto overlap (Phase 0).**
- *Error:* a plain `lbc_auto` fell through to Standard, silently resolving the genuine
  Automática(R-060)-vs-Estándar(R-011) overlap.
- *Fix / what I did:* the router asserts both the automatica and standard branches, so `lbc_auto`
  matches two → `hit_policy: unique` escalates → RUL-ROUTER-PRECEDENCE.
- *Verified:* router re-verification PASS; case R1 escalates (ambiguous_precedence).

**B3 — bundled emergency-vehicle fact lost the X19/C09 difference (Batch 1).**
- *Error:* `is_emergency_vehicle` bundled ambulances, but Standard X19 excludes ambulances and
  Case-UW C09 does not.
- *Fix / what I did:* split into `is_bomberos_policia_ejercito` + `is_ambulance`; X19 reads the OR,
  C09 reads only the former.
- *Verified:* the ambulance contrast — same vehicle → Standard decline, Case-UW eligible.

**B4 — Lizeth Rios authority caveat over-applied (Batch 2).**
- *Error:* the cross-matrix discrepancy was a node-level conflict, so it caveated *every* Case-UW /
  Licitaciones authority decision.
- *Fix / what I did:* moved it to the table's `cross_table_conflicts` and made the crawler fire it
  **row-conditionally** (only when the looked-up suscriptor is the discrepant row).
- *Verified:* José Carlos López (within) carries no caveat; only an actual Lizeth Rios lookup does.

**B5 — synthetic licitaciones terminal mis-credited R-090 as converted (Batch 3b).**
- *Error:* the terminal's `_origin` cited R-090, so coverage classified R-090 "converted",
  overriding its `partial_router` bucket.
- *Fix / what I did:* gave the terminal a `synthetic` _origin; R-090 stays `partial`.
- *Verified:* coverage rules row → 28 converted / 6 partial (consistent with rule_buckets).

**B6 — audit path omitted plain-fired nodes (Batch 3b).**
- *Error:* a condition/referral that fired a terminal outcome via `_emit_outcome` (decline/refer,
  no branches/exception) set `terminal_node` correctly but did not append an audit step, so the
  firing node was missing from the nodes-fired path.
- *Fix / what I did:* append a `rec(result="fired", …)` before `_emit_outcome`.
- *Verified:* the X05 decline case now shows `standard.elig.competicion[fired]` in its path.

**B7 — refer_process wrongly auto-continued (Batch 4).**
- *Error:* `refer_process` continued into any built process, so `retroactividad>30 → Case UW`
  (a handoff) re-ran Case-UW eligibility and stalled on missing vehicle facts.
- *Fix / what I did:* only the router (which selects a process to run) continues into the target;
  every other `refer_process` terminates as a handoff with context.
- *Verified:* RT2 / case-5 / L1 terminate as `refer_process`; the router cases (R3) still continue.

**B8 — `required_by` impact-index drift (Batch 1).**
- *Error:* the fact→node index went stale as cross-process reuse grew (12 advisory warnings).
- *Fix / what I did:* `sync_facts.py` regenerates it from the graph; the validator warns only on
  *stale* pointers, not incompleteness.
- *Verified:* validator GREEN with 0 warnings after each batch.

**B9 — separate-flow nodes flagged unreachable (Batch 4).**
- *Error:* renovación/retroactividad nodes were unreachable from `root.process_router` (they are
  their own entry flows), so the validator's reachability check errored.
- *Fix / what I did:* reachability roots from every process entry, not just the router.
- *Verified:* validator GREEN.

### C. The "em-dash–class" errors (the dedicated error-hunt turn)

**C1 — Unicode-output crash (the real "em dash problem", in code).** *Was NOT logged anywhere.*
- *Error:* every printing script (`crawl.py`, `validate.py`, `coverage.py`, `run_cases.py`, and the
  4 generators) wrote Unicode (em-dashes, ✓, →, accented Spanish) straight to stdout, crashing with
  `UnicodeEncodeError` under any non-UTF-8 stdout (ascii / POSIX locale / some CI pipes). It worked
  here only because the terminal is UTF-8.
- *Fix / what I did:* added `sys.stdout.reconfigure(encoding="utf-8")` (guarded) to all 8 scripts.
- *Verified:* the exact commands that crashed now pass under both `PYTHONIOENCODING=ascii` and
  `LC_ALL=C LANG=C`; normal run still GREEN.

**C2 — bad-typed input hard-crashed the crawler (same failure class, input side).**
- *Error:* a wrong-typed fact (a string where a number is expected) raised an uncaught exception in
  a JSONLogic comparison / band lookup / authority comparison, crashing the crawl.
- *Fix / what I did:* the crawl loop now catches `EvalError` → escalates `evaluation_error` with
  context; band lookups guard numeric input; authority treats a `None` limit as unlimited and
  guards non-numeric values. Genuine code bugs still surface (not masked).
- *Verified:* feeding a string `siniestralidad` and a string `valor_asegurado` now escalates
  (`evaluation_error`) instead of crashing; authority/renovación outcomes unchanged.

**C3 — validator/doc count mismatch (consistency).**
- *Error:* `validate.py` printed "17 ledger files" (16 rulings + README) while the docs said "16".
- *Fix / what I did:* `validate.py` now prints "16 conflict rulings" (counts `RUL-*.md`).
- *Verified:* inventory line matches the docs.

### D. Not a code error (recorded for completeness, not fixable by me)

**D1 — Edit-tool em-dash exact-match failure.** The harness `Edit` tool could not match `old_string`
values containing `—`/`–`. This is a **tooling limitation, not a repo bug** — *not logged* anywhere
because there is nothing in the code to fix. Worked around throughout by using `Write` (or
ASCII-only anchors) on dash-heavy files. No further action.

### E. Open-item fixes (maintenance pass, post-completion)

These close the items §9 had flagged as fixable-now. Each confirmed against a run.

**E1 — O1+O2: S2 bracket safety-net now enforces gaps and inclusive point-overlaps.**
- *What it was:* `bracket_partition_ok` checked only overlaps via a strict `<` approximation — it
  missed (a) undeclared **gaps** between rows and (b) **point-overlaps** where two rows share an
  inclusive edge, while its docstring overclaimed both. A future band-table mistake on those axes
  would have passed silently, weakening the S2 mandate on the gap side.
- *Fix / what I did:* rewrote the function to be inclusivity-aware. Overlap: two rows conflict
  unless one is strictly left of the other, where "touching at a shared edge" counts as overlap only
  if BOTH sides include it. Gap: sort rows by lower bound and scan consecutive pairs — a range gap
  larger than the table's `granularity`, or a point gap where neighbours touch but BOTH exclude the
  shared endpoint, is an error unless that edge is declared in `boundary_conflicts`. Added a
  `granularity` field (money = `0.01`, on `TBL-TAR-MOTO`) so adjacent-cent rows don't read as a gap,
  plus an epsilon (`1e-9`) guard that kills float noise (`10500.01 − 10500` was falsely `> 0.01`).
  Corrected the docstring to match.
- *Verified:* real data `GREEN — 0 errors` after the epsilon fix; a temporary `tables_ZZTEST.json`
  carrying a deliberate `[0,50]/[60,100]` gap and a `[0,50]incl/[50,100]incl` overlap was correctly
  flagged (`gap (50,60)`, `overlap near 50`); deleting it restored `GREEN`. The net now catches the
  exact mistakes O1/O2 described.

**E2 — O10: removed the redundant `null_means_unlimited` flag.**
- *What it was:* the `cantidad_vehiculos` authority constraint carried `null_means_unlimited: true`,
  but the crawler already treats a `None` row-limit as unlimited regardless of the flag.
- *Fix / what I did:* removed the flag from `graph/3.1.3.json`, `3.3.2.json`, `3.5.2.json`.
- *Verified:* `validate.py` GREEN; authority cases unchanged — exceeds → `refer_authority`, within
  (including a `None` / "No aplica" limit) → `eligible`.

**E3 — O11: normalized `boundary_conflicts[].edge` to numeric.**
- *What it was:* the field mixed numeric (`60`, `150`) and string (`"50-51"`) — the string form is
  exactly what O1's gap-scan must compare against.
- *Fix / what I did:* in `tables_renovacion.json` (`TBL-RENOV-PESADOS-MOTOS`) changed
  `"edge": "50-51"` to `"edge": 50, "edge_upper": 51` (numeric, range-aware).
- *Verified:* `validate.py` GREEN; the O1 gap-scan reads the numeric edge.

**E4 — O8: added a second independent dimension-B vote on the executable logic.**
- *What it was:* dimension-B semantic verification was single-pass per batch (only B3a had been
  re-checked) — not multi-vote.
- *Fix / what I did:* ran a second, independent fresh-context adversarial verifier over the full
  compiled decision logic — router; all 23 Std + 11 CaseUW nodes; the three authority matrices +
  capacity; RC/AP limits (210k / 350k / 140k); every renovación siniestralidad band incl. the
  flagged edges (60/150/250, the 50-51 gap) and the Consumer-pesado overlap; retroactividad + the
  siniestro→Comité overlay; the S2 rating/franquicia tables; the JSONLogic op set; S1 fidelity —
  instructed to re-derive at edges and surface anything a single pass might miss.
- *Verified:* **SECOND-VOTE DRIFT COUNT: 0** — every area PASS. It independently re-derived the
  authority edge (at `max_valor` WITHIN, `+1` refers), the band edges (each lands on no row →
  escalates), and the overflow operators, and explicitly cleared the X01 AND-reorder as commutative.
  The executable logic now carries two concurring independent semantic votes.

**E5 — O9: deepened the Part-1 residual-risk explanation in its own doc.**
- *What it was:* O9 named the inherited Part-1 residuals (clause OCR fidelity, presentational-reprint
  classification, linkage confidence) but didn't explain where each comes from, the risk, or how
  Part 2 inherits them.
- *Fix / what I did:* added **§4b** to `verification_report.md` giving, per residual, the origin, the
  concrete risk, the Part-2 effect (Part 2 is generated from the representation and never
  re-extracts, so it inherits each unchanged), and a mitigation; recorded that the single-pass
  residual (R4) is now addressed for the executable logic by E4.
- *Verified:* §4b present; the §9 residual entry below now summarizes it and points to §4b.


---

## 9. Open / still to fix (as of this snapshot)

**Nothing is currently failing** — `validate.py` is GREEN, coverage is 372/372, the cases run. Since
the last snapshot every *fixable-now* item (O1, O2, O8, O10, O11) has been closed and verified
(see §8E); what remains is *by-design* deferral, *by-mandate* open conflict, and one inherited
*residual risk*. Tagged so you can triage.

### Resolved since the last snapshot (fixed + verified — details in §8E)

- **O1 / O2 — [validator] band gaps + inclusive point-overlaps now enforced.** `bracket_partition_ok`
  was overlap-only (strict `<` approximation) and its docstring overclaimed; it now flags undeclared
  gaps and inclusive point-overlaps, with a `granularity` + epsilon guard so adjacent-cent rows and
  float noise don't false-positive. Proven to catch a deliberately broken table, then GREEN restored.
  → §8E1.
- **O8 — second independent dimension-B vote added.** The executable logic (router; all 34 elig
  nodes; authority matrices + capacity; RC/AP limits; renovación bands; retroactividad; S2 tables; op
  set; S1 fidelity) was re-verified by a fresh-context adversarial pass: **DRIFT 0**. Two concurring
  votes now. → §8E4.
- **O10 — redundant `null_means_unlimited` flag removed** from the three authority nodes (the crawler
  already treats `None` as unlimited). Outcomes unchanged. → §8E2.
- **O11 — `boundary_conflicts[].edge` normalized to numeric** (`"50-51"` → `edge: 50, edge_upper:
  51`), the form O1's gap-scan compares against. → §8E3.

### Outstanding work — by design, deferred to later roadmap phases (not bugs)

- **O3 — [Phase 5] full-crawler stage chaining.** The gate→exclusions→capacity→authority→limits
  chain runs only on the fall-through path; branch/lift terminal outcomes (X15 eligible, X07/X12
  conditional) don't re-enter later stages. Faithful flow modeling needs every eligible/conditional
  path to continue through authority/rating.
- **O4 — [Phase 5] regression corpus.** `run_cases.py` is illustrative, not measured against
  underwriter-validated answers; there is no pass/fail ground truth yet.
- **O5 — [Phase 4/6] clause citations not surfaced on outcomes.** `linkage_edges.json` (+ the reverse
  index) exist as data, but the crawler only attaches clauses in the antique exception's
  `required_clauses`; a general "this outcome is governed by clause X" surfacing isn't wired into
  the crawl result.
- **O6 — [Phase 6/9] human layer + DMN export not built.** (Phase 9 is mostly serialization: the S2
  tables + JSONLogic are already DMN-aligned.)

### Intentionally OPEN — by mandate, NOT errors (do not "fix" by picking a winner)

- **O7 — the 16 conflict rulings await human resolution.** Each is OPEN with verbatim variants + a
  non-binding recommendation; the crawler escalates at each by design. Resolving them is the
  underwriter/Phase-2 loop, not a code fix. Resolution enters only via the ledger + regenerate.

### Residual verification risk (inherited from Part 1; cannot be closed by more of the same kind)

- **O9 — Part-1 source-extraction residuals stand; Part 2 inherits them unchanged.** Part 2
  (`crawlable/`) is *generated from the representation and never re-extracts the PDFs*, so three
  residuals carry through verbatim. Full origin / risk / mitigation per residual is now in
  `verification_report.md` §4b; in brief:
  - **Clause-body OCR fidelity** — clause texts were sliced from the PDF text layer, not re-OCR'd
    from page images, so imperfect glyphs carry through (e.g. clause 2052 "danos", "0 sean").
    *Risk:* a clause's operative wording could be wrong at the character level in a way no text-layer
    check catches. *Part-2 effect:* `clauses.json` references the same texts → same bound; the crawler
    cites a clause, it does not re-validate its characters.
  - **Presentational-reprint classification (10 codes)** — same-code reprints differing only in
    whitespace / signature casing were collapsed to one canonical text by a deterministic hash+diff,
    reviewed at build but not re-read by a fresh verifier. *Risk:* a hidden operative change would
    collapse two genuinely-different reprints into one.
  - **Linkage match confidence** — rule↔clause edges carry confidence labels (exact / partial /
    related / unmatched); the non-exact calls are judgment, not proven legal equivalence. *Risk:* a
    wrong or missing edge could cite the wrong governing clause (e.g. the antique "Nota Aclaratoria"
    is `unmatched`). *Part-2 effect:* `linkage_edges.json` preserves the labels → uncertainty carried,
    not hidden.

  These are properties of the *source extraction*, not the decision logic — the rules / trees /
  tables had a mechanical verbatim check **and** two independent semantic votes (O8). Mitigations
  (re-OCR the clauses carrying `anomalies`; fresh re-read of the 10 presentational diffs; treat
  `unmatched` / `related` edges as the Phase-4 clause-linking review queue) are listed in §4b.
