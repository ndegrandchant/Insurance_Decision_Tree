# STRESS_REPORT.md — runtime-conflict stress test of the crawlable graph

> **What this is.** The machine report of a non-destructive stress test of the crawler's **runtime
> conflict handling** (Part-1 mitigation). It turns "`validate.py` is GREEN" into a *proven*
> property: **no supplied input yields a confident outcome where the source contradicts itself or
> leaves a value undefined — such a case must escalate or carry a loud non-binding caveat.**
>
> **For a reviewer:** you do **not** need to read the data. Read §3 (Findings) — each row says what
> was found, whether it's fixed/deferred/by-design, and **exactly where to act** (a `rulings/` entry
> to rule on, or an open item to schedule). The conflicts themselves are held OPEN in
> `crawlable/rulings/`; this report never resolves one.
>
> **Run it:** `cd "troubleshoot testing" && python3 run_all.py` (reads `crawlable/` read-only; all
> fault injection is in-memory; **nothing under `crawlable/` is written**). Result at writing:
> **ALL GREEN** — Layers A, B, C, D; 9/9 injected faults caught; 16/16 rulings surfaced-or-justified.

---

## 1. The harness (Layers A–D) — non-destructive by construction

| Layer | File | What it proves | How (no data writes) |
|---|---|---|---|
| **A** snapshot | `layer_a_snapshot.py` | regression guard — every case's outcome + decisive path + caveats + escalation is pinned; drift shows up | captures `golden_snapshot.json`; diffs current vs golden |
| **B** properties | `layer_b_properties.py` | runtime invariants over *generated* inputs: band edges escalate w/ ledger & interiors resolve; authority `<=` inclusive; missing facts escalate gracefully (no crash); determinism; type-fuzz → escalate not crash | sweeps/fuzz against a read-only `Crawler` |
| **C** mutation | `layer_c_mutation.py` | the checks are **load-bearing** — inject a feared fault, assert a check goes red | deep-copies the loaded crawler in memory, mutates the **copy**, discards it |
| **D** cross-audit | `layer_d_crossaudit.py` | every OPEN ruling is **runtime-surfaced or explicitly justified**; resolves G1/G3; measures O3 | static ref-scan + dynamic corpus surfacing |

Shared substrate: `_harness.py` (imports only the clean `crawl` module; replicates the `run_cases.py`
payloads as the corpus). It never imports `validate.py`/`run_cases.py` (both execute on import) and
never writes to `representation/`, `graph/`, `tables*.json`, `facts.json`, or `rulings/`.

## 2. What held (the core property is confirmed, not just asserted)

- **Band edges (runtime-consumed renovación tables):** every declared edge (Consumer 60/150/250;
  pesados/motos `(50,51)` gap + 250) **escalates with a `ledger_ref`**; no input hits an *undeclared*
  gap/overlap; clear interiors resolve uniquely.
- **Authority `<=` inclusivity** (probed on the clean Case-UW path): at exactly the limit → within
  (eligible); at limit+1 → `refer_authority`; unknown suscriptor → `refer_authority`; the Lizeth-Rios
  cross-matrix discrepancy caveats **only** on a Lizeth-Rios lookup.
- **Missing-fact matrix:** deleting any of the 50 supplied facts yields a clean outcome **or** a
  graceful escalation in the declared `on_missing` mode — **never a crash** (32 facts demonstrably
  escalate; the rest are off-path and correctly not demanded — short-circuit works).
- **Determinism:** identical input twice, and with permuted fact-dict order → byte-identical outcome
  + path.
- **Type fuzz:** wrong-typed numeric facts on-path → `evaluation_error` escalation; never a crash,
  never a confident outcome.
- **Mutation testing:** **9/9** injected faults caught (flip band inclusivity; delete a
  `boundary_conflicts` entry; remove C05 `blocking`; remove X15 `conflict`; router `unique→first`;
  nudge an authority limit; re-tier blocking→caveat; drop a `source_quote`; drop `_doc_conflicts`).
- **Conflict cross-audit:** all **16** OPEN rulings are runtime-surfaced (6) or justified —
  reference-only contract text (5), latent S2 (1), document-level (1), ledger-only-by-design (3).

## 3. Findings — and where to act

| # | Finding | Class | Status | Where to act |
|---|---|---|---|---|
| **G1** | `RUL-MAN-VERSION` (v3.0/4.0 identity) was referenced 14× via `_doc_conflicts` but surfaced on **zero** outcomes — the crawler never read `_doc_conflicts`. | real (silent omission) | **FIXED** — now surfaced once per result as `document_provenance`; `validate.py [11]` + `[9]` check it. | to *rule* the version identity: `rulings/RUL-MAN-VERSION.md` |
| **F1** | `bracket_lookup` cited `boundary_conflicts[0]` regardless of which edge was hit (a 150% value reported edge 60). Safe (right ledger) but misleading in the audit trail. | real (audit fidelity) | **FIXED** — now attributes to the nearest/containing declared edge. | — |
| **G2** | Nothing asserted that every OPEN ruling is actually surfaceable/anchored — a new conflict could be added that no input ever shows. | real (coverage gap) | **FIXED** — `validate.py [11]` conflict-coverage check (proven load-bearing: catches an unanchored ruling). | — |
| **G3** | `RUL-ALCOHOLEMIA` and `RUL-FLOTA-THRESHOLDS` are seeded but have **no in-data back-pointer** (not even in reference capture). | traceability | justified (ledger-only-by-design, with reasons in `validate.py`) | anchor when those domains are node-ified — `rulings/RUL-ALCOHOLEMIA.md`, `rulings/RUL-FLOTA-THRESHOLDS.md` |
| **O3** | Lift/branch terminal outcomes don't re-enter later stages: an early lift (antique→conditional) terminates before `high_value`(X15) and `authority`, so those nodes are unreachable for lifted cases. | by-design (deferred) | **DEFERRED to Phase 5** (your call). Measured, not fixed. | `CONVERSION_RECORD.md` §9 (O3) |
| **L1** | The S2 rating tables `TBL-FRANQ-MOTO` / `TBL-TAR-MOTO` / `TBL-FRANQ-EMPRESAS` are consumed by **no** runtime node (rating stage deferred); and `bracket_lookup` ignores `special_rows`, so the franquicia-lujo precedence (`RUL-FRANQ-MOTO-OVERLAP` / `RUL-BAND-EDGES` @420000) will **not** escalate when the table is wired. | by-design (deferred) + forward-looking | DOCUMENTED open item | wire + extend `bracket_lookup` for `special_rows` when building the rating stage; `rulings/RUL-FRANQ-MOTO-OVERLAP.md` |
| **L2** | The router's `consumer_fleet_4plus` branch encodes the ≥4 flota threshold but carries no `RUL-FLOTA-THRESHOLDS` provenance caveat. Judgment call (the variance is across §3.1.5 tarification contexts, not this branch). | candidate | **REVIEWED in Layer E — declined** (majority: the enum fixes the Consumer segment, so ≥4 is unambiguous there; a caveat would be noise) | `rulings/RUL-FLOTA-THRESHOLDS.md` (Layer-E note) |

**Reserved decisions (your answers, applied):** G1 → *doc-level metadata, surfaced once* (safest,
clearly visible, snapshot-stable). O3 → *defer to Phase 5*.

**Update (2026-06-19) — bucket-1 correction pass applied.** The "fixable-now" items are now FIXED &
verified (all outcome-preserving): **O12a** (`bracket_lookup` escalates the `special_rows` precedence),
**router caveat** noise removed (L2-adjacent), **O5** (`governing_clauses` on outcomes), **O14** (the
licitaciones prohibition gates above). L1 → O12a done. R2 + reference second-vote → **O15** (deferred,
reference-side). Full fix log: `crawlable/CONVERSION_RECORD.md` §8H; **FIXED-vs-NOT-FIXED scoreboard at
§9.0**.

## 4. Fixes applied (all outcome-preserving — snapshot stayed stable)

1. **`crawler/crawl.py`** — `bracket_lookup` attributes the escalation to the edge actually hit (F1);
   `load_doc_conflicts()` + `document_provenance` surfaced once per result (G1).
2. **`validate.py`** — check `[11]` conflict-coverage (every OPEN ruling surfaced-or-justified) +
   `[9]` extended to `_doc_conflicts` ledger refs (G2 / G1-checked).

**Verification after fixes:** `validate.py` **GREEN** (56 nodes / 50 facts / 29 tables / 48 reference
rules / 214 clause-side / 16 rulings); `coverage.py` **372/372**; `run_cases.py` runs; Layer-A
snapshot **stable** (decision outcomes unchanged); `run_all.py` **ALL GREEN**; `[11]` proven to catch
a deliberately unanchored ruling, then reverted.

## 5. Deferred (next passes, not data loss)

- **Layer E — fresh-context multi-vote tier review — ✓ DONE (2026-06-19).** 9/11 tiers confirmed, 0
  silent-resolution holes, no tier flipped; 4 dissents represented in the ledger. Results in §6 +
  `layer_e_verdicts.json`.
- **O14 — ✓ DONE (2026-06-19).** R-097's licitaciones prohibited-condition list is node-ified (5 gates):
  a tender requesting alcoholemia > 0,70 / Valor Admitido / licencia vencida > 90d / permisos de
  velocidad now **declines**, AP-en-carrocería **refers**, and RUL-ALCOHOLEMIA surfaces at runtime.
  → `CONVERSION_RECORD.md` §8H4.
- **O3 stage-chaining** (Phase 5): continue eligible/conditional outcomes through authority→rating.
- **O12b — rating-stage wiring** (Phase 5): wire the latent S2 franquicia/tarifa tables. *(O12a done:
  `bracket_lookup` already escalates their `special_rows` precedence so it can't silently resolve.)*
- **O15 — Part-1 reference re-verification** (reference-side): R2 (re-read the 10 presentational
  reprints) + a second fresh-context vote over the clause/base-policy reference capture. Reclassified
  out of "fixable-now" — reference-side and lower-stakes than the executable logic.
- **Reference-side residuals R1 / R3** (clause OCR, linkage confidence) — not runtime; Part-1.

## 6. Layer E — conflict-tier review (multi-vote, fresh-context)

Three independent fresh-context verifiers, distinct adversarial lenses (V1 under-surfacing / V2
over-escalation / V3 missing-executable-surfacing), judged all 11 conflict items against the verbatim
`rulings/` + `crawl.py` tier logic. Majority vote per item; raw verdicts in `layer_e_verdicts.json`.

**Verdict: 9/11 tiers confirmed correct (≥2/3), 0 silent-resolution holes, no tier flipped.** Tiers are
modeling calls the underwriter owns, so a lone dissent is *represented* (ledger), never used to flip a
tier (represent-don't-resolve).

| conflict | tier | vote | disposition |
|---|---|---|---|
| C05 rent-a-car | BLOCK | 3/3 | confirmed |
| RENOV consumer-pesado overlap | BLOCK | 3/3 | confirmed |
| BAND-EDGES | ESCALATE | 3/3 | confirmed |
| ROUTER-PRECEDENCE | CAVEAT + ESCALATE | 3/3 | confirmed (single-route caveat = mild over-surfacing, harmless) |
| LIZETH-RIOS | CAVEAT | 3/3 | confirmed (one process per crawl → never both matrices) |
| FRANQ-MOTO-OVERLAP | latent → ESCALATE | 3/3 | confirmed (tracked O12) |
| clause bundle (5 rulings) | REFERENCE-ONLY | 3/3 | confirmed |
| **X15 high-value** | CAVEAT | 2/3 | kept; V1: validated→`eligible` may be an unsupported accept → ledger sub-question #3 |
| **MAN-VERSION** | DOC-LEVEL | 3/3 tier | kept; V1: note understated data-currency risk → ledger note |
| **ALCOHOLEMIA** | REFERENCE-ONLY | 2/3 | cross-doc tier kept; V3: R-097 prohibition list is unwired executable logic → **O14** |
| **FLOTA** | REFERENCE-ONLY | 2/3 | kept; V3 router-caveat declined by majority → ledger note |

**Net:** no code or tier change — four ledger/doc enrichments (X15, MAN-VERSION, ALCOHOLEMIA, FLOTA) +
one new open item (O14). `validate.py` GREEN, Layer-A snapshot stable.
