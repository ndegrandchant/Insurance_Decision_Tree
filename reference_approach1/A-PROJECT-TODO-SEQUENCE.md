# LBC Underwriting System — Master Sequential To-Do (v3)

The goal: an underwriter (or agent) inputs risk attributes and gets eligibility,
routing, authority, pricing, and deductibles back, with a full audit trail to the
manual rule AND the governing contract clause — built from the Automotores manual,
generalizable to other manuals, eventually exportable to DMN.

**Read top to bottom. The order is load-bearing.** GATE = don't start until true.
⚠ = do this before running that part.

### What changed in v3
- **Clause linking is now explicitly two-directional (Phase 4)** — forward capture
  (rule → clause/manual) is the only part that costs extraction work; the reverse
  (clause → every section) is a *free inversion* of those edges, not a separate
  compute-heavy sweep. Plus a cheap glossary+concordance for terms defined in a
  clause but used without citation (the "vehículo pesado" case).
- **New Phase 5 — Prove the core.** The runtime crawler that actually resolves a
  case was missing from the roadmap. It's the load-bearing joint and the milestone
  that turns an elegant design into a demonstrated system. It includes the
  escalation-with-context feature (refer with the partial path + the missing fact +
  where it got confused).
- Capture requirements for the planned re-run now include explicit references and
  defined-term tags (Phase 8), folded into the *same* re-run — not a new one.

### Companion files
`NEEDS-FACTS-TEMPLATE.md` · `stub_cited_clauses.py` · `CLAUSE-NOTE-SCHEMA.md` ·
`EXAMPLES-CORPUS-FORMAT.md` · `STANDARDIZATION.md` · `DMN-FUTURE-INCLUSION.md`
Plus Trial-1 outputs (`graph.json`, `tables.json`, `review_report.md`) and the build's
`INCONSISTENCIAS-MANUAL.md`, `eligibility.md`, `PARSER-INTEGRATION.md`.

---

## PHASE 1 — Validate and make the tree *resolvable*
*GATE for everything. A tree that can't resolve a case isn't worth a vault or a DMN.*

1. **Read `review_report.md`** (done — 0 hard errors, 1 warning, 4 review items). Act
   by category: ambiguous → get a ruling; non-exhaustive → find the branch or log a
   manual gap; external refs → confirm `external:true`, queue stubs; missing
   provenance → trace and add `{section,page,version}`; dead ends → fix the graph.

2. **Hand-validate only high-risk nodes**: liftable eligibility exceptions, referrals,
   the authority matrix. ⚠ Confirm per-process authority rows were NOT deduplicated —
   the report's one warning is 10 suscriptores under multiple processes (expected;
   verify the *limits differ*, e.g. 100/1.4M vs 10/700k).

3. **Confirm what extraction captured** (the trust-but-verify pass). For each, if it's
   absent it's a Prompt-B fix (Phase 8), not something to invent now:
   - `needs_facts` on every node that reads a fact (leg 2),
   - `hit_policy` (`unique|first|priority|collect`) on every router/gate (leg 3),
   - `on_no_match` on every router (never undefined — ask or refer, never guess) (leg 3),
   - **explicit references**: `see_also`/`required_clauses` where the text points to a
     clause, and `external:true` where it points to another manual (this is Phase-4
     Part 1; you already know it's sparse).

4. **Add the validator exhaustiveness + overlap check** (adopt DMN's discipline early):
   for each router, prove branches are exhaustive (every input lands somewhere) and
   flag overlaps (two branches satisfiable at once with no precedence). This is what
   already caught `root.process_router`. Run it first and hardest on routing.

---

## PHASE 2 — Resolve source-document inconsistencies & rulings
*GATE: any node depending on a contested rule is untrustworthy until ruled.*
*These are your review-report items — each needs an underwriter decision, not a guess.*

5. **`case_underwriting.elig.rent_a_car`** (§3.3.1, p17-18) — the literal contradiction:
   excludes Rent-A-Car but the next line says the exclusion doesn't apply to rentals.
   Confirm the real scope (Rent-A-Car vs contract rentals, e.g. petroleras?). *("A7".)*
6. **`vehículo pesado` definition** — verify whether the two definitions (p.4 vs the
   3.1.5.2 "VEHÍCULOS PESADOS" body section) were reconciled or just not both captured.
   *("A9"; did not surface as its own queue item — confirm why. Becomes a glossary term
   in Phase 4.)*
7. **`case_underwriting.elig.high_loss_ratio`** (§3.3.3, p18-19) — no numeric threshold
   fixed and the formula's OCR is corrupt. Get the cut-off and formula from an
   underwriter; re-key the formula by hand.
8. **`root.process_router`** (§3, p3-22) — the manual fixes **no precedence** when
   several processes could apply (e.g. flota estatal con producto enlatado). Get the
   evaluation order and the exact Case-UW-vs-Estándar condition. Fills `precedence` /
   `hit_policy` from Phase 1.3. *(The overlap problem made concrete — see Phase 7.)*
9. **Version conflict** — headers carry both 3.0 and 4.0. Confirm canonical (cover =
   4.0) and keep the `--version 4.0` flag; no PDF edits.

10. ⚠ **Record every ruling as a versioned source, not a graph patch.** Put rulings in a
    portable `rulings/` ledger (markdown/JSON) that sits *alongside* the manual as
    authoritative input, and regenerate the graph from manual + ledger. Do NOT hand-edit
    resolutions into `graph.json` — that creates a second source of truth that drifts
    from the manual. (Matters now; it's the seed of the Phase-7 feature.)

✅ **Trusted when:** review queue triaged, high-risk nodes checked, rulings recorded in
the ledger and regenerated, resolution-rule fields populated. Only now proceed.

---

## PHASE 3 — Fact contract & input adapter (resolvability + shape-agnostic)
*GATE: trusted graph. Still "build a quality tree" — it's leg 2.*

11. **Build the fact registry** (`facts.json`) per `NEEDS-FACTS-TEMPLATE.md`: every fact
    typed, sourced, with `on_missing` behavior. ⚠ If `needs_facts` was sparse in Trial 1,
    that's a Prompt-B gap (Phase 8).

12. **Define the adapter seam now — implement a concrete adapter later.** The single
    most important decoupling in the system.
    - *Why:* the tree must never know where facts come from. The fact registry is the
      **demand** side (fixed, tree-owned); an adapter is the **supply** side (a small
      mapping layer per source). Without it, the CRM's shape leaks into your rules and
      every source change becomes a tree edit. With it, an unknown/changing input shape
      costs one adapter, not a re-extraction.
    - *How (now):* specify the seam as a contract only — an adapter is any function that
      returns facts conforming to `facts.json` and reports a fact as *absent* (so
      `on_missing` fires) rather than inventing it. Zero source-specific code yet.
    - *How (later, runtime):* one concrete adapter per real source, chosen with the
      per-process mode below. Concrete adapters are runtime/edge work, not part of
      getting the tree trusted.
    - ⚠ An adapter may *map and flag-as-missing*, never *fabricate*.

13. **ACORD — optional target vocabulary, NOT a build target now.** ACORD is the global
    insurance data standard (forms 125/126; an Information Model of 1,000+ entities used
    as a semantic bridge), but it's US/Lloyd's-centric and not common among Bolivian
    insurers.
    - *Verdict:* do not build toward ACORD now; your adapter targets LBC's own CRM shape.
    - *When it matters:* only on the productize-later path into ACORD markets — then a
      one-time ACORD→`facts.json` adapter accepts any ACORD-compliant submission.
    - *Zero-cost hedge:* keep `facts.json` `id`s semantically close to ACORD field names
      where it's free. Naming hygiene, not a module.

### The deferred decision: where does input come from? (decide later, no cost now)
Industry practice is **hybrid**: STP for routine risks, referral queues for complex ones;
triage classifies each submission into STP / light-touch / full underwriting.

- **A — Complete payload up front (STP):** fast, high-volume, no human. Accuracy hinges
  on payload completeness; a missing fact → `on_missing`. Great for **Masiva / simple
  Estándar**; brittle for complex risks.
- **B — Interactive (agent asks):** never proceeds without the fact → highest accuracy,
  no guessing; slower, needs a human. Right for **Case Underwriting** and contested facts.
- **C — Hybrid (pre-fill + ask gaps):** dominant industry pattern; best overall accuracy
  and usefulness; most engineering.
- **D — Shape-agnostic now (recommended build target):** build the registry + adapter
  seam and pick A/B/C *per process* later. Defers the decision at zero cost; the router
  already picks the process, so it can pick the **mode** too.

⚠ Decision rule: build **D** now; choose the runtime mode per process once volumes and
complexity are known — not a global commitment today.

---

## PHASE 4 — Clause linking, both directions
*GATE: Phases 1–3 complete.*

Two directions, very different costs:
- **Forward (rule → clause / other manual):** captured at extraction as
  `see_also` / `required_clauses` / `external:true`. Your Part-1 flagging idea lives
  here. The only part that costs extraction work; the lever is **completeness**, and
  you already know it's sparse.
- **Reverse (clause → every section that uses it):** for *explicit* references this is a
  **free inversion** of the forward edges — Obsidian backlinks render it automatically
  (rendered in Phase 6), or a one-line dict inversion of `graph.json`. No LLM, no
  per-clause manual sweep. ⚠ Never build an independent reverse sweep: it costs compute
  *and* creates a second set of edges that can disagree with forward, breaking single
  source of truth. The reverse map is always *derived*, never *discovered*.
- **Definitional dependence (term defined in a clause, used without citation — the
  "vehículo pesado" case):** the one place with real cost, kept cheap via a glossary +
  concordance, never a per-clause LLM sweep.

14. **Make forward capture complete** (the lever). At the sparseness checkpoint below,
    if explicit references are under-captured, the fix is the improved Prompt B in the
    *same* planned re-run (Phase 8) — add "capture every explicit clause/manual
    reference" there. Don't build a separate reverse pass to compensate.
15. ⚠ Run `python stub_cited_clauses.py graph.json --report-only` first; read the
    raw→normalized table.
16. **Make the sparseness call on purpose:** accept for prototype 1, or fold the capture
    fix into the Phase-8 re-run. Don't drift past it.
17. Tune `normalize_clause_id()` until each real clause maps to one id; re-run report.
18. Generate: `python stub_cited_clauses.py graph.json --vault ./vault`. ⚠ Cited clauses
    only — not the full 311 pages.
19. Resolve each: paste verbatim clause text, set `resolved_text: true`; set
    `needs_ruling: true` on the *vehículo pesado* clause until Phase 2.6 settles.
    ⚠ Never edit inside `<!-- GENERATED -->`. ⚠ The edge lives in `graph.json`.
20. **Reverse view = inversion (free).** Confirm the rule→clause edges invert cleanly to
    clause→rules; this gets rendered as backlinks in Phase 6. Build nothing heavy here.
21. **Definitional glossary + concordance (bounded compute):**
    a. Build a glossary of defined terms — parse the contract's *Definiciones* article
       once if it has one, or a bounded LLM pass over only the cited clauses to tag which
       define a term and what term.
    b. Index those terms across manual sections with deterministic string/lemma matching
       (a concordance — free, no LLM).
    c. Human confirms which matches are true governing dependencies.
    This yields the A9 blast radius: every section the *vehículo pesado* ruling affects.

---

## PHASE 5 — Prove the core (minimal runtime + escalation) ★ new, the de-risking milestone
*GATE: trusted, resolvable tree (1–3) and clause links for the audit trail (4).*
*This is the load-bearing joint. Do it BEFORE standardization, audit-productization, or
DMN — it converts an elegant design into a demonstrated system, and it's the first thing
a buyer or investor will ask you to show.*

22. **Build the minimal crawler.** It traverses `graph.json` from the router, pulls facts
    via the adapter (or asks, per mode), fires `on_missing`, applies `hit_policy` /
    `precedence`, and returns an outcome **with its audit path**: the nodes that fired,
    the clauses cited, and the facts used. Start with ONE process (likely core Estándar).
23. **Escalation-with-context** (the globally valuable feature). When the crawler can't
    resolve — `on_missing: refer`, `on_no_match`, a `needs_ruling`/contested node — it
    refers to an underwriter and hands over: the partial path so far, the *exact* missing
    or blocking fact, and where it got confused (which node, and why). Not "refer the
    case" — "refer this one question." This is what most systems don't do.
24. **Regression on one process, end-to-end, measured.** Run real/representative cases
    through the crawler; assert outcomes against underwriter-validated answers
    (`EXAMPLES-CORPUS-FORMAT.md`). Include a clean accept, a clean decline, a liftable
    exception (both outcomes), one case per contested ruling, and an Estándar/Masiva
    near-miss to prove the router discriminates. ⚠ Keep this runner separate from impact
    analysis. **This measured pass is the milestone** — accuracy stops being aspiration.

---

## PHASE 6 — Obsidian assembly (the human layer)
*GATE: clause notes (Phase 4) + a working crawler (Phase 5).*

25. **One vault, folders**: `rules/`, `condiciones/`, `examples/`, `external/`.
26. **Generate rule notes from `graph.json`** (new code) with `[[clause-id]]` /
    `[[example-id]]` wikilinks. ⚠ Generated, never hand-written. The backlinks now render
    BOTH impact analysis (clause → rules) and the Phase-4 reverse view for free.
27. **Create `external/` stubs** for external references (pointers, not chunked content).

---

## PHASE 7 — The manual-audit capability (decide scope)
*GATE: validator overlap check (1.4) + rulings ledger (2.10) exist.*

Your overlap question, productized. **Build the audit; resolve via the portable ledger;
do NOT let anyone author logic into the graph.**

28. **Audit report (highest leverage):** promote `review_report.md` into a business-
    readable "manual integrity report" — per section: overlaps, gaps, contradictions,
    dead ends, missing precedence/thresholds — each with a plain-language *why this blocks
    automation*. Near-free, trust-building, no lock-in, sellable on its own.
29. **Resolution via the rulings ledger:** flagged gap → company records a ruling in the
    portable `rulings/` ledger → tree regenerates. Adds exhaustiveness without fragmenting
    truth or creating toxic lock-in.
30. **Do NOT build in-tree authoring of free-floating logic** — a second source of truth
    that drifts from the manual, and the lock-in enterprise buyers refuse. Stickiness =
    insight + portable formats, not hostage data.

---

## PHASE 8 — Standardization refactor (engine + profile)
*GATE: do NOT start until Phases 1–7 give a trusted, known-good, *proven* baseline.*

31. Run **Prompt A** (`STANDARDIZATION.md`): manual-agnostic engine + per-manual profile.
    ⚠ Zero manual-specific constants; missing profile fields degrade gracefully.
32. ⚠ Prompt B must reliably capture everything Trial 1 left sparse — this is the planned
    re-run: `see_also`/`required_clauses` + `external:true` (Phase-4 Part 1), defined-term
    tags (Phase-4 glossary), `needs_facts`, `hit_policy`, `on_no_match`.
33. ⚠ Fold per-manual config into the profile: `normalize_clause_id()` rules, the contract
    prefix (`CG-`), process taxonomy, routing keywords, rulings-ledger location, the
    *Definiciones* location. After this, the only per-manual artifact is the profile.
34. Prove it: a second minimal fixture profile runs end-to-end on the untouched engine;
    original deterministic tests still pass.

---

## PHASE 9 — DMN (held — template only)
*GATE: do NOT build until standardization reveals the FULL node-type set. Per-node-type,
not per-manual.*

35. Revisit `DMN-FUTURE-INCLUSION.md` Part 2; confirm every node type has an export rule +
    round-trip test. One-way serializer only. ⚠ Never auto-pick a hit policy; flagged
    nodes must not export as settled logic; round-trip every export against the Phase-5
    examples corpus. *(The exhaustiveness discipline DMN formalizes is already live in your
    validator from Phase 1.4.)*

---

## PHASE 10 — Per-manual ongoing loop
*Once standardized, each new manual is this loop — no code edits:*

36. Inspect with Opus 4.8 max → author the **profile** (only artifact).
37. Run engine (Prompt B per section) → review queue → hand-validate → record rulings.
38. `stub_cited_clauses.py` for cited clauses → resolve → build glossary → seed examples →
    external stubs → run the crawler/regression on the new manual.
39. New node type? → return to Phase 9 and extend DMN.

---

## The warnings most likely to save you
1. **A tree that can't resolve a case isn't done.** Three legs: logic, facts, resolution
   rules. The review report shows leg 3 (router precedence) is missing.
2. **Prove the core before you polish.** The crawler resolving one process end-to-end with
   *measured* accuracy (Phase 5) is what turns design into a system — before
   standardization, audit-productization, or DMN.
3. **Reverse clause links are derived, never swept.** Capture forward completely; invert
   for free. Only definitional terms need the cheap glossary+concordance — never a
   per-clause LLM scan of the manual.
4. **Rulings go in a portable ledger as source — never hand-patched into the graph.**
5. **`--report-only` before generating clause notes**; make the sparseness call on purpose.
6. **Build shape-agnostic (Phase 3-D); adapter seam now, concrete adapters at runtime.**
   ACORD is naming hygiene now, a module only if you productize to ACORD markets.
7. **Audit yes, in-tree authoring no.** Insight + portable formats are the moat.
8. **Refactor (Phase 8) only against a proven baseline; DMN (Phase 9) only when node types
   are settled. Never auto-pick a hit policy.**
