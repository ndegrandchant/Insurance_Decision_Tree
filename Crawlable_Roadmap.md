# Crawlable Decision Tree — Roadmap (this approach)

> **What this is.** Your Approach-1 master sequence (`A-PROJECT-TODO-SEQUENCE.md`), transferred onto *this* approach — the accuracy-first extraction in `representation/`. Same end goal, same load-bearing order, but re-authored for a different and higher-fidelity starting point. Where this approach is already ahead of where the Approach-1 plan assumed, the phase **shrinks to "complete/reconcile" instead of "build."** Where I've moved a phase, the reason is stated.
>
> **End goal (unchanged).** An underwriter or agent inputs risk attributes and gets back eligibility, routing, authority, pricing, and deductibles — **with a full audit trail to the manual rule *and* the governing contract clause** — built from the Automotores manual + cláusulas, generalizable to other manuals, eventually exportable to DMN.
>
> **The one strategic decision up front (see §Skeleton at the bottom):** do **not** design a new skeleton. Pour *this approach's data* (verbatim-pinned, both documents, conflicts-as-data) into *Approach-1's node schema* (proven, DMN-aligned). **Their skeleton, our data and fidelity.**
>
> Conventions carried from your roadmap: **GATE** = don't start until true. ⚠ = do before the thing it precedes.

---

## What this approach already has (the starting inventory)

| Asset | File | Means we are AHEAD on… |
|---|---|---|
| 84 quote-anchored rules | `representation/underwriting_manual/rules.json` | Phase 1 fidelity (every rule carries verbatim trigger) |
| 24 provenance-tagged tables | `…/tables.json` (`verbatim_table` vs `parameter_digest`) | Phase 3 tables |
| 4 verified decision trees | `…/decision_trees.json` + `decision_trees_view.html` | Phase 1 skeleton seed |
| **Full cláusulas bundle** | `representation/clausulas_generales/` — 152 clauses verbatim + `base_policy.json` (definitions, exclusions, Secciones I–VII) | **Phase 4 — most of it already done, not cite-driven** |
| Conflicts captured **as data** | `document.json` (version 3.0/4.0, clause-2023 dual text, TOC numbering), `conflict_flag`, `band_boundary_flag`, flota thresholds | **Phase 2 — both sides already recorded** |
| Cross-document map | `representation/linkage.json` (match-confidence) | Phase 4 forward edges, partly built |
| Two-layer verification | `verification_report.md` (mechanical 100% + full semantic pass) | Phase 1/7 trust |
| Reusable method | `Manual Prompt.md` | **Phase 8/10 engine** |
| Merge plan | `Crawlable_Migration_Notes.md` | the schema graft for Phase 1 |

The net effect: Approach-1's roadmap front-loads extraction breadth (Phases 1–4 build the graph and stub clauses). **Here that work largely exists** — so the center of gravity moves *earlier* to proving the core, and *later* to standardization.

---

## PHASE 0 — Prove the core on a thin vertical slice ★ moved to the front
*GATE: none. This is the de-risking joint, pulled ahead of breadth (your Phase 5 instinct, executed first).*

**Why first.** You can't know the skeleton is right until a crawler resolves one real case end-to-end. Doing this on **one** hand-grafted slice — before converting all 84 rules — is the cheapest possible proof that "Approach-1 schema + our fidelity fields" actually runs.

0.1 Hand-graft **one** path into executable form: the Standard eligibility gate → a few exclusions (incl. one liftable, e.g. antique-vehicle X12) → `refer_process` to Case UW → an outcome, plus the `valor_asegurado` high-value branch that reads `@tables`. Use the §Skeleton node shape below (machine `evaluate` **beside** the verbatim `source_quote`).
0.2 Build the **minimal crawler**: from a root, pull facts via a stub adapter, fire `on_missing`, apply `hit_policy`, return an outcome **with its audit path** (nodes fired, clause/manual citations, facts used).
0.3 **Escalation-with-context** from day one: when it can't resolve, refer *this one question* — partial path + exact missing/blocking fact + which node and why. (Your highest-value feature; cheap to stub now.)
0.4 Run 3 cases: a clean accept, a clean decline, and the liftable exception (both outcomes). ✅ **Milestone:** the architecture resolves a real case with an audit trail. Only now invest in breadth.

---

## PHASE 1 — Graft the executable spine onto the fidelity layer (the skeleton)
*GATE: Phase 0 proved the shape. This converts the representation into a resolvable graph.*

1.1 Adopt the **Approach-1 node schema** (`router|gate|condition|authority|referral|accumulator|terminal`; outcomes `eligible|conditional_eligible|decline|refer_authority|refer_process|refer_line`) **extended with fidelity fields** (`source_quote`, `source.version`, provenance tag, a first-class `conflict` object) — see §Skeleton and `Crawlable_Migration_Notes.md` A1–A5.
1.2 Convert `rules.json` + `decision_trees.json` into nodes: add `needs_facts`, `evaluate`/`branches` (machine-readable), map our `lift_condition`/`lift_conditions` → `exception{liftable, authority_required, conditions, cases[], on_lift/no_lift_outcome}`, and turn prose outcomes into enumerated outcomes + `referral_target`s pointing at real node ids.
1.3 ⚠ Keep the verbatim on the node. Every converted node carries the `source_quote` it came from — **fidelity is not deferred to Phase 8 here** (the data already exists; don't re-earn it later). This is the single biggest divergence from the Approach-1 order.
1.4 **Validator (adopt DMN discipline early):** exhaustiveness (every input lands somewhere) + overlap (two branches satisfiable at once with no precedence) + `hit_policy`/`on_no_match` present on every router/gate + **every `fact` defined in the registry, every `@tables.x` resolvable, every `referral_target` exists, every outcome ∈ enum, no unreachable leaf.** This *extends our existing verification harness* (`verification_report.md`) from "matches source" to "executes deterministically."

1.5 **▶ Skeleton Task S1 — add fidelity fields to every node (do it *during* conversion, never as a later Phase-8 retrofit).** Alongside the executable fields, each node emits:
   - `source_quote` — the verbatim trigger sentence (already in `rules.json` / `clause_texts/`; **copy it, never paraphrase**);
   - `source.version` — which manual version the reading came from (the v3.0/4.0 identity conflict makes this mandatory);
   - `conflict` — a **first-class object** (not a bare `needs_human_review` boolean) carrying both source texts + a pointer to the `rulings/` ledger entry that will resolve it.
   *Done when:* no emitted node lacks a `source_quote`; every flagged conflict resolves to a ledger id.

1.6 **▶ Skeleton Task S2 — represent every bracket/band as a DMN-style decision table (the one place where "look for a better representation" actually pays).** For siniestralidad bands (renovación), VA brackets (eligibility/pricing), and franquicia-by-plaza:
   - encode rows as explicit intervals with `lower`, `upper`, **`lower_inclusive` / `upper_inclusive`**, and a `hit_policy`;
   - any undefined or overlapping edge (the 50/51, 60, 250 cases) becomes a `needs_human_review` row → ledger, **not** a silent inequality;
   - keep them as data referenced by `@tables`, **not** inequality chains buried in `evaluate` strings.
   *Done when:* no band boundary is ambiguous in the data, and Phase 9 can serialize these to DMN with zero redesign.

✅ **Trusted when:** the 4 trees + the eligibility/authority/rating rules resolve, validator is green, every node is both anchored (our quote, via S1) and runnable (their expression), and every band is a decision table (S2).

---

## PHASE 2 — Rulings ledger (we are ahead: conflicts are already data)
*GATE: any node depending on a contested rule is untrustworthy until ruled.*

Your Phase 2 had to first *find* the inconsistencies. **Here they're already enumerated as data** — `document.json → structural_inconsistencies/conflicts`, the renovación `conflict_flag`, the clause-2023 dual text, the v3.0/4.0 identity, the four "flota" thresholds, the band-boundary ambiguities. So this phase is just the **operational loop**:

2.1 Stand up a portable, versioned `rulings/` ledger (markdown/JSON) **alongside** the source as authoritative input. Seed it with our already-captured conflicts, each as an open item with both source texts attached.
2.2 ⚠ **Never hand-patch the graph.** Regenerate the graph from `representation/` + `rulings/`. (Your warning 4; our `decisions.md` "represent, never resolve" is the upstream half — the ledger is the downstream half.)
2.3 Resolved conflict → writes back the chosen branch + `hit_policy`/boundary inclusivity, so the crawler then runs deterministically. Promote our `conflict` objects from "flagged" to "ruled" without editing the extraction.

**Key items needing a ruling (already identified, not to be guessed):** renovación Consumer-vs-pesados overlap (the contradiction Approach-1 missed); band boundary inclusivity (50/51, 60, 250); clause 2023 prevailing text; alcoholemia 0.50 vs 0.70; router precedence (Phase 1.4 surfaces it); the "vehículo pesado" definition (manual p.4 vs §3.1.5.2 vs the **clause definition** — see Phase 4).

---

## PHASE 3 — Fact registry & adapter seam
*GATE: trusted graph. Leg 2 of "a tree that can resolve a case."*

3.1 Build `facts.json` from our **quote-anchored** conditions — every fact typed, sourced, with `on_missing` behavior. Advantage over Approach-1: because each condition carries its verbatim sentence, each fact's definition is auditable to the exact words it was lifted from.
3.2 Define the **adapter seam** as a contract only (supply side), with the registry as the fixed demand side. ⚠ An adapter may *map and flag-as-missing, never fabricate*. (Your Phase-3 decoupling, unchanged — it's excellent.)
3.3 Shape-agnostic build (mode A/B/C per process chosen later; the router can pick the mode). ACORD = naming hygiene, not a module.

---

## PHASE 4 — Clause linking, both directions (we are far ahead — not cite-driven)
*GATE: Phases 1–3. **This is where this approach most outclasses the Approach-1 plan.***

Approach-1's Phase 4 was "stub *cited* clauses only — not the full 311 pages." **This approach already extracted the full bundle** (152 clauses verbatim + `base_policy.json`), so the costly part is done and the cite-driven blind spot (clause-side conflicts no rule cites, e.g. 2023) is already covered.

4.1 **Forward (rule → clause):** complete the edges using `linkage.json` (already has match-confidence). The lever is completeness; we start from a real map, not zero.
4.2 **Reverse (clause → every section):** a **free inversion** of the forward edges — never an independent sweep (your warning 3). Renders as backlinks in Phase 6.
4.3 **Definitional dependence (the "vehículo pesado" canary):** we *already have* the clause definitions in `base_policy.json → definiciones`. Build the glossary from those + a deterministic concordance across manual sections (no LLM sweep). This yields the blast radius of the "vehículo pesado" ruling — and proves the manual is **not self-contained**, which is the whole reason both documents had to be extracted.

---

## PHASE 5 — Full crawler + regression (expand Phase 0 to all processes)
*GATE: trusted resolvable graph (1–3) + clause links (4).*

5.1 Generalize the Phase-0 crawler across processes (Standard → Case UW → Masiva → Licitaciones via `refer_process`), with `hit_policy`/`precedence`/`on_no_match` everywhere.
5.2 **Regression on an examples corpus**, measured against underwriter-validated answers: clean accept, clean decline, liftable exception (both outcomes), one case per contested ruling, and a Standard/Masiva near-miss to prove the router discriminates. ⚠ Keep this runner separate from audit analysis. **This measured pass is the milestone** — accuracy stops being aspiration and becomes demonstrated.

---

## PHASE 6 — Human layer (extend what we already render)
*GATE: clause notes (4) + working crawler (5).*

6.1 We already have a viewer (`decision_trees_view.html`). Extend it / or assemble an Obsidian vault (`rules/`, `condiciones/`, `examples/`, `external/`) with generated rule notes carrying `[[clause-id]]`/`[[example-id]]` wikilinks. ⚠ Generated, never hand-written; backlinks render the Phase-4 reverse view for free.

---

## PHASE 7 — Manual-audit capability (we are ahead — the report mostly exists)
*GATE: validator (1.4) + rulings ledger (2).*

7.1 Promote `verification_report.md` + `document.json → structural_inconsistencies` into a **business-readable "manual integrity report"**: per section, the overlaps/gaps/contradictions/missing precedence, each with a plain-language *why this blocks automation*. Near-free here — the findings are already written and verified.
7.2 Resolution **only** via the rulings ledger; **no in-tree authoring** of free-floating logic (your warning 7 — the moat is insight + portable formats, not hostage data).

---

## PHASE 8 — Standardization (engine + profile) + **bind `Manual Prompt.md` as the engine**
*GATE: do NOT start until Phases 1–7 give a proven baseline.*

8.1 Manual-agnostic engine + per-manual profile (zero manual-specific constants; missing profile fields degrade gracefully).
8.2 ⚠ **`Manual Prompt.md` is the extraction engine's instruction set.** It is the recon → mechanical-extract → schema-bound-subagents → two-layer-verify methodology that produced *this* fidelity. In the standardization refactor it becomes the **engine prompt run on Opus 4.8 max** for every new manual — the reproducible substitute for any earlier bespoke run. (This is the "carry the meticulous extraction across Opus 4.8 max" step you asked to place.)
8.3 Per-manual config lives in the **profile** only: clause prefix (`CG-`), process taxonomy, routing keywords, `normalize_clause_id()` rules, rulings-ledger location, the *Definiciones* location.
8.4 Prove it: a second fixture manual runs end-to-end on the untouched engine; original deterministic + verification tests still pass.

---

## PHASE 9 — DMN (held — template only)
*GATE: do NOT build until standardization reveals the full node-type set.*

9.1 One-way serializer; every node type has an export rule + round-trip test; ⚠ never auto-pick a hit policy; flagged/unruled nodes must not export as settled logic. **Because Task S2 modeled bracket/band tables as DMN decision tables back in Phase 1.6, this phase is mostly serialization, not redesign.**

---

## PHASE 10 — Per-manual loop (the engine = Opus 4.8 max + `Manual Prompt.md`)
*Once standardized, each new manual is this loop — no code edits:*

10.1 Recon + author the **profile** (the only per-manual artifact), guided by `Manual Prompt.md` §1 (the reconnaissance taxonomy).
10.2 Run the engine — `Manual Prompt.md` methodology on **Opus 4.8 max** — section by section → review queue → hand-validate → record rulings in the ledger.
10.3 Complete forward clause edges → invert for free → glossary/concordance → seed examples → run crawler/regression.
10.4 New node type? → extend DMN (Phase 9).

---

## §Skeleton — my judgment: extend Approach-1's, don't build a new one

**You asked whether it's worth looking for a better skeleton, using this approach's data or Approach-1's. My answer: no new skeleton. Use Approach-1's node schema as the spine; feed it this approach's data.** Reasons:

- Approach-1's schema is **proven and DMN-aligned**, and its own validator already caught real gaps (router overlap). You spent a week earning that; reinventing risks losing DMN alignment and re-deriving node types you already discovered.
- Its 7 node types (`router/gate/condition/authority/referral/accumulator/terminal`) **cover everything in this approach's data** — our trees, tables, base policy, and clause logic all map onto them. I looked for a node type our richer data needs that theirs can't express; I don't find one. That's the signal to **extend, not replace**.
- The thing this approach contributes is **data and fidelity, not a better graph shape.**

Two deliberate **extensions** to that skeleton (additive, not a rebuild) — **tracked as concrete tasks in Phase 1:**

1. **Fidelity fields on every node** — `source_quote` (verbatim trigger, sentence-level), `source.version`, provenance tag, and a **first-class `conflict` object** (replacing the bare `needs_human_review` boolean) that points to its `rulings/` ledger entry. This is the merge in `Crawlable_Migration_Notes.md` A1–A6. → **do it as Task S1 (Phase 1.5).**
2. **Bracket/band logic as DMN decision tables** — model siniestralidad bands, VA brackets, and franquicia-by-plaza as decision tables with **explicit boundary inclusivity and a hit policy**, not as inequality chains inside `evaluate` strings. This is the one place *both* approaches are currently non-deterministic (the 50/51, 60, 250 edges); DMN tables solve it natively and pre-stage Phase 9. The only spot where "look for a better representation" pays off — a local change, not a new skeleton. → **do it as Task S2 (Phase 1.6, serialized in Phase 9).**

**When a fresh skeleton *would* be worth it:** only if a later manual surfaces a node type the 7 can't express. Re-evaluate then, per-node-type, not now.

---

## §On Fable's ban — is Opus 4.8 max + `Manual Prompt.md` enough for this level of detail?

Short answer: **yes, with high confidence — and the artifacts in `representation/` are themselves the proof.** Everything in this approach was built and verified in a session running **Opus 4.8 (1M context)**. So "can Opus 4.8 hit this fidelity?" isn't a forecast — it already did. The reasons it holds, and the honest caveats, are in the chat reply accompanying this file; the load-bearing point for the roadmap is: **the fidelity is method-driven (mechanical extraction + two-layer verification), which is model-portable**, so Phase 8/10 binds `Manual Prompt.md` to **Opus 4.8 max** as the engine and does not depend on Fable.
