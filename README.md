# LBC Automotores — Project Guide & Document Map

This workspace turns two Spanish (Bolivia) insurance PDFs from **La Boliviana Ciacruz (LBC), línea
Automotores** into machine-usable logic — and a platform that runs on it — in **three layers**:

- **Part 1 — the representation** (`representation/`): a high-fidelity, verbatim-anchored extraction
  of both PDFs (rules, parameter tables, decision trees, clause registry, base policy). Faithful to
  the source, but *not executable*. **Complete + verified.**
- **Part 2 — the crawlable graph** (`crawlable/`): Part 1 compiled into an *executable, crawlable
  decision graph* — a crawler + decision nodes + DMN-style tables + a conflict ledger — with a
  two-dimension proof that **no source data was lost**. **Complete + verified** (validator GREEN).
- **Part 3 — the platform** (`platform/`, `deploy/`): a FastAPI backend + a reusable engine + a
  React frontend + Postgres + Docker/VPS deploy that **consumes** the graph at runtime (UW
  decisions, a coverage-adjudication engine, advisory NL extraction, pricing). It does **not** edit
  `representation/` or hand-patch the graph. *A first version, built upward on the verified core.*

> **▶ North Star:** clause-impact analysis — *edit one clause, see every outcome it moves, with the
> citation trail* (the "blast radius"). Its two halves are full-policy coverage (P5-COV) + the
> rule↔clause dependency graph (P4/O16); see `Crawlable_Roadmap.md` §North Star.

The one rule the whole project obeys (`CLAUDE.md`): **accuracy first — never invent, infer, or smooth
over logic that isn't in the source; represent conflicts, never resolve them silently.**

> **This file is the map** — what every document is and why it exists. For a deeper *read-this-first*
> onboarding (task routing, the known source conflicts, the borrowed schema), see `PROJECT_CONTEXT.md`.

---

## Start here — where to go for…

| If you want to… | Go to |
|---|---|
| Understand the project fast | this map → `PROJECT_CONTEXT.md` |
| Run or extend the executable graph | `crawlable/README.md` (run commands) → `crawlable/node_schema.md` |
| Read the faithful source extraction | [`representation/README.md`](representation/README.md) (full folder guide) · or §C below |
| See the proof nothing was lost / it executes faithfully | `crawlable/COVERAGE_REPORT.md` (data-loss) · `verification_report.md` (Part-1 + **§4c** runtime-conflict verification) · `troubleshoot testing/STRESS_REPORT.md` |
| Know exactly what was built & fixed (FIXED vs NOT-FIXED) | `crawlable/CONVERSION_RECORD.md` — **§9.0 scoreboard** (at-a-glance) · §8 fix log · §9 open items |
| Apply the method to a *new* manual | `Manual Prompt.md` (extract) → `Crawlable_Conversions.md` (make crawlable) — **note the per-business hardcoding caveat (`Crawlable_Conversions.md` §9/§11)** |
| Run the app (UW + coverage + pricing) | `platform/README.md` → `python3 platform/backend/dev_server.py 8765` |
| See / extend coverage adjudication | `crawlable/COVERAGE_SLICE_REPORT.md` + `crawlable/graph_coverage/`; validate with `crawlable/coverage_validate.py` |
| Audit any claim against the source | `source_text/*.txt` (page-anchored) |
| Resolve a flagged conflict | don't silently — route it through `crawlable/rulings/` |
| Stress-test the crawler / re-verify | `troubleshoot testing/` (`python3 run_all.py`) · `improvement_crawler_test/` (R1/R3 source re-derivation) |

---

## The document map

### A. Orientation & rules (root)
| File | Purpose |
|---|---|
| `README.md` | **This file** — the project map / front door. |
| `PROJECT_CONTEXT.md` | Self-contained onboarding briefing for a fresh chat: what the project is, the artifacts, task routing, the known source conflicts (§5b), and how to start Part 2. *(Parts 1–2 complete + verified; Part 3 — the platform — is a first version built on top.)* |
| `CLAUDE.md` | Behavioral guardrails: accuracy-first, make-the-call-yourself, simplicity-with-the-supplementary-exception, verify-against-source. |

### B. Source inputs & audit base (root)
| File / folder | Purpose |
|---|---|
| `AUTOMOTORES.:underwriter_manual.pdf` | **Source PDF #1** — underwriting guidelines (41 pp): rules, exclusions, authority matrices, tariffs, renewal bands. *Decision-shaped.* |
| `AUTOMOTORES.:clausulas_generales.pdf` | **Source PDF #2** — registered policy-clause bundle (311 pp): Condiciones Generales + Secciones I–VII + 144 clauses by APS code. *Contract-text-shaped.* |
| `source_text/*.txt` | Page-anchored plain-text of both PDFs (`===== PAGE n =====` = physical PDF page). **The audit base every `pdf_page` anchor checks against** — no re-parsing needed. |

### C. Part 1 — the representation (`representation/`, read-only canonical)
The faithful extraction: two source sub-trees + a cross-document linkage file. **This folder has its own full guide — [`representation/README.md`](representation/README.md) — a field-level reference + consumption guide for every artifact; the essentials:**

| Path | Purpose |
|---|---|
| **[`representation/README.md`](representation/README.md)** | **The folder's own full guide** — field-level reference + consumption guide for every artifact below; start here for `representation/`. |
| `underwriting_manual/document.json` | Manual identity, version/change log, structural inconsistencies, source artifacts. |
| `underwriting_manual/rules.json` | **84** atomic rules — id, source anchors, type, `applies_to`, structured `logic`, verbatim Spanish trigger, flags, table/tree pointers. |
| `underwriting_manual/tables.json` | **24** parameter tables (authority matrices, tariffs, primas/franquicias mínimas, surcharges, terms), provenance-tagged `verbatim_table` vs `parameter_digest`. |
| `underwriting_manual/decision_trees.json` | **4** trees — only where the source actually branches (Std + Case-UW eligibility, renovación, retroactividad). |
| `underwriting_manual/cross_references.json` · `supplementary.json` | Pointers out (manuals/laws/systems) + supplementary material (products, examples, glossary, dates), tagged apart from decision logic. |
| `clausulas_generales/document.json` | Bundle map, the APS code system, reprint/conflict analysis. |
| `clausulas_generales/clause_registry.json` | **152** entries (one per distinct APS code): print locations, reprint-variation class, derived classification. |
| `clausulas_generales/clause_texts/` | **168** verbatim clause-text files — one per code (split per print where reprints differ, e.g. `CG-2023__print_p51.txt`). **Canonical; derived fields never replace these.** |
| `clausulas_generales/base_policy.json` | Structured Condiciones Generales: prelación, definiciones, consideraciones, obligaciones, exclusiones, Secciones I–VII, invalidez scale. |
| `clausulas_generales/cross_references.json` | Laws/entities the clause texts cite. |
| `linkage.json` | Manual-mention ↔ clause-code mapping, with match confidence + tensions. |

**Consuming the representation:** eligibility → walk `decision_trees.json` (gate → exclusions, each may carry a `lift_condition`); pricing → `rules.json` R-030…R-044 select the mechanism, numbers live only in `tables.json`; authority → the three matrices in `tables.json` (deliberately unmerged where they differ); wording → `clause_registry.json` → the verbatim `clause_texts/` file → `base_policy.json`; connect the two PDFs → `linkage.json`.

**Part-1 supporting docs (root):**
| File | Purpose |
|---|---|
| `decisions.md` | Part-1 design decisions **D1–D13** + rationale (read before changing representation structure). |
| `verification_report.md` | How Part 1 was verified, all findings + dispositions, and the residual-risk boundary (**§4 / §4b** — the residuals Part 2 inherits). |
| `decision_trees_view.html` | Self-contained visual viewer of the 4 trees (regenerate: `python3 work/generate_tree_view.py`). |

### D. Part 2 — the crawlable graph (`crawlable/`)
The executable deliverable, **generated from `representation/` + `crawlable/rulings/`**. Its own
`crawlable/README.md` carries the run commands.

**Docs & schema**
| File | Purpose |
|---|---|
| `crawlable/README.md` | Part-2 component readme — layout + how to run the pipeline. |
| `crawlable/node_schema.md` | The authoritative node schema: borrowed spine + **S1** (fidelity fields) + **S2** (decision tables); includes the expression-language decision. |
| `crawlable/decisions.md` | Part-2 design decisions (the 4 reserved decisions + D-P1…**D-P9**; D-P9 = the engine-aware shared-ledger validator). |

**Graph + data — the runnable content**
| File | Purpose |
|---|---|
| `crawlable/graph/*.json` | **10** files = the executable **61** nodes: `router.json` + one per section (3.1.2/3.1.3/3.1.4 Standard, 3.3.1/3.3.2/3.3.3 Case-UW, 3.5.2 Licitaciones incl. the R-097 prohibition gates [O14], 4.1 renovación, 4.11 retroactividad). |
| `crawlable/facts.json` | The fact registry — the crawl's typed, sourced input-demand contract (`on_missing` per fact). |
| `crawlable/tables.json` + `tables_authority.json` + `tables_rating.json` + `tables_renovacion.json` | Role-typed parameters, merged at load — authority matrices, rating brackets/rates/scalars, renovación bands: **29** tables incl. the S2 decision tables. |
| `crawlable/rule_buckets.json` | The authoritative source-element → bucket partition (the data-loss accounting backbone). |
| `crawlable/reference.json` · `clauses.json` · `base_policy_ref.json` · `linkage_edges.json` · `crossrefs.json` | The **reference layer** — non-branch content captured *as data, not nodes*: governance/definitions, clause records, base-policy params, rule↔clause edges, outbound pointers. |
| `crawlable/coverage_manifest.json` | Machine-readable reconciliation manifest (output of `coverage.py`). |

**Conflict ledger**
| Folder | Purpose |
|---|---|
| `crawlable/rulings/` | **18** `RUL-*.md` (+README) — every source conflict held OPEN with all variants verbatim and a non-binding recommendation (16 UW-side + 2 coverage-side: `RUL-CG-2027`, `RUL-CG-2045-2053`). The crawler escalates here; **it never resolves a conflict.** |

**Engine & tooling** (Python 3.13, no external deps)
| File | Purpose |
|---|---|
| `crawlable/crawler/crawl.py` | The crawler engine — self-contained JSONLogic evaluator, bracket/matrix/authority lookups, escalation, the 3 conflict tiers. |
| `crawlable/crawler/run_cases.py` | Demonstration cases, each with a full audit trail. |
| `crawlable/validate.py` | Mechanical validator — the "executes deterministically" contract (must be GREEN). **⚠ Hardcodes LBC vocabulary** (`PROCESSES`/`LINES`/`COMMITTEES`): the check *logic* is generic, but those enums are per-business — **review/swap them when reusing on another manual** (`Crawlable_Conversions.md` §9/§11). |
| `crawlable/coverage.py` | Data-loss reconciliation engine (dimension A) → `coverage_manifest.json` + `NOT_CONVERTED.md`. |
| `crawlable/build_tables.py` · `build_reference.py` · `build_clauses.py` | Mechanical generators — parse the representation into tables/reference/clauses (never retype values). |
| `crawlable/sync_facts.py` | Regenerate the fact→node `required_by` impact index. |

**Records & proofs**
| File | Purpose |
|---|---|
| `crawlable/COVERAGE_REPORT.md` | **The data-loss proof** — reconciliation (dimension A) + semantic verdicts (dimension B) + backlog. 372/372 source ids accounted. |
| `crawlable/CONVERSION_RECORD.md` | Exactly what was built and how, the subagent-verification protocol, the consolidated fix log (**§8**), and open items (**§9**). |
| `crawlable/NOT_CONVERTED.md` | Generated — every source id accounted as *deferred* or *excluded* (never silently missing). |

**Coverage layer — a second engine (santi).** A *coverage-adjudication* graph (covered / not-covered / refer), sibling to the UW graph, sharing the one `rulings/` ledger. Currently a **deliberate slice: 2 of 7 policy Secciones** (III Daños Propios + V Robo Parcial; decisions.md **D-PLAT-3**, *not a bug* — see `Crawlable_Roadmap.md` P5-COV).
| File | Purpose |
|---|---|
| `crawlable/graph_coverage/*.json` | The coverage nodes (own schema: `coverage-grant`/`exclusion-check`/`clause-modifier`/`limit-deductible`/`document-duty`). |
| `crawlable/facts_coverage.json` | The coverage engine's fact registry (disjoint from `facts.json`). |
| `crawlable/coverage_validate.py` | The coverage graph's structural validator (parallel to `validate.py`; must be GREEN). |
| `crawlable/coverage_reconcile.py` · `coverage_slice_manifest.json` | The coverage slice's data-loss reconciliation + manifest. |
| `crawlable/COVERAGE_SLICE_REPORT.md` | The slice's clause→node map (Secciones III + V + Obligaciones + Exclusiones). |

### D-bis. Part 3 — the platform (`platform/`) + deployment (`deploy/`)
The runtime that **consumes** the verified graph (it imports `crawler/crawl.py`; it never edits `representation/` or hand-patches the graph). Its own `platform/README.md` + `platform/engine/README.md` carry the detail.

| Path | Purpose |
|---|---|
| `platform/engine/insurance_engine/` | The engine: `UWEngine` (adapter over `crawl.py`), `ArtifactGraphEngine` (reusable runtime for new domains), `catalog.py` (`EngineSpec` registry — the per-domain profile), `coverage.py`, `renewal.py`, `registry.py`. |
| `platform/engine/insurance_engine/lbc_auto_rating.py` | **Isolated** rating compartment — reverse-engineered, **not source-anchored** (D-PLAT-15); called only after an eligible/conditional decision, so the decision path stays auditable. |
| `platform/engine/insurance_engine/ai_parser.py` · `nl.py` | **Advisory** OpenAI NL/vision fact extraction — gated by a never-fabricate confirmation wall (`services._assert_confirmed`); extracted facts stay `confirmed:false` until a human confirms (D-PLAT-6/12). |
| `platform/backend/app/` | FastAPI service layer (`main.py`, `services.py`, `simulation.py`, `broker_control.py`, `scheduler.py`); `dev_server.py` = a no-dependency smoke server; `scripts/smoke.py` = a 40-assertion service-layer regression. |
| `platform/db/schema.sql` · `seed_graph_versions.sql` | Postgres schema (graph versions, portfolio, claims, proposals, simulation, approvals, audit, `human_task`/`chat`). |
| `platform/frontend/` | Vite/React UI (+ a dependency-free static preview) — workflows: Underwriting, Claims, Graph Reviewer, Issues. |
| `deploy/` | `docker-compose.vps.yml` · `Dockerfile.backend` · `Caddyfile` · `VPS_SETUP.md` (Ubuntu 24.04 + HTTPS). |
| `platform/data_discovery_report.md` · `platform/db/import_templates.md` | Platform data-discovery + import notes. |

*(Platform design decisions live in root `decisions.md` **D-PLAT-1…D-PLAT-20**.)*

### E. Reusable playbooks (root) — the transferable method
| File | Purpose |
|---|---|
| `Manual Prompt.md` | The reusable **Part-1** playbook: how to extract *any* insurance manual into a faithful representation. |
| `Crawlable_Conversions.md` | The reusable **Part-2** playbook: how to turn *any* verified representation into a crawlable graph (manual-agnostic). |
| `Crawlable_Roadmap.md` | The Part-2 plan for *this* project — 10 phases, the skeleton decision, Tasks **S1**/**S2**. |
| `Crawlable_Migration_Notes.md` | Curated "what to borrow from Approach 1 (and what not to)" when making this crawlable. |
| `START_PART2_PROMPT.md` | A paste-into-a-fresh-chat transfer prompt to (re)start Part-2 work. |

### F. Reference snapshot (`reference_approach1/`)
| Folder | Purpose |
|---|---|
| `reference_approach1/` | **Read-only frozen snapshots** of the schema files from the separate "Approach 1" project whose node schema this project borrows — *"their skeleton, our data."* Contains `schema.py` (the typed node contract), `graph/*.json` exemplars, `tables.json`, `NEEDS-FACTS-TEMPLATE.md`, `A-PROJECT-TODO-SEQUENCE.md`. **Do not edit.** |

### G. Working / audit / verification (root) — not deliverables
| Folder | Purpose |
|---|---|
| `work/` | Reproducibility scratch: parser outputs, raw table/clause dumps, per-batch subagent classifications, fresh-context verifier transcripts, rendered formula images, the tree-view generator. Kept so every derived artifact can be re-traced; ignore for normal consumption. |
| `troubleshoot testing/` | **Runtime-conflict stress harness** (Part-2 verification): Layers A–D (snapshot · property/fuzz · mutation · conflict-ledger↔runtime cross-audit) + Layer-E tier-review verdicts — proving the crawler never silently resolves a conflict. Reads `crawlable/` read-only; run `python3 run_all.py`. `STRESS_REPORT.md` is the reviewer-facing report. |
| `improvement_crawler_test/` | **Phase-3 trial** — fresh re-derivation of the R1 (clause-OCR) & R3 (linkage) residuals vs source (page-image re-OCR via `render.py`/`crop.py` + linkage re-judgment); `R1_R3_RESULTS.md` is the comparison to the canonical data. |

---

## Project-wide conventions
- **Anchoring.** Everything carries `pdf_page` (physical, 1-based). Manual artifacts also carry `printed_page` (= `pdf_page − 7`, the "Página n" the manual prints). The clause bundle has no printed numbering.
- **Verbatim is canonical; derived is tagged.** `quote_verbatim` / `*_quote` / `clause_texts/` are source truth; `logic`, classifications, and summaries are *readings*, tagged `_derived`. A paraphrase never overwrites verbatim.
- **Ambiguity is data.** Conflicts are represented, never resolved silently — in Part 1 via `flags` / `conflict` fields, in Part 2 via the `crawlable/rulings/` ledger (headline conflicts listed in `PROJECT_CONTEXT.md` §5b).
- **Spanish & numbers preserved** exactly as printed (`Bs. 3.480.000,00`, `2,8%`; source typos kept with `[sic]`).
- **Single source of truth.** `representation/` is the verbatim fidelity source, never hand-edited by Part-2. `crawlable/` is *generated* from it + the ledger — a resolution goes in `rulings/` and is regenerated, **never hand-patched into the graph.**
