# crawlable/ — the executable, crawlable decision graph (Part 2)

Generated from `representation/` (read-only, canonical) + `crawlable/rulings/`. **Never
hand-patch a resolution into the graph; record it in `rulings/` and regenerate.**
`representation/` is the verbatim fidelity source and is not edited by Part-2 work.

## Method docs (read these to understand / reproduce the mechanism)
- **`../Crawlable_Conversions.md`** — the **generalized, manual-agnostic playbook** (the engine
  for converting ANY verified representation into a crawlable graph). The analog of `Manual Prompt.md`.
- **`CONVERSION_RECORD.md`** — the precise, Automotores-specific record of exactly what was done,
  how, and the subagent-verification protocol + findings. The grounding for the generalized playbook.

## Layout
- `node_schema.md` — authoritative merged schema: spine + S1 (fidelity fields) + S2 (decision
  tables). Read first. Includes the expression-language decision (§0).
- `decisions.md` — Part-2 design decisions D-P1…**D-P9** + rationale (D-P9 = the engine-aware shared-ledger validator).
- `facts.json` — fact registry (the crawl's input demand contract; typed, sourced, `on_missing`).
- `tables.json` — role-typed parameters incl. the first S2 `bracket_map`. Tables are loaded by
  merging `tables*.json`:
  - `tables_authority.json` — the 3 authority matrices (`matrix_lookup`), **generated** by `build_tables.py`.
  - `tables_rating.json` — the rating tables (S2 brackets, rate matrices, scalars, reference).
  - `tables_renovacion.json` — the renovación siniestralidad band tables (S2 `bracket_map`) + minimums.
- `graph/<section>.json` — executable nodes (**10** files, **61** nodes): `router.json`; Standard
  `3.1.2` (elig) + `3.1.3` (capacity/authority) + `3.1.4` (RC/AP limits); Case-UW `3.3.1` + `3.3.2`
  + `3.3.3`; Licitaciones `3.5.2` (incl. the R-097 prohibition gates, O14); renovación `4.1`; retroactividad `4.11`.
- `rulings/` — the conflict ledger (open items, all variants verbatim, non-binding recommendations).
- `crawler/crawl.py` — the engine (JSONLogic evaluator + bracket/matrix lookups + authority +
  escalation + the 3 conflict tiers).
- `crawler/run_cases.py` — demonstration cases (eligibility, router, Case-UW, authority, S2).
- `validate.py` — mechanical validator (the executes-deterministically contract).
- `coverage.py` — the data-loss reconciliation engine (dimension A) → `coverage_manifest.json`, `NOT_CONVERTED.md`.
- `build_tables.py` — mechanical table generator (parse the representation, don't retype).
- `sync_facts.py` — regenerate the `required_by` impact-index from the graph.
- `COVERAGE_REPORT.md` — **the data-loss proof**: reconciliation (A) + per-batch semantic verdicts (B) + backlog. Persistent; accumulates each batch.

**Coverage engine (a second engine — santi; a deliberate 2-of-7-Secciones slice, D-PLAT-3):**
- `graph_coverage/*.json` — coverage nodes (own schema: `coverage-grant`/`exclusion-check`/`clause-modifier`/`limit-deductible`/`document-duty`).
- `facts_coverage.json` — the coverage fact registry (disjoint from `facts.json`).
- `coverage_validate.py` — the coverage structural validator (parallel to `validate.py`; must be GREEN).
- `coverage_reconcile.py` + `coverage_slice_manifest.json` — the coverage slice's data-loss reconciliation + manifest.
- `COVERAGE_SLICE_REPORT.md` — the slice's clause→node map (Secciones III + V + Obligaciones + Exclusiones).

## Run it
```
python3 crawlable/build_tables.py        # (re)generate the authority matrices from representation
python3 crawlable/sync_facts.py          # regenerate the fact->node impact index
python3 crawlable/validate.py            # mechanical validator (UW + shared ledger) — must be GREEN
python3 crawlable/coverage_validate.py   # the coverage engine's validator — must be GREEN
python3 crawlable/coverage.py            # reconciliation — must be 372/372 accounted
python3 crawlable/crawler/run_cases.py   # the demonstration cases + full audit trail
python3 crawlable/crawler/crawl.py case.json   # crawl one supplied-facts payload (JSON dict)
```

## Status
**COMPLETE — Phases 0–5 converted, both source documents.** Validator GREEN; 372/372 source ids
accounted (0 deferred); **61** nodes + **29** tables built; residual semantic drift **0** across the
fresh-context verifier passes (including a second, independent dimension-B vote — DRIFT 0). The full
record is `CONVERSION_RECORD.md` (§8 fix log, §9 open items); the data-loss proof is `COVERAGE_REPORT.md`.

**Since (platform merge):** a sibling **coverage engine** (`graph_coverage/`, `coverage_validate.py` GREEN) was added — a deliberate 2-of-7-Secciones slice (D-PLAT-3) — and the conflict ledger grew to **18** (16 UW + 2 coverage). `validate.py [11]` is now **engine-aware** over the shared ledger (D-P9). Current status + the forward plan (incl. the clause-impact North Star): `../Crawlable_Roadmap.md`.
