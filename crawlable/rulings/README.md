# crawlable/rulings/ — the underwriter resolutions ledger

The downstream half of "represent, never resolve". Every conflict/ambiguity in the source
is preserved here as an **OPEN** item with all source variants verbatim. The graph points at
these entries (`conflict.ledger_ref`, `boundary_conflicts[].ledger_ref`, `_doc_conflicts`);
the crawler **escalates** at an open conflict node — it never picks a winner.

**Authoritative rule (PROJECT_CONTEXT §9.4):** `crawlable/` is *generated* from
`representation/` + `crawlable/rulings/`. Never hand-patch a resolution into the graph. To
resolve a conflict, flip its entry to `status: ruled` with the chosen branch + boundary
inclusivity, then regenerate the graph. `representation/` is never edited.

**Per D-P2**, each entry also carries a clearly-labelled **non-binding
`recommended_resolution`** — a drafted suggestion + rationale to speed underwriter review. It
is advisory only; it is *not* encoded in any branch logic and changes no crawl outcome until
an underwriter accepts it and the graph is regenerated.

| id | kind | raised by | status |
|---|---|---|---|
| RUL-MAN-VERSION | version_identity | all manual nodes/tables (`_doc_conflicts`) | open |
| RUL-ROUTER-PRECEDENCE | derived_reading | `root.process_router` | open |
| RUL-X15-HIGHVALUE-READING | derived_reading | `standard.elig.high_value` (X15) | open |
| RUL-CASEUW-C05-RENTACAR | dual_text (blocking) | `case_underwriting.elig.rent_a_car` (C05) | open |
| RUL-FRANQ-MOTO-OVERLAP | overlap (S2 edge) | `TBL-FRANQ-MOTO` | open |
| RUL-CG-2023 | dual_text | clause 2023 (Phase 4) | open |
| RUL-RENOV-CONSUMER-PESADOS-OVERLAP | overlap | T-RENOVACION (Phase 1 rating) | open |
| RUL-BAND-EDGES | undefined_boundary | renovación/moto bands (Phase 1) | open |
| RUL-FLOTA-THRESHOLDS | threshold_variance | flota defn (Phase 1) | open |
| RUL-ALCOHOLEMIA | cross_doc_tension | R-097 / CG exclusion (Phase 1/4) | open |
| RUL-2133-2140 | dual_text | clauses 2133 vs 2140 + 2136/2139 (Phase 4) | open |
| RUL-2038-2112 | dual_text | clauses 2038 vs 2112 Valor Admitido (Phase 4) | open |
| RUL-2008 | dual_text | clause 2008 dual pago parcial (Phase 4) | open |
| RUL-ABSENT-CODES | absent_code | codes 2025/2131/2146 (Phase 4) | open |

**Path convention:** every `ledger_ref` in the graph/tables is written **relative to `crawlable/`**
(e.g. `rulings/RUL-X.md`), not relative to the referring file. `validate.py` and the crawler
resolve them from the `crawlable/` root.

Entries seeded at Phase 0 even when their domain isn't converted yet — the ledger is the
persistent home for every §5b conflict and accumulates across sessions.
