# crawlable/decisions.md — Part-2 design decisions (the execution spine)

Companion to the Part-1 `decisions.md` (which is unchanged and stays in the repo root,
governing the `representation/`). This log records the decisions for turning the verified
`representation/` into the crawlable graph under `crawlable/`. Same rule as Part 1: record
the decision, why, and what was rejected. `representation/` is read-only here.

The four opening decisions (the human reserved these; surfaced before building):

---

## D-P1. Expression language: JSONLogic for conditions + DMN decision tables for bands

**Decision (handed to me to make from the data).** Node conditions (`evaluate`,
`branches[].when`, `exception` conditions) are **JSONLogic** (structured JSON). Bracket/band
logic is a **DMN-style decision table** (Task S2), never an inequality chain inside an
expression. One canonical machine form per shape; no second "readable" mirror (avoids the
drift a duplicate representation invites — Migration-Notes C3 logic).

**Why, measured against the actual data.** I inventoried every condition in `rules.json` +
`decision_trees.json`. The universe is **closed and shallow**:
- boolean attributes (`is_heavy`, `design_modified_capacity`, `vehiculo_blindado`, …);
- numeric comparison (`tonnage_tn > 8`, `valor_asegurado >= 1.050.000`, `cilindrada_cc > 400`, `vehicle_age_years > 20`);
- enum/set membership (`segment in [comercial,pyme]`, `vehicle_brand in @tables.allowlist_marcas_antiguos`);
- `and`/`or`/`not`; "any/all over an explicit listed set" (the hard-exclusions gate);
- intervals (siniestralidad/VA/franquicia bands) → these go to S2 tables, not expressions.

There is **no arithmetic, no string manipulation, and no quantifier beyond explicit lists**
anywhere in a *branch condition*. (Derived numeric definitions like the loss-ratio formula
R-076 are data/notes, not branch logic.)

Given that, and given the project's #1 priority is accuracy = *auditable + mechanically
checkable + zero silent drift*, JSONLogic is the most faithful fit:
1. **Mechanical checkability (the data-loss mandate, dimension A).** JSONLogic is JSON, so the
   validator proves "every fact defined, every `@tables.*` resolves, no unbound var, only the
   allowed operators" by **walking the tree**. A string DSL would force the validator to be a
   parser, and a parser's own ambiguities (telling the fact `importer` from the keyword `in`,
   `@tables.x` inside `not in`) are exactly where a dropped qualifier or inverted predicate
   could hide. The whole task is "prove you lost nothing"; structured data is the only form
   that lets the proof be mechanical rather than itself fallible.
2. **No bespoke interpreter on the fidelity-critical path.** Approach-1's custom DSL needs an
   interpreter to write/secure/test (Migration-Notes B1 flags it to redo). A self-contained
   evaluator over the ~12-operator closed set (§0.1 of `node_schema.md`) is small and
   obviously-correct; it is the kind of code whose correctness does **not** need a test suite
   to trust (CLAUDE.md §3–§4). No external dependency either (`json_logic` isn't installed and
   isn't needed) — so the evaluator's semantics are fully auditable in-repo.
3. **Bands are where inclusivity drifts — so bands leave expressions entirely.** The 50/51 ·
   60 · 250 renovación edges, the moto-VA gap (21.000,00→21.000,01), the franquicia >35k/>70k
   overlap: in any inequality-chain form, the boundary's inclusivity is implicit and so can
   drift. Modelling these as DMN decision tables with explicit `lower/upper_inclusive` +
   `hit_policy` (S2) makes inclusivity a required field, and routes every ambiguous edge to a
   `boundary_conflicts` → ledger row instead of a silent `<`/`<=`. This is the single place
   "look for a better representation" pays off (Roadmap §Skeleton).
4. **Phase-9 DMN export is mechanical from both halves.** JSONLogic ops map directly to FEEL
   unary tests; the bracket tables are already DMN decision tables. Nothing is re-designed in
   Phase 9.

**Rejected.** *Custom DSL strings* (unauditable parser, interpreter liability — B1). *CEL* and
*DMN FEEL everywhere* (real parser dependencies for expressive power — arithmetic, functions,
quantifiers — that this data never uses; FEEL has no lightweight trustworthy Python
evaluator, so it would add interpreter risk to the critical path). FEEL/DMN is right for the
*tables*, which is exactly where it is used.

**`@tables.*` mechanism.** The crawler builds the evaluation context as facts ∪ flattened
table values (keyed `@tables.<id>.<key>` / `@tables.<id>.values`), so a JSONLogic `var` reads
both. Bracket tables are consumed by `bracket_lookup`, never inlined into a condition.

---

## D-P2. Conflicts: ledger-all + non-binding drafted recommendations (human's choice)

**Decision.** I resolve **nothing** in the graph. Every conflict/ambiguity becomes a
first-class `conflict` object (S1) pointing to an **open** entry in `crawlable/rulings/`,
which preserves all source variants verbatim. Additionally — per the human's selection — each
ledger entry carries a clearly-labelled **non-binding `recommended_resolution`** (a drafted
suggestion + rationale for the underwriter to accept or reject). The recommendation lives only
in the ledger (mirrored on the node for convenience); it is **never** encoded in branch logic.
The crawler, reaching an `open` conflict node, **escalates with context** — it does not pick a
branch. A conflict leaves the graph only when its ledger entry flips to `ruled` and the graph
is regenerated from `representation/` + `rulings/` (never hand-patched — PROJECT_CONTEXT §9.4).

**Why.** This is the downstream half of Part-1's "represent, never resolve". The drafted
recommendation speeds underwriter review without asserting anything as logic; keeping it out
of the executable path means an un-acted-on recommendation can never change a crawl outcome.

Seeded at Phase 0 (persistent, accumulates): `RUL-MAN-VERSION` (3.0 vs 4.0), `RUL-ROUTER-
PRECEDENCE`, `RUL-X15-HIGHVALUE-READING` (derived syntax reading), `RUL-FRANQ-MOTO-OVERLAP`
(S2 edge), `RUL-CG-2023` (dual clause text), `RUL-RENOV-CONSUMER-PESADOS-OVERLAP`,
`RUL-BAND-EDGES` (50/51·60·250), `RUL-FLOTA-THRESHOLDS`, `RUL-ALCOHOLEMIA`, `RUL-2133-2140`,
`RUL-ABSENT-CODES` (2025/2131/2146). Some belong to domains not yet converted; the ledger is
seeded now because it is the persistent home for every §5b conflict.

---

## D-P3. Runtime: Python 3.13, scripts written now (human's choice)

Crawler + validator are Python 3.13 (the project's existing language — extraction,
verification, and `work/` are all Python; Python 3.13.1 confirmed on this machine). The
JSONLogic evaluator is self-contained (no `json_logic` dependency, no `eval`), implementing
exactly the §0.1 operator set. Written now, because Phase 0's milestone *is* "a crawler
resolves a real case with an audit trail." Layout: `crawlable/crawler/crawl.py` (engine +
stub adapter + escalation), `crawlable/crawler/run_cases.py` (the demonstration cases),
`crawlable/validate.py` (the §9.5 mechanical validator).

---

## D-P4. Entry point: build the router, ship its precedence as an open ruling (human's choice)

**Decision.** Build `root.process_router`. Branches the source **states** (the explicit
refer-outs: public tender → licitaciones, mass/wholesale → masiva, enlatado product →
automatica, deviation/Consumer-fleet → case_underwriting) are asserted normally. The
**overall precedence when several could apply** is *not* invented — `hit_policy:"unique"` with
`on_no_match:"standard"` means: 0 explicit triggers ⇒ Standard (the sourced fast-lane default,
R-010); exactly 1 ⇒ route; **>1 ⇒ the unresolved precedence** ⇒ escalate citing
`RUL-ROUTER-PRECEDENCE`. This reconciles Approach-1 (which built a router) with this project's
`decisions.md` D2 (which declined to invent a master precedence): the router *structure*
exists so the crawler has a root, but no precedence order is shipped as logic — the gap is a
first-class open ruling, surfaced only when a real case actually triggers the ambiguity.

Phase 0 cases enter at the router and fall through to Standard, exercising the router +
`refer_process` traversal + the eligibility tree together.

---

## D-P5. Phase-0 slice boundary (a scoping call, recorded per CLAUDE.md §2)

The Phase-0 proof slice is the **complete Standard eligibility tree** (`T-ELIG-ESTANDAR`:
the admitted-types gate + all 23 exclusions X01–X23 + the default-eligible terminal), plus the
minimal router, the facts/tables it needs, and one S2 `bracket_map` exemplar
(`TBL-FRANQ-MOTO`, which has a real source overlap → ledger). Rationale: it is a
self-contained domain unit that exercises **every** node type and S1/S2 mechanism I need
(gate, referral, condition, condition+exception single- and multi-case, condition+branches+
`@tables`, terminal, bracket table + boundary conflict), so it proves the architecture rather
than a toy path — while still being one domain, so the rest (Case-UW, rating, renovación,
retroactividad, clause links) is deferred to Phase 1 and shown only after this checkpoint.

---

## D-P6. Document-level conflicts surface once as `document_provenance` (runtime-stress mitigation)

**Decision (human's choice — G1).** Document-level conflicts declared via `_doc_conflicts` (today only
`RUL-MAN-VERSION`, the manual's v3.0/v4.0 identity) are surfaced **once per crawl result** as a
`document_provenance` metadata field — *not* as a per-node caveat on every outcome, and *not* left
invisible. This is the safest, clearly-visible option: it changes no decision outcome (the Layer-A
snapshot stayed stable) yet guarantees a represented document-level conflict is never silently omitted
from a crawl result.

**Why.** The runtime stress test (`troubleshoot testing/`, recorded in `verification_report.md` §4c /
`CONVERSION_RECORD.md` §8F) found `RUL-MAN-VERSION` was referenced 14× via `_doc_conflicts` but the
crawler only read node-level `conflict`, so it surfaced on **zero** outcomes — a represented conflict
made invisible at runtime. A document-level identity conflict doesn't change any single decision, so a
per-node caveat would be noise on nearly every outcome and would dilute the decision-relevant caveats
(X15, Lizeth-Rios). Surfacing it once as provenance keeps the caveat channel meaningful while honoring
"represent, never resolve."

**Rejected.** *Ride-along caveat on every manual-derived outcome* (visible but noisy; would re-bless
most snapshots for no decision change). *Ledger/docs only* (leaves it out of crawl results entirely —
rejected because a consumer reading only crawl output would never learn the source identity is
contested).

**Made it CHECKED either way.** `validate.py [11]` (conflict-coverage) now fails the build if any OPEN
ruling is neither referenced by a data construct nor justified as `LEDGER_ONLY_BY_DESIGN`; `[9]` is
extended to `_doc_conflicts` ledger refs. So this class of "represented-but-unsurfaced" conflict cannot
silently recur. The conflict itself stays **OPEN** in `rulings/RUL-MAN-VERSION.md` — surfacing is not
resolving.

---

## D-P7. Conflict tiers verified by fresh-context multi-vote; dissents represented, never auto-flipped

**Decision.** The assignment of each conflict to a tier (provenance **caveat** / structural
**escalate** / contested-outcome **block** / **doc-level** / **reference-only**) was verified by a
fresh-context **multi-vote** review (Layer E — three independent verifiers with perspective-diverse
adversarial lenses: under-surfacing, over-escalation, missing-executable-surfacing). Where a verifier
*dissents* from the assigned tier, the dissent is **represented** (recorded in the conflict's
`rulings/` entry and the verification docs) — it is **not** used to unilaterally flip the tier.

**Why.** A tier choice is a modeling decision about how the source's conflict behaves; flipping it on
a minority opinion would itself be a form of *resolving* a question the underwriter owns (CLAUDE.md;
D-P2). The faithful action is the same as for the conflicts themselves: surface the uncertainty, point
to where it must be ruled, change nothing in the executable logic. (Run result: 9/11 tiers confirmed
by ≥2/3; the 4 med/low dissents became ledger enrichments + open item O14; **no tier was flipped, no
code changed**, `validate.py` GREEN, snapshot stable.)

**What multi-vote bought over a single pass.** Distinct lenses caught what one reviewer would miss in
*both* directions — V1 flagged a CAVEAT that may ship an unsupported accept (X15) and a DOC-LEVEL note
that understated a data-currency risk (MAN-VERSION); V3 flagged executable logic mis-filed as reference
(R-097 → O14). A single agreeable pass tends to confirm the existing tier. **Lesson for any executed
representation: the *tier* of a conflict is itself a verification target, not just its presence.**

---

## D-P8. Node-ifying a captured prohibition list (O14): process-scoped `decline`, granularity flagged

**Decision.** R-097's licitaciones "condiciones que no pueden ser suscritas" list — captured in the
representation as a reference rule with an enumerated `logic.prohibited[]` — was compiled into 5
executable gates in `graph/3.5.2.json` (order 10–14, before capacity). Outcomes follow the source's
own wording: the four hard prohibitions (Valor Admitido; alcoholemia > 0,70 g/l; licencia vencida
> 90 días; permisos especiales de velocidad) → `decline`; AP-en-carrocería → `refer_authority` (the
source explicitly names who may authorize). The auxilio-mecánico item is a reimbursement/handling rule
with an explicit alternative — NOT an exclusion — so it stays in reference, un-node-ified.

**Why `decline`, not `escalate`.** "decline" is process-scoped (= "no suscribible por el Procedimiento
de Licitaciones"), exactly what the source states, and consistent with every other exclusion node. The
one genuine ambiguity — whether a prohibited condition declines the whole quote or is merely
barred/stripped from it — is **not stated by the source**, so it is flagged per node in `_derived_note`
rather than silently chosen; decline is the conservative reading and an underwriter can rule otherwise.

**Nothing invented.** Every gate's `source_quote` is copied from R-097 `logic.prohibited[].item`; the
alcoholemia gate carries `conflict → RUL-ALCOHOLEMIA` so the cross-doc 0,50-vs-0,70 tension surfaces
when it fires; R-097 moved reference→node_converted in `rule_buckets.json` and `reference.json` was
regenerated, so the partition stays exact (84/84) and coverage 372/372.
