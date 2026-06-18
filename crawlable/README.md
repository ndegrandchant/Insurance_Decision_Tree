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
- `decisions.md` — Part-2 design decisions D-P1…D-P5 + rationale.
- `facts.json` — fact registry (the crawl's input demand contract; typed, sourced, `on_missing`).
- `tables.json` — role-typed parameters incl. the first S2 `bracket_map`. Tables are loaded by
  merging `tables*.json`:
  - `tables_authority.json` — the 3 authority matrices (`matrix_lookup`), **generated** by `build_tables.py`.
  - `tables_rating.json` — the rating tables (S2 brackets, rate matrices, scalars, reference).
- `graph/<section>.json` — executable nodes: `router.json`; `3.1.2` + `3.1.3` (Standard elig +
  authority); `3.3.1` + `3.3.2` (Case-UW elig + authority); `3.5.2` (Licitaciones authority).
- `rulings/` — the conflict ledger (open items, all variants verbatim, non-binding recommendations).
- `crawler/crawl.py` — the engine (JSONLogic evaluator + bracket/matrix lookups + authority +
  escalation + the 3 conflict tiers).
- `crawler/run_cases.py` — demonstration cases (eligibility, router, Case-UW, authority, S2).
- `validate.py` — mechanical validator (the executes-deterministically contract).
- `coverage.py` — the data-loss reconciliation engine (dimension A) → `coverage_manifest.json`, `NOT_CONVERTED.md`.
- `build_tables.py` — mechanical table generator (parse the representation, don't retype).
- `sync_facts.py` — regenerate the `required_by` impact-index from the graph.
- `COVERAGE_REPORT.md` — **the data-loss proof**: reconciliation (A) + per-batch semantic verdicts (B) + backlog. Persistent; accumulates each batch.

## Run it
```
python3 crawlable/build_tables.py        # (re)generate the authority matrices from representation
python3 crawlable/sync_facts.py          # regenerate the fact->node impact index
python3 crawlable/validate.py            # mechanical validator — must be GREEN
python3 crawlable/coverage.py            # reconciliation — must be 372/372 accounted
python3 crawlable/crawler/run_cases.py   # the demonstration cases + full audit trail
python3 crawlable/crawler/crawl.py case.json   # crawl one supplied-facts payload (JSON dict)
```

## Status
**Phase 0 + Phase 1 Batches 1–3a complete.** Validator green; 372/372 source ids accounted;
47 nodes + 22 tables semantically verified (residual drift 0, after Batch 3a's pass caught + fixed
4 quote drifts). Converted: both eligibility trees + the authority stage + 22/24 rating tables.
Next: Batch 3b (rating rules) → Batch 4 (renovación/retroactividad) → Batch 5 (clause links).
Resume from `COVERAGE_REPORT.md` (tail) + `coverage_manifest.json`.
