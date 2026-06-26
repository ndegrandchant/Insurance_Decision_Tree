# PROJECT CONTEXT — LBC Automotores extraction (read this first)

> **Purpose of this file.** A self-contained briefing so a *fresh chat with no memory* can understand this project and start a new task without re-reading everything. Skim §1–§3, then jump to §4 "Task routing" for what to load for your specific job. Working directory: `/Users/nicolasdegrandchant/Desktop/Fable_Approach`.
>
> **▶ Every chat starts by reading `README.md`.** It is the project **map**: reading it makes you
> aware of *every* file and folder and what each is for — so you grasp the true shape of the project
> even though there is a lot of data. You may **not need to open every file it points to**; which ones
> you actually read is your own judgment, driven by the task at hand. But always read the README
> itself — even if you ingest nothing further, you then know what exists and where it lives.
> `README.md` (the map) + this file (the briefing) + `CLAUDE.md` (the rules) are the standing entry
> context for any chat here.

---

## 1. What this project is

Build an **accurate, machine-usable representation of the logic in two Spanish (Bolivia) insurance PDFs** for La Boliviana Ciacruz (LBC), línea Automotores — to be consumed by later automation. Fidelity to the source is the entire value: **never invent, infer, smooth over, or "improve" logic that isn't in the source; represent ambiguity/conflict explicitly, never resolve it silently.**

The two source documents (in the working dir; note the literal `:` in the filenames — always quote paths):
- `AUTOMOTORES.:underwriter_manual.pdf` — **underwriting guidelines** (41 pp.): rules, eligibility, exclusions, authority matrices, tariffs, renewal bands. *Decision-shaped.*
- `AUTOMOTORES.:clausulas_generales.pdf` — **registered policy-clause bundle** (311 pp.): Condiciones Generales + Secciones I–VII + a catalog of 144 clauses/anexos with APS "Código Asignado" codes. *Contract-text-shaped.*

The two were deliberately modeled **differently** (see `decisions.md` D1): the manual → rules + tables + decision trees; the clauses → a registry keyed by APS code + verbatim texts + a structured base policy. **Not** everything is a decision tree.

## 2. Status (current)

- **Part 1 — high-fidelity extraction + verification: COMPLETE and verified.** Mechanical checks pass 100%; every derived field got an independent fresh-context semantic pass; findings fixed and logged.
- **Part 2 — turn this into a crawlable decision tree: COMPLETE and verified.** Built under `crawlable/` (executable crawler + 61 nodes + 29 tables + an **18**-entry conflict ledger — 16 UW + 2 coverage), following `Crawlable_Roadmap.md`. Validator GREEN (now engine-aware over the shared ledger — D-P9); 372/372 source ids accounted (0 deferred); residual semantic drift 0 (including a second, independent dimension-B vote). See `crawlable/CONVERSION_RECORD.md` (what/how + fix log) and `crawlable/COVERAGE_REPORT.md` (the data-loss proof).
- **Part 3 — the platform (`platform/`, `deploy/`): a first version, built upward by santi.** A FastAPI backend + reusable engine + React frontend + Postgres + Docker/VPS deploy that **consumes** the graph at runtime (UW decisions, a coverage-adjudication engine on 2 of 7 Secciones, advisory NL extraction, isolated pricing). It does **not** edit `representation/` or hand-patch the graph. Design decisions: root `decisions.md` **D-PLAT-1…D-PLAT-20**.
- **▶ North Star — clause-impact analysis:** edit one clause → see every outcome it moves + the citation trail. Two halves: full-policy coverage (P5-COV) + the rule↔clause dependency graph (P4/O16). See `Crawlable_Roadmap.md` §North Star + dashboard.
- **▶ To extend or re-run Part 2**, see `crawlable/README.md` (run commands); §9 of this file records the entry point, canonical schema, and output layout Part 2 followed.

## 3. The artifacts (what exists, and what each is for)

*(`representation/` has its own full guide — `representation/README.md` — a field-level reference + consumption guide for every Part-1 artifact. The map below stays as a quick briefing.)*

**Underwriting manual** → `representation/underwriting_manual/`
- `document.json` — identity, version history/change log, structural inconsistencies, source artifacts.
- `rules.json` — **84** atomic rules: `id`, `source{pdf_page,printed_page,section}`, `type`, `applies_to`, `logic` (structured reading), `quote_verbatim` (Spanish trigger), `flags`, `table_ref`/`tree_ref`.
- `tables.json` — **24** parameter tables, provenance-tagged `verbatim_table` (transcribed grids) vs `parameter_digest` (prose params; labels editorial, values verbatim).
- `decision_trees.json` — **4** trees (only where the source branches): `T-ELIG-ESTANDAR`, `T-ELIG-CASEUW`, `T-RENOVACION`, `T-RETROACTIVIDAD`.
- `cross_references.json`, `supplementary.json` — pointers out (manuals/laws/systems) and supplementary material (products, examples, glossary, dates), tagged distinct from decision logic.

**Cláusulas generales** → `representation/clausulas_generales/`
- `document.json` — bundle map, the APS code system, reprint/conflict analysis, the clause-2023 conflict.
- `clause_registry.json` — **152** entries, one per distinct APS code (base + 7 secciones + 144 cláusulas); each has `prints[]`, reprint-variation class, and a tagged `derived_classification` (effect, usage restriction, parameters, conditions, references, anomalies).
- `clause_texts/` — **168** verbatim text files (one per code; codes printed with differing text are split per print, e.g. `CG-2023__print_p51.txt` / `__print_p237.txt`). **Canonical** — derived fields never replace these.
- `base_policy.json` — structured Condiciones Generales: prelación, 19 definiciones, 30 consideraciones blocks, obligaciones a)–j), exclusiones (3 groups), Secciones I–VII parameters, invalidez scale.
- `cross_references.json` — laws/entities the clauses cite.

**Cross-document** → `representation/linkage.json` — maps manual mentions ↔ clause codes, with match-confidence and tensions.

**Crawlable graph (Part 2)** → `crawlable/` (generated from `representation/` + `crawlable/rulings/`; the top-level `README.md` map has the exhaustive file list)
- `node_schema.md` — the authoritative node schema (borrowed spine + **S1** fidelity fields + **S2** decision tables); `decisions.md` — the Part-2 design decisions.
- `graph/*.json` — the executable **61** nodes (router + one per section); `facts.json` — the input-fact registry; `tables.json` + `tables_{authority,rating,renovacion}.json` — **29** role-typed parameter/decision tables.
- `rulings/` — the conflict ledger (**18** OPEN rulings: 16 UW + 2 coverage; the crawler escalates here, never resolves).
- `crawler/crawl.py`, `validate.py`, `coverage.py`, `build_*.py` — the engine, the deterministic-execution validator, the data-loss reconciler, the mechanical generators.
- `COVERAGE_REPORT.md` — the data-loss proof (372/372 ids, 0 deferred); `CONVERSION_RECORD.md` — exactly what/how + the fix log (§8) and open items (§9); `README.md` — run commands.

**Coverage engine (a second crawlable engine, santi)** → `crawlable/graph_coverage/` + `facts_coverage.json` + `coverage_validate.py` + `coverage_reconcile.py` + `coverage_slice_manifest.json` + `COVERAGE_SLICE_REPORT.md`. Adjudicates policy coverage (covered/not-covered/refer) with its own node schema, sharing the one `rulings/` ledger. A deliberate **2-of-7-Secciones slice** (III + V; D-PLAT-3) — see `Crawlable_Roadmap.md` P5-COV.

**Platform (Part 3, santi)** → `platform/` (FastAPI backend + `insurance_engine/` reusable engine + React frontend + Postgres `db/`) + `deploy/` (Docker/Caddy/VPS). Consumes the graph at runtime; `lbc_auto_rating.py` is an isolated non-source-anchored rating compartment; `ai_parser.py`/`nl.py` are advisory-only behind a never-fabricate wall. Full guide: `platform/README.md` + `platform/engine/README.md`.

**Methodology & planning docs** (workspace root)
- `decisions.md` — every design decision + rationale (D1–D13). *Read before changing structure.*
- `verification_report.md` — how it was verified, all findings + dispositions, and the honest residual-risk boundary (§4).
- `README.md` — **the project map / front door**: every file and folder in the project with its purpose, a "start here" routing table, and the project-wide conventions. Read it first (see the callout up top).
- `Manual Prompt.md` — **the reusable playbook**: how to approach *any* manual (recon → mechanical extract → schema-bound subagents → two-layer verify). This is the engine for future manuals.
- `Crawlable_Migration_Notes.md` — curated list of what to borrow from "Approach 1" (the other project) when making this crawlable, and what *not* to.
- `Crawlable_Roadmap.md` — **the Part-2 plan**: 10 phases (Phase 0 prove-core-first … Phase 10 per-manual loop), the skeleton decision, and Tasks **S1** (fidelity fields per node) and **S2** (bracket/band → DMN decision tables).
- `Crawlable_Conversions.md` — **the reusable Part-2 playbook**: how to turn *any* verified representation into a crawlable graph (manual-agnostic; the Part-2 analog of `Manual Prompt.md`).
- `decision_trees_view.html` — self-contained visual viewer of the 4 trees (graph + JSON). Regenerate with `python3 work/generate_tree_view.py` after editing `decision_trees.json`.
- `CLAUDE.md` — project behavioral guardrails (accuracy-first, make-the-call, simplicity-with-the-supplementary-exception, verify-against-source).

**Working/audit files** (`source_text/`, `work/`) — not deliverables, kept for reproducibility:
- `source_text/underwriter_manual.txt`, `source_text/clausulas_generales.txt` — page-anchored text extraction (`===== PAGE n =====` markers = physical PDF pages). **This is the audit base every anchor checks against.**
- `work/` — parser outputs, table dumps, the per-batch subagent classifications, rendered formula image (`manual_p26_formula.png`), the viewer generator.

## 4. Task routing — what to load for a given job

| If your new task is… | Read first | Then |
|---|---|---|
| Understand the whole thing | **`README.md` (the file-by-file map)**, then this file | `decisions.md` |
| Run / extend the crawlable graph (Part 2) | `crawlable/README.md` (run commands) + `crawlable/node_schema.md` | `crawlable/CONVERSION_RECORD.md` (what's built) · `Crawlable_Conversions.md` (the method) |
| Edit/extend the decision trees | `decision_trees.json` + `decisions.md` D2 | regenerate `decision_trees_view.html` |
| Work on a clause | `clause_registry.json` entry → its `clause_texts/CG-*.txt` | `base_policy.json` for the base it modifies |
| Pricing / authority / franquicias | `tables.json` (single source of truth for numbers) | `rules.json` rules that `table_ref` them |
| Apply this method to a NEW manual | `Manual Prompt.md` | `decisions.md` for worked examples |
| Audit/verify any claim | `source_text/*.txt` (page-anchored) | `verification_report.md` for method |
| Resolve a flagged conflict | **don't, unless explicitly told** — see §5 | route it through the `crawlable/rulings/` conflict ledger |

## 5. Hard rules any task must follow (non-negotiable)

1. **Accuracy over everything.** Don't invent/infer/smooth logic not in the source.
2. **Verbatim is canonical; derived is tagged.** The `clause_texts/` files and `quote_verbatim` fields are source truth; `logic`/`derived_classification`/summaries are *readings*, marked derived. Never let a paraphrase overwrite the verbatim.
3. **Anchor everything** to `pdf_page` (physical) + section + (manual only) `printed_page` (= pdf_page − 7). Quote the trigger text.
4. **Represent conflicts; never resolve them silently.** The known ones are *facts to preserve*, not bugs to fix (§5b).
5. **Original-language terms stay verbatim** (franquicia deducible, plaza de circulación, eje troncal, prima ganada, siniestralidad…). Typos preserved with `[sic]`.
6. **Mechanical before model.** Bulk verbatim text was sliced by parser from `source_text/`, not retyped. Keep it that way.

### 5b. Known source conflicts/ambiguities (do NOT silently resolve any of these)
- **Clause 2023** printed twice with *different operative conditions* (license "vigente al momento del evento" p.51 vs "vigencia sea mayor al vencimiento de la póliza" p.237). Both texts kept.
- **Manual version identity**: cover/changelog say "4.0", page headers + info table say "3.0".
- **Manual TOC numbering ≠ body numbering** in §3.1.5.x–3.1.8 (artifacts cite the *body* numbering).
- **"Flota" threshold differs by context**: ≥3 (PN con NIT), from the 2nd vehicle (Empresas livianos), "uno o más" (Commercial), ≥4 (Consumer).
- **Renovación overlap**: Consumer bands vs the separate Pesados/motos scheme contradict for a Consumer-segment pesado (e.g. 55% siniestralidad → "mismas tasas" vs "+17%"). Captured as `conflict_flag` in `T-RENOVACION`.
- **Band boundaries undefined**: 50/51, 60, 250 edges — inclusivity unstated.
- **Alcoholemia**: CG exclusion 0.50 g/1000 ml vs manual's 0,70 g/l licitación cap.
- **Clauses 2133 vs 2140** share a title with contradictory content (aranceles médicos).
- **Codes 2025, 2131, 2146** absent from the bundle (recorded, not inferred).

## 6. The two-approaches context + the strategic decision

There is a **second, separate project** by the same user — "Approach 1" — at:
`/Users/nicolasdegrandchant/Desktop/Manual_Processor/lbc_decision_trees/manual_processor/Approach1/lbc_extraction1/lbc-extractor/`
It is an *executable, crawlable graph* (its `output/graph.json`, `output/graph/<section>.json`, `output/tables.json`, a `src/` pipeline, `schema.py`, tests). It covers the **underwriter manual only** (not the clauses), with paraphrase-as-canonical and section-level verbatim.

**The agreed Part-2 strategy: "their skeleton, our data."** Reuse Approach-1's node schema (types: `router/gate/condition/authority/referral/accumulator/terminal`; enumerated outcomes; `needs_facts`; `evaluate`; `@tables.*`) as the spine — it's proven and DMN-aligned — and pour *this* project's higher-fidelity data into it, with two additive extensions (Roadmap Tasks **S1** fidelity fields per node, **S2** bracket/band as DMN decision tables). Do **not** design a new skeleton. Full reasoning: `Crawlable_Migration_Notes.md` and `Crawlable_Roadmap.md` §Skeleton.

## 7. Environment & gotchas

- **Python 3.13**; deps used: `pdfplumber`, `pypdf`, `pypdfium2` (install with `pip3 install --user <pkg>` if missing). No `pdftotext`/`pdfinfo` on this machine.
- **Quote all paths** — the PDF filenames contain a literal colon (`AUTOMOTORES.:…pdf`).
- **`pdf_page` is the physical PDF page** (what a reader opens, 1-based). The manual also has a printed "Página n" = `pdf_page − 7`. The cláusulas bundle has no printed page numbers.
- **Regenerate the tree viewer**: `python3 work/generate_tree_view.py` (reads `decision_trees.json`, rewrites `decision_trees_view.html`).
- All JSON is UTF-8 and parses cleanly (22 representation artifact files; the `crawlable/` graph adds more).
- The model that produced and verified this work is **Opus 4.8 (1M context)**; the method is designed so fidelity is method-driven, not model-dependent (see `Crawlable_Roadmap.md` §On Fable's ban).

## 8. One-line glossary (so a new chat isn't lost)
Suscripción = underwriting · Estándar/Case Underwriting/Masiva/Licitaciones/Automática = the 5 underwriting processes · siniestralidad = loss ratio · franquicia deducible = deductible · prima = premium · plaza de circulación = registration locale · eje troncal = the main-cities zone · Valor Asegurado (VA) = sum insured · RC = Responsabilidad Civil · HMACC-AMITT = strikes/riots/malicious-acts/terrorism cover · APS = the Bolivian insurance regulator · RUAT = vehicle registry · Código Asignado = the APS registration code that is each clause's identity.

---

## 9. Starting Part 2 (crawlable) — entry point, canonical schema, output layout

> **Part 2 is COMPLETE (see §2).** This section is not a TODO — it is the historical build spec and the canonical schema / output-layout reference Part 2 followed. Read it to *understand or extend* the graph (or to reuse the schema for a new manual), not to build Part 2 from scratch.

### 9.1 Where to start (don't skip to bulk conversion)
Begin at **`Crawlable_Roadmap.md` Phase 0** — prove ONE vertical slice end-to-end before converting everything:
1. Hand-graft one path to executable form: Standard eligibility gate → a few exclusions (include one liftable, e.g. antique-vehicle) → `refer_process` to Case UW → an outcome, plus the high-value branch that reads `@tables`.
2. Build a **minimal crawler**: pulls facts via a stub adapter, fires `on_missing`, applies `hit_policy`, returns an outcome **with its audit path** (nodes fired, source citations, facts used).
3. Add **escalation-with-context** (refer *this one question* + the missing fact + which node).
4. Resolve 3 cases (clean accept, clean decline, liftable exception both ways). **That milestone = the architecture is proven.** Only then convert the rest (Phase 1).

### 9.2 Canonical node schema — copy it, don't reinvent it
The agreed strategy is **"their skeleton, our data."** The Approach-1 reference files are **already copied into this workspace** at `reference_approach1/` — a fresh chat does NOT need to reach the other project (its directory has ~2,000 files; you only need these 7, ~88 KB). Read, as the authoritative schema reference, and reproduce the node shape:
- `reference_approach1/schema.py` — the typed contract (NODE_TYPES, OUTCOMES, REFERRAL_KINDS, required fields).
- `reference_approach1/graph/3.1.2.json` — **the hand-validated few-shot exemplar**; the single best template for an eligibility section.
- `reference_approach1/graph/router.json` — the process router shape.
- `reference_approach1/graph/4.1.json` + `reference_approach1/tables.json` — rating/bands + the role-typed table buckets.
- `reference_approach1/NEEDS-FACTS-TEMPLATE.md` — the fact-registry template.
- `reference_approach1/A-PROJECT-TODO-SEQUENCE.md` — the original roadmap (context for `Crawlable_Roadmap.md`).

(These are frozen snapshots — see `reference_approach1/README.md`. Originals live under `/Users/nicolasdegrandchant/Desktop/Manual_Processor/lbc_decision_trees/manual_processor/Approach1/`; re-copy if that project evolves. Reuse the schema *shape*, not its LBC values — the data comes from this project's `representation/`.)

**Target node = their fields + our two fidelity extensions** (`Crawlable_Roadmap.md` Tasks **S1**, **S2**):
```
their spine:  id · type(router|gate|condition|authority|referral|accumulator|terminal) ·
              process · order · needs_facts[] · evaluate / branches[{when,outcome,target,reason}] ·
              exception{liftable,authority_required,conditions[],cases[],on_lift/no_lift_outcome} ·
              outcome(eligible|conditional_eligible|decline|refer_authority|refer_process|refer_line) ·
              referral_target{kind,name} · hit_policy · on_no_match · source{section,page,version}
+ S1 (ours): source_quote (verbatim trigger, sentence-level — copy from rules.json/clause_texts, never paraphrase) ·
             source.version · conflict{both_texts, ledger_ref}  (replaces a bare needs_human_review boolean)
+ S2 (ours): bracket/band tables as decision tables — rows with lower/upper + lower_inclusive/upper_inclusive
             + hit_policy; ambiguous edges (50/51, 60, 250) → needs_human_review row → ledger, never a silent inequality
```

### 9.3 Which source artifacts feed the graph
- **Logic** ← `representation/underwriting_manual/rules.json` (84 rules) + `decision_trees.json` (the 4 branch-shaped trees). The trees are NOT the whole logic — most eligibility/authority/rating lives in `rules.json`.
- **Parameters** ← `representation/underwriting_manual/tables.json` (single source of truth for every number; keep `verbatim_table`/`parameter_digest` provenance; build S2 decision tables here).
- **Audit-trail / clause side** ← `clause_registry.json` + `clause_texts/` + `base_policy.json` + `representation/linkage.json` (rule→clause edges; reverse is a free inversion). The "vehículo pesado" term is defined in the clauses and used uncited in the manual — proof the two must link.

### 9.4 Output layout (write Part-2 artifacts HERE — keep `representation/` untouched)
```
crawlable/
  node_schema.md          # the merged target schema (9.2), written once, authoritative
  facts.json              # fact registry (typed, sourced, on_missing) — Phase 3
  graph/<section>.json    # executable nodes per section
  tables.json             # role-typed tables incl. S2 decision tables (referenced as @tables.*)
  rulings/                # versioned ledger of underwriter resolutions (markdown/JSON)
  crawler/                # minimal crawler + escalation (Phase 0/5)
```
**Single source of truth:** `crawlable/` is *generated* from `representation/` + `crawlable/rulings/`. Never hand-patch a resolution into the graph — record it in `rulings/` and regenerate (Roadmap Phase 2). `representation/` stays the verbatim fidelity source and is not edited by Part-2 work.

### 9.5 Per-chat done-check (carry the verification discipline)
A Part-2 chat's output isn't done until a validator passes: every `fact` in an `evaluate` is defined in `facts.json`; every `@tables.x` resolves; every `referral_target` exists; every `outcome` ∈ the enum; every router/gate has `hit_policy` + `on_no_match`; no unreachable leaf; no band boundary ambiguous unless flagged to a ruling; every node has a `source_quote`. (This extends the existing `verification_report.md` harness from "matches source" to "executes deterministically.")

### 9.6 What the human still supplies in the prompt
This file + CLAUDE.md + the local `reference_approach1/` schema = enough to start without guessing, and **everything needed is inside this workspace** (no other project required). The prompt itself only needs to say: **(a)** the absolute working dir (`/Users/nicolasdegrandchant/Desktop/Fable_Approach`), and **(b)** which phase/task to do (e.g. "do Phase 0"). Nothing else.
