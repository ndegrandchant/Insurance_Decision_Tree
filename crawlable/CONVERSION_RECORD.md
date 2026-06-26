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
> nine fresh-context verifier passes. Final inventory: 61 nodes, 55 facts, 29 tables, 47 reference
> rules, 214 clause-side records, 16 conflict-ledger entries.
>
> **▶ Addendum (2026-06-24, post platform-merge).** The counts above are *as of the original
> conversion*. Since then santi's platform + coverage engine merged: the conflict ledger is now
> **18** (the coverage slice added `RUL-CG-2027`, `RUL-CG-2045-2053`), and `validate.py [11]` is
> **engine-aware** over the shared ledger (decisions.md **D-P9**); validator still GREEN. The
> Automotores-specific record below is unchanged; current status + the forward plan (the clause-impact
> North Star + P5-COV full-policy coverage) live in `../Crawlable_Roadmap.md`.

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
into one `COVERAGE_REPORT.md`. Node count grew 27→40→47→50→56 (Phase-1 batches; later 61 after the O14 licitaciones gates, §8H4); always 372/372 accounted.

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


### F. Runtime-conflict stress test (Part-1 mitigation pass)

A non-destructive stress harness (`troubleshoot testing/`, Layers A–D) was built to prove the
crawler never *silently resolves* a conflict — reads `crawlable/` read-only, all fault injection
in-memory, nothing under `crawlable/` written. The property held under sweeps/fuzz/mutation; three
fixes were applied, all **outcome-preserving** (Layer-A snapshot stayed stable). Full report:
`troubleshoot testing/STRESS_REPORT.md`; verification method recorded in `verification_report.md` §4c.

**F1 — `RUL-MAN-VERSION` surfaced on zero outcomes (G1).**
- *Error:* the version-identity conflict was referenced 14× via top-level `_doc_conflicts`, but
  `crawl.py` only reads node-level `conflict` — so a *represented* conflict was invisible on every
  crawl result (silent omission, the weak form of silent resolution).
- *Fix / what I did:* added `load_doc_conflicts()`; `crawl()` now surfaces it **once per result** as
  `document_provenance` (document-level metadata, not a per-node caveat — keeps the caveat channel
  for decision-relevant conflicts). Your call (G1): doc-level-once, the safest + clearly-visible
  option. Recorded as D-P6 in `decisions.md`.
- *Verified:* `document_provenance` present on results; mutation M9 (drop `_doc_conflicts`) caught;
  snapshot stable (no decision outcome changed).

**F2 — `bracket_lookup` mis-attributed the escalation edge.**
- *Error:* on a non-unique match it returned `boundary_conflicts[0]` regardless of which edge the
  value hit — a 150% renovación value reported `edge 60`. Safe (correct `ledger_ref`, still escalates)
  but misleading in the audit trail.
- *Fix / what I did:* attribute to the nearest/containing declared edge; 60/150/250 now each cite
  their own edge. `ledger_ref` unchanged.
- *Verified:* direct check (60→60, 150→150, 250→250); snapshot stable (edge/detail aren't in the
  outcome signature).

**F3 — no conflict-coverage check (G2).**
- *Error:* nothing asserted that every OPEN ruling is actually surfaceable — a future conflict could
  be added that no input ever shows (exactly how F1 hid).
- *Fix / what I did:* `validate.py [11]` — every OPEN `rulings/RUL-*.md` must be referenced by a data
  construct (node conflict / consumed-table boundary or cross conflict / `_doc_conflicts` /
  reference-capture) **or** listed in `LEDGER_ONLY_BY_DESIGN` with a reason; `[9]` extended to
  `_doc_conflicts` refs. Mirrors the harness's Layer-D classification.
- *Verified:* proven load-bearing — a deliberately unanchored `RUL-ZZTEST` made `[11]` go RED, then
  removed; `validate.py` GREEN with 16 rulings.

### G. Layer E — fresh-context multi-vote conflict-tier review (Part-1 mitigation, semantic)

Three independent fresh-context verifier subagents (distinct adversarial lenses — V1 under-surfacing /
V2 over-escalation / V3 missing-executable-surfacing) judged all 11 conflict items against the verbatim
ledger + `crawl.py` tier logic; majority vote per item, dissents adjudicated. Raw verdicts:
`troubleshoot testing/layer_e_verdicts.json`. **Result: 9/11 tiers unanimously/strongly confirmed
correct; 0 silent-resolution holes.** No tier was flipped — every majority kept the current tier, and
flipping on a lone dissent would *resolve* a modeling question that belongs to the underwriter
(represent-don't-resolve). The four med/low dissents were **represented**, not silenced:

- **G-E1 (X15, V1):** the *validated-importer → `eligible`* branch may be an accept the source doesn't
  explicitly grant (the bullet sits under the "excluidos" header); it already rides WITH the X15 caveat
  (surfaced, not silent). → added as open sub-question #3 in `rulings/RUL-X15-HIGHVALUE-READING.md`;
  tier left CAVEAT.
- **G-E2 (MAN-VERSION, V1):** tier DOC-LEVEL is right, but the note understated a **data-currency**
  risk (the 4.0 changelog changes authority/capacity/franquicia *values* shipped off 3.0 pages). →
  enriched `rulings/RUL-MAN-VERSION.md` with a data-currency warning.
- **G-E3 (ALCOHOLEMIA, V3):** the cross-doc *number* tier is REFERENCE-ONLY (correct), but **R-097's
  licitaciones "no pueden ser suscritas" list is unwired executable logic** (a licitación quote
  requesting a barred condition isn't blocked at runtime). → new open item **O14**; noted in
  `rulings/RUL-ALCOHOLEMIA.md`.
- **G-E4 (FLOTA, V3):** suggested a router-branch caveat; majority declined (the `consumer_fleet_4plus`
  enum already fixes the segment, so ≥4 is unambiguous there). → dissent recorded in
  `rulings/RUL-FLOTA-THRESHOLDS.md`; no change.

No code or tier change resulted; all four outcomes are ledger/doc enrichments (represent-don't-resolve).
`validate.py` stayed GREEN and the Layer-A snapshot stayed stable (nothing executable changed).

### H. Bucket-1 "fixable now" correction pass (the user asked to fix everything triaged fixable-now)

All verified together: `validate.py` GREEN (61 nodes, 55 facts, 47 reference rules), `coverage.py`
372/372, `run_all.py` ALL GREEN (10/10 mutations caught), snapshot re-blessed (43 cases; **all drift
outcome-preserving** — 0 outcome/terminal changes).

**H1 — O12a: `bracket_lookup` escalates the franquicia `special_rows` precedence.** It scanned only
numeric `rows`; a table with categorical `special_rows` (TBL-FRANQ-EMPRESAS lujo > 420.000) would
silently return the VA-bracket row where the lujo categorical also applies. Now: if a value falls in a
declared `precedence` region of a `special_rows` table, it escalates (the categorical overlap needs a
category fact the numeric lookup lacks). *Verified:* 420.000 resolves, 420.001/500.000 escalate
(RUL-BAND-EDGES); renovación bands (no special_rows) unchanged.

**H2 — router caveat noise removed.** Every routed outcome (even a single unambiguous trigger) carried
the RUL-ROUTER-PRECEDENCE caveat; the precedence conflict only exists on a multi-match (which already
escalates). Now suppressed on single-match. *Verified:* R2–R5/LR-LIC lost the router caveat
(outcomes unchanged; LR-LIC keeps its Lizeth-Rios caveat); mutation M5 still caught.

**H3 — O5: governing clauses surfaced on outcomes.** `crawl()` now attaches `governing_clauses` —
from fired/terminal nodes' rule origins via the `linkage_edges.json` index **and** any inline
`required_clauses` an exception lifted — each with its match-confidence label (cites, never asserts
equivalence; R3). Sparse by data (most decisive nodes are tree-origin; linkage keys only R-015/R-016),
but the antique lift now surfaces its clauses incl. the `unmatched` nota-aclaratoria. Not in the
snapshot signature (outcome-preserving).

**H4 — O14: licitaciones prohibited-condition gates (R-097) node-ified.** Was reference-only — a
licitación requesting alcoholemia > 0,70 / Valor Admitido / licencia vencida > 90d / permisos de
velocidad routed to *eligible* (not blocked). Added 5 facts + 5 nodes (order 10–14, before capacity):
the four conditions → `decline` (process-scoped = "no suscribible por Licitaciones", faithful to
"no pueden ser suscritas por este Procedimiento"); AP-en-carrocería → `refer_authority` (the source
names the authorizers); the auxilio-mecánico item (a reimbursement rule, not an exclusion) stays
reference. The alcoholemia node carries `conflict → RUL-ALCOHOLEMIA`, so the cross-doc 0,50-vs-0,70
tension now **surfaces at runtime** when the gate fires. R-097 moved reference→node_converted
(`rule_buckets.json`); `reference.json` regenerated (47); coverage re-reconciled 372/372. Modelling
call (decline-vs-strip granularity) recorded as **D-P8** + per-node `_derived_note`. *Verified:* clean
tender → eligible; each prohibited condition → decline (alcoholemia + caveat); AP → refer_authority.

**H5 — harness add-ons + audit completeness.** 3 O14 regression cases + a gate-rejection case
(non-admitted vehicle type → `not_admitted_by_standard` → reevaluation-loop escalation); a 10th
mutation (M10: disable the antique exception's liftability → E3 must change); a node-coverage report.
*Audit-completeness fix:* terminal nodes now append an audit step (sibling of the B6 fix — terminals
previously set `terminal_node` but never appeared in the path), so the trail is complete and the
coverage metric is accurate. Node-coverage went 57→**61/61** (the 3 "missing" eligible terminals were
a metric blind spot — reached as `terminal_node`, just not logged; the 1 real gap,
`not_admitted_by_standard`, is closed by the gate-rejection case). Snapshot re-blessed (43 cases; paths
now include terminals — outcome-preserving).

**Deferred, truthfully reclassified → O15.** R2 (re-read the 10 presentational reprints) and the
152-clause reference second-vote were listed "fixable now (AI run)", but on attempt proved
**reference-side (Part-1)**: R2's reprint-diff evidence isn't staged and the classification is buried
in the representation's internals; the 152-clause re-vote is a large multi-agent pass, lower-stakes
than the executable logic (already double-voted + tier-reviewed). Moved to O15 — a focused Part-1
reference-re-verification pass, not crammed in here (accuracy-first over forced completion).


---

## 9. Open / still to fix (as of this snapshot)

**Nothing is currently failing** — `validate.py` is GREEN, coverage is 372/372, the cases run. What
remains is *by-design* deferral, *by-mandate* open conflict, and inherited *extraction residuals*.

### 9.0 Status scoreboard — FIXED vs NOT-FIXED at a glance

> Read THIS table to see what's done and what's left **without reading the fix narratives** (§8).
> Every item is in exactly one status. ✅ = fixed+verified · ⬜ = deferred (built later) · 🔒 = open
> by mandate (underwriter) · 📄 = improvable only by better source extraction (Part 1).

| id | item | status | detail |
|---|---|---|---|
| O1/O2 | band gap/overlap enforcement (validator) | ✅ FIXED | §8E1 |
| O8 | 2nd dimension-B vote (executable logic) | ✅ FIXED | §8E4 |
| O10 | redundant `null_means_unlimited` flag removed | ✅ FIXED | §8E2 |
| O11 | `boundary_conflicts[].edge` numeric | ✅ FIXED | §8E3 |
| G1 | RUL-MAN-VERSION surfaced (`document_provenance`) | ✅ FIXED | §8F1 |
| F1/F2 | bracket edge attribution · conflict-coverage check `[11]` | ✅ FIXED | §8F2/F3 |
| O13 | Layer-E multi-vote tier review | ✅ FIXED | §8G |
| O12a | `bracket_lookup` escalates `special_rows` precedence | ✅ FIXED | §8H1 |
| O-router | router single-route caveat noise removed | ✅ FIXED | §8H2 |
| O5 | governing clauses surfaced on outcomes (the *wiring*) | ✅ FIXED | §8H3 · map *completeness* → O16 |
| O14 | licitaciones prohibited-condition gates (R-097) | ✅ FIXED | §8H4 |
| O3 | full stage-chaining (lift/branch → later stages) | ⬜ DEFERRED · Phase 5 | below |
| O4 | regression corpus vs underwriter-validated answers | ⬜ DEFERRED · Phase 2/5 | below |
| O6 | human layer + DMN export | ⬜ DEFERRED · Phase 6/9 | below |
| O12b | wire latent rating tables into a rating stage | ⬜ DEFERRED · Phase 5 | below |
| O15 | Part-1 reference re-verification (R2 reprints + reference 2nd vote) | ⬜ DEFERRED · reference-side | below |
| O16 | linkage rule→clause map **completeness** (~2/84 rules linked) — **not** fixed by the rulings | ⬜ DEFERRED · **Phase 4** (clause-linking) | below |
| O7 | the 16 conflict rulings | 🔒 OPEN · underwriter / Part 2 | below |
| O9 | R1 clause-OCR fidelity · R3 linkage *confidence* (existing labels; completeness → O16) | 📄 EXTRACTION-only | `verification_report.md` §4b |

**Bottom line:** every item triaged *fixable-now by code/AI* is ✅; what's left is deferred builds,
the underwriter's 16 rulings, and two source-extraction residuals. No open crawler **bugs**.

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
  path to continue through authority/rating. **Now measured** (runtime stress test, §8F /
  `troubleshoot testing/STRESS_REPORT.md`): an early lift (antique→conditional) terminates before
  `high_value`(X15) and `authority`, so those nodes are unreachable for lifted cases. Deferred to
  Phase 5 (confirmed call). *Side-effect to note:* X15 declines standard at 1.05M and routes the
  importer-path above 700k, so 26/43 standard authority-matrix rows (limits up to 3.48M) can never
  bind in the standard flow — a possible source tension (X15 1.05M vs matrix 3.48M) for the tier review.
- **O4 — [Phase 5] regression corpus.** `run_cases.py` is illustrative, not measured against
  underwriter-validated answers; there is no pass/fail ground truth yet. *(Partly addressed:* the
  Layer-A golden snapshot (`troubleshoot testing/golden_snapshot.json`) is now a **regression** guard
  — it pins current behavior, not underwriter-correct behavior, which still needs Phase 2.)
- **O5 — ✅ DONE (§8H3).** `governing_clauses` now surfaced on outcomes (rule-origin linkage edges +
  inline exception `required_clauses`, each with its match-confidence label). Sparse by data (most
  decisive nodes are tree-origin); the antique lift surfaces its clauses incl. the `unmatched` note.
  *This is the **wiring** only.* The **completeness** of the underlying map (how many rule→clause edges
  exist) is a separate deferred item → **O16 (Phase 4)**.
- **O16 — [Phase 4 · clause-linking] linkage rule→clause map completeness.** The forward map is sparse:
  only ~2 of 84 rules (R-015, R-016) carry a clause edge; 10 of the 16 edges are mention-only. Completing
  the forward (rule→clause) edges is **Roadmap Phase 4 (§4.1)** — it is **NOT** addressed by the
  Phase-2 rulings loop (resolving a conflict ≠ adding a linkage edge; the two are orthogonal). The
  crawler runs fine without it: `governing_clauses` is an *enrichment* on outcomes (which clause governs),
  never a decision input, so sparse linkage means *fewer clause citations*, not wrong outcomes. The
  *confidence* of the edges that DO exist is the separate R3 residual (O9 / `verification_report.md` §4b;
  sampled 4/4 clean in the Phase-3 trial, `improvement_crawler_test/`).
- **O6 — [Phase 6/9] human layer + DMN export not built.** (Phase 9 is mostly serialization: the S2
  tables + JSONLogic are already DMN-aligned.)
- **O12a — ✅ DONE (§8H1).** `bracket_lookup` escalates the `special_rows` precedence (franquicia-lujo
  @420.000), so it cannot silently resolve once a rating node consumes the table.
- **O12b — [Phase 5/rating] latent S2 rating tables still unwired.** `TBL-FRANQ-MOTO` / `TBL-TAR-MOTO`
  / `TBL-FRANQ-EMPRESAS` are consumed by no runtime node yet (rating stage deferred). Wiring them +
  the rating outputs is the Phase-5 build; O12a already made the lookup safe for when they are.
- **O13 — [Layer E] fresh-context multi-vote tier review — ✓ DONE (2026-06-19).** 3 independent
  fresh-context verifiers (perspective-diverse lenses) re-judged every conflict's *tier*: **9/11
  confirmed correct, 0 silent-resolution holes; no tier flipped.** The 4 med/low dissents were
  represented in the ledger, not silenced (see §8G + `troubleshoot testing/layer_e_verdicts.json`).
  The FLOTA router-caveat judgment call was reviewed and **declined** (majority: the
  `consumer_fleet_4plus` enum already fixes the Consumer segment, so ≥4 is unambiguous there).
- **O14 — ✅ DONE (§8H4).** R-097's licitaciones prohibited-condition list is node-ified (5 gates,
  order 10–14): a tender requesting a barred condition now declines / refers instead of routing to
  eligible, and RUL-ALCOHOLEMIA surfaces at runtime. Modelling call (decline-vs-strip) recorded as D-P8.
- **O15 — [reference re-verification] R2 + reference second-vote — deferred (reference-side).** A fresh
  re-read of the 10 presentational reprints (R2) and a second fresh-context vote over the 152-clause +
  base-policy reference capture. Reclassified out of "fixable-now" (§8H): R2's reprint-diff evidence
  isn't staged and both are Part-1 extraction-side, lower-stakes than the executable logic (already
  double-voted + tier-reviewed). Do as a focused Part-1 pass.

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
