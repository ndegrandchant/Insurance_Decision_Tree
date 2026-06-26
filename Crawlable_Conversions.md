# Crawlable Conversions — a generalized playbook for turning a verified manual-representation into an executable, crawlable decision graph

> **What this is.** The reusable engine for **Part 2** of the manual-automation pipeline: taking
> an already-extracted, already-verified *representation* of a manual (the output of the extraction
> playbook, `Manual Prompt.md`) and compiling it into an **executable, crawlable decision graph** —
> a graph a crawler walks to return an outcome (eligibility / routing / authority / pricing /
> renewal / temporal) with a full audit trail back to the source, plus a mechanical validator, a
> conflict ledger, captured reference material, and a proof that **nothing was lost**.
>
> `Manual Prompt.md` is the engine that produces fidelity. **This file is the engine that gives
> that fidelity an execution spine without losing it.** It is manual-agnostic. Concrete instances
> are tagged `‹e.g.›` and drawn from the worked run recorded in `crawlable/CONVERSION_RECORD.md`,
> where this method was carried end-to-end (both source documents, 372/372 source ids accounted, 0
> deferred, residual drift 0 across nine fresh-context verifier passes).
>
> **The non-negotiable, inherited from extraction:** accuracy. Represent ambiguity and conflict;
> never resolve them silently. Verbatim survives. And — the addition this phase makes — **prove you
> lost nothing**, mechanically, in two independent dimensions.

---

## 0. Preconditions — what this engine consumes

A **verified representation** with: verbatim trigger text on every decision-bearing element (tagged
distinct from derived readings); conflicts/ambiguities captured as data (not resolved); source
anchors (section/page/version); provenance tags; a cross-reference/linkage layer. If your
representation lacks these, fix that first.

It also assumes a **proven node schema to borrow**. The stance is *"their skeleton, our data"*:
reuse a proven, DMN-aligned node schema as the spine; do not design a new one unless a node type
the data needs genuinely cannot be expressed.

**Outputs** (the layout that worked):
```
crawlable/
  node_schema.md   decisions.md            # the schema + the conversion design decisions
  facts.json                               # the crawl's input demand contract
  tables.json + tables_*.json              # role-typed parameters incl. S2 decision tables (loaded by merge)
  graph/<section>.json                     # executable nodes per section/domain
  rulings/                                 # the conflict ledger (OPEN items, variants verbatim, recommendations)
  reference.json  clauses.json  base_policy_ref.json  linkage_edges.json  crossrefs.json
                                           # CAPTURED non-branch content (contract text, definitions, governance, pointers, edges)
  rule_buckets.json                        # the authoritative source-element -> bucket partition
  crawler/crawl.py  validate.py  coverage.py            # crawler + mechanical validator + reconciliation engine
  build_tables.py  build_reference.py  build_clauses.py  sync_facts.py   # mechanical generators (parse, don't retype)
  COVERAGE_REPORT.md  coverage_manifest.json  NOT_CONVERTED.md           # the persistent data-loss proof
```
**Single source of truth:** `crawlable/` is *generated* from the representation + `crawlable/rulings/`.
Never hand-patch a resolution into the graph; record it in the ledger and regenerate. The
representation is never edited.

**You inherit the representation's residuals — you cannot improve them here.** Because `crawlable/`
is *generated from* the representation and never re-extracts the source, any residual risk in the
upstream extraction (OCR-level text fidelity of captured clauses; classification or
linkage-confidence judgments) is carried through **unchanged**. Document these as inherited, and be
explicit that "done" means *faithful to the representation*, not that the upstream residuals are
closed — closing them needs a source-side action (e.g. re-OCR from page images), not more conversion.

---

## 1. The three principles (everything serves these)

1. **Their skeleton, our data.** Adopt a proven node schema; extend it only with the two
   fidelity-driven additions (§3). Reinventing the graph shape risks losing DMN-alignment.
2. **Represent, never resolve.** Every source conflict survives as a first-class object → an OPEN
   ledger entry. The crawler escalates at a conflict; it never picks a winner. Resolutions enter
   only via the ledger + regeneration.
3. **Prove you lost nothing — two dimensions.** (A) *Structural*: every source id maps to a
   converted element, a captured reference, or an explicitly-excluded line; mechanically
   reconciled. (B) *Semantic*: no compiled expression drifts from its verbatim source; verified by
   independent fresh-context adversarial passes. Neither dimension alone suffices.

**Corollary — not everything is a node.** A manual is mostly *not* branch-shaped. Branch logic →
graph nodes; intervals/bands → decision tables; lookups → matrix tables; **non-branch normative
content** (definitions, governance, coverage terms, procedures, info requirements, contract
clauses, cross-references) → **captured reference files**, not invented graph structure. Forcing
contract text into a tree fabricates evaluation order the source never states. In the worked run,
~66% of source ids were `reference` (captured), not executable — and that is faithful, not a gap.

---

## 2. Phase the work — prove the shape, then scale in batches

**Phase 0 — prove the architecture on ONE vertical slice.** Pick one complete decision domain that
exercises every node type and mechanism you will need (a gate, a plain condition, a referral, a
condition with a liftable exception, a condition with branches + a table reference, a terminal, one
decision table with a flagged boundary). Convert it by hand; build the crawler + validator +
reconciliation + one fresh-context verification pass; resolve a handful of real cases end-to-end.
**Milestone: a crawler resolves a real case with an audit trail and escalates with context.** Only
then scale.

**Phase 1+ — convert in domain-sized batches**, in dependency order: eligibility → authority →
rating → renewal/temporal → clause links. **Each batch is fully reconciled (A) and semantically
verified (B) before the next**, all rolling into one persistent `COVERAGE_REPORT.md`, so any session
resumes from the report + manifest.

---

## 3. The target node schema (spine + two fidelity extensions + node behaviors)

**Spine (borrow as-is):** node types `router | gate | condition | authority | referral |
accumulator | terminal`; a small enumerated outcome set `eligible | conditional_eligible | decline |
refer_authority | refer_process | refer_line`; common fields `id, type, process, order,
needs_facts[], evaluate / branches[], outcome, referral_target{kind,name,reason}, exception{},
hit_policy, on_no_match`. The `exception{}` object (`liftable, authority_required, conditions[],
cases[], on_lift_outcome, no_lift_outcome`) models "excluded unless …", the most common manual shape.

**Extension S1 — fidelity fields on EVERY node:**
- **`source_quote`** — the verbatim trigger, copied character-for-character, **never paraphrased**.
  *This is the field most prone to drift — see §8.* If a sentence comes from a different element
  than the node's `_origin`, label it as such (`rule_quote_X`), don't pass it off as the element's own.
- **`source{section, page, version}`** — `version` = what is literally stamped where the quote is read.
- **`conflict{}`** — first-class (not a boolean): `{status, ledger_ref, kind, summary,
  source_variants[verbatim], recommended_resolution, blocking?}`.
- **`_origin{artifact, path, source_id}`** — the back-pointer to the exact source element. **The
  spine of the coverage manifest.** Match it to the manifest's enumeration format (e.g. if elements
  are namespaced `TREE.elem`, make `_origin` produce that key, or coverage will under-count).
- **`derived: true`** + a note where the reading involved judgment beyond restating the sentence.

**Extension S2 — bracket/band logic as decision tables.** Every interval (rate brackets, loss-ratio
bands, fee tiers) is a table, not an inequality chain: rows carry `lower, upper, lower_inclusive,
upper_inclusive, output, source_quote`; the table has a `hit_policy`. **Model an ambiguous source
edge as a GAP between exclusive-bounded rows** so a value exactly on the edge matches no row and the
lookup *escalates* → ledger (S2: never a silent `<`/`<=`). List every gap/overlap in
`boundary_conflicts` with a `ledger_ref`.

**Node behaviors beyond plain conditions (generalize as your data needs):**
- **`authority`** — a `matrix_lookup`: look up a key (the binding actor) in a table; check the risk
  is within that row's limits → within = advance, exceeds/unknown = refer_authority.
- **`accumulator` with a band table** — look up an interval (e.g. loss ratio) → the row's output
  carries `{action, outcome}` (a rate action + the eligibility outcome); a flagged edge escalates.
- **referrals** carry a typed target `{kind: process|line|committee|external}`. Committees/lines are
  referral destinations, not processes.

**Stage chaining by `order` (not a new primitive).** A process is a pipeline
(gate→exclusions→capacity→authority→limits→…→terminal) composed purely by the ordered-filter
fall-through. Insert stages at higher `order`; the "no node fired" path flows to the next stage.

**Handoff vs continuation.** `refer_process` from the **router** continues into the selected
process (the router's job is to pick a process to run). Every *other* `refer_process` is a
**handoff** — it terminates with context; the receiving process is a separate crawl. (Otherwise a
timing/coverage referral wrongly re-runs the target's eligibility filter.)

**Process-scoped outcomes.** `decline` = "declined by *this* process"; reserve `refer_*` for where
the source names a destination. Cross-process admissibility lives in the other process graph + the
router, never an invented edge.

---

## 4. Choosing the expression language (a framework, not a fixed answer)

Inventory the condition shapes first. Pick the simplest machine form that is (a) **mechanically
walkable** (the validator proves every variable/table reference resolves without itself being a
fallible parser), (b) needs **no bespoke interpreter** on the fidelity-critical path, (c) is
**export-aligned** (e.g. DMN). For the common manual case (boolean / comparison / set-membership /
and-or-not / "any-all over an explicit list" / intervals) → **structured JSONLogic for conditions +
decision tables for intervals** (the default; what the run used). Reconsider only if conditions
genuinely need arithmetic / strings / quantifiers (then CEL or DMN FEEL — but pay for the parser
dependency deliberately; never hand-roll a DSL interpreter for fidelity-critical logic). Reference
parameters as `@tables.<id>.<key>`; the crawler injects flattened table values so the same `var`
mechanism reads facts and parameters; the validator statically asserts every such reference
resolves. One canonical machine form per shape (a second "readable" mirror invites drift).

---

## 5. Dimension A — structural reconciliation (the "nothing dropped" proof)

A **mechanical engine**, run after every batch:
1. **Enumerate every source id** per artifact (rules, tree nodes/branches, tables, clauses,
   base-policy elements, conflicts, cross-references, linkage). These counts are the denominator.
2. **Partition every source element into a bucket** — ideally in one authoritative file
   (`‹e.g.› rule_buckets.json`): `converted` (a node/table/edge) · `partial` (value/trigger lifted,
   full element later) · `ledger` (a conflict seeded) · `reference` (non-branch content captured in
   a reference file) · `deferred` (not yet, **with target phase**) · `excluded` (won't enter, **with
   reason**). Assert the partition covers every id exactly once (no overlap, no omission).
3. **Discover what was actually converted** by scanning `crawlable/` for `_origin` back-pointers
   (graph + tables = converted; the capture files = reference/edges). Cross-check the partition
   against this discovery; a mismatch is a bug in one of them. *Verify the reconciliation engine
   itself on a known slice — an under-counting report is as dishonest as an over-counting one.*
4. **Assert the equation, per artifact:** `count_in == converted + partial + ledger + reference +
   deferred + excluded`. Print the table; emit `coverage_manifest.json` + `NOT_CONVERTED.md`.
5. **The bar:** every source id *accounted for* (100%); `deferred → 0` at completion. Note the honest
   distinction: *accounted ≠ converted* — `reference` is captured-not-executable, and that is a
   legitimate accounted bucket for non-branch content.

---

## 6. Dimension B — semantic fidelity via fresh-context adversarial verifiers

Mechanical checks confirm structure and values; they **cannot see meaning**. A compiled expression
can resolve and reference valid facts yet still have added scope, a dropped qualifier, the wrong
actor, inverted logic, the wrong threshold, or the wrong outcome. Catch that with **independent
fresh-context adversarial passes**, one+ per batch.

**Brief a subagent with no build context:**
- **Stance:** "Assume drift until proven faithful. Do not be agreeable; hunt for distortions."
- **Source of truth:** exact paths — and encourage cross-checking the raw page-anchored text (a
  fresh verifier reading the raw source catches *derived readings shipped as settled logic* a
  build-context reviewer would rationalize).
- **The distortion catalog:** added scope · dropped qualifier · wrong actor · inverted logic ·
  wrong threshold/operator · wrong outcome mapping.
- **Named spot-check values** so the verifier re-derives rather than eyeballs (turns "spot-check"
  into full-population verification — `‹e.g.›` re-derive all 96 matrix rows from the source strings).
- **A fixed output contract:** a per-element verdict table (PASS/DRIFT/QUESTION + one line of
  evidence) and a final `DRIFT COUNT: N`.

**The loop:** verify → on any DRIFT, fix against the verbatim source → **re-verify the fixes** →
only then mark the batch done. **A clean first pass on a data-heavy batch should make you
suspicious, not relieved** — in the run, the fresh pass on the rating tables caught 4 quote drifts
(values were correct; only meaning-level review saw the paraphrase). Record catch-and-fix in the
report; it is evidence the mechanism works.

**Second the vote on the decision-bearing logic.** One pass per batch *finds* drift; it does not
*confirm its absence*. Before done, run a second, independent fresh-context vote over the assembled
executable logic (the decision-bearing nodes + decision tables), briefed identically but blind to the
first pass and to the build. Two concurring independent votes is the multi-vote signal; a lone pass
is a single point of failure on exactly the part that fires. (In the run this second vote returned
DRIFT 0 *and* cleared a commutative AND-reorder a single reviewer might have false-flagged — the kind
of true-negative a second perspective buys.)

**Diversify the lenses, and review the conflict *tier* itself.** For the highest-stakes multi-vote —
the conflict tiers (§7) — give each independent verifier a *different* adversarial lens: one hunts
under-surfacing (a caveat/doc-level that should block or escalate), one hunts over-escalation (a
block/escalate the source actually settles), one hunts mis-filing (executable underwriting logic filed
as reference-only / left latent). Redundant identical reviewers mostly agree; diverse lenses catch
failure modes in opposite directions. The *tier assignment* is itself a verification target — a
conflict can be correctly captured yet served in the wrong tier (a caveat masking a contested outcome;
a prohibition list filed as "reference"). **Represent any tier dissent in the ledger; never flip a tier
on a minority vote** — that resolves a call the underwriter owns. (In the run, three lensed verifiers
confirmed 9/11 tiers, found 0 silent-resolution holes, and surfaced two genuine enrichments + one new
open item — with no tier flipped and no code changed.)

---

## 7. Conflict handling — the ledger and the three tiers

**The ledger (`rulings/`):** every source conflict is an OPEN entry holding all source variants
verbatim, a neutral summary, and a clearly-labelled **non-binding recommended resolution**. Seed
all known conflicts up front (even for not-yet-converted domains); it is the persistent home and
accumulates.

**The crawler never resolves a conflict.** Three tiers, by the conflict's nature:
1. **Provenance caveat** — the *reading* is contested but the branches encode the agreed structure.
   Return the outcome **plus a loud non-binding caveat** carrying the ledger ref. (`‹e.g.›` a
   two-threshold split derived from one sentence.)
2. **Structural fork** — the crawler genuinely cannot pick (`hit_policy: unique` with >1 match; a
   decision-table value on a flagged edge). It **escalates** with the options + ledger ref. Detected
   by the hit-policy / lookup machinery itself.
3. **Contested outcome** — the source *contradicts itself on the outcome* (`conflict.blocking:
   true`). The crawler **escalates when the node fires**.

Row-level conflicts (a discrepancy that applies to one table row, not the whole node) fire
**row-conditionally** — caveat only when the looked-up row is the discrepant one.

**Master routing precedence is itself often a conflict.** If the source describes several processes
but states no global precedence, *build the router* (the crawler needs an entry point) but **ship
the precedence as an open ruling**: assert only source-stated routings; `hit_policy: unique` so a
case triggering >1 routing **escalates** rather than silently picking.

---

## 7b. Verify the conflicts actually surface at runtime (the dynamic stress pass)

Dimensions A/B prove the *graph* matches the source. They do **not** prove the *crawler executes it
without silently resolving a conflict* — a tier can be mis-assigned, a conflict can be tagged in data
the executor never reads, an edge can resolve instead of escalate. Add a **dynamic** pass: a
non-destructive harness that runs the real crawler over generated inputs and asserts the property
**no input yields a confident outcome where the source is contradictory/undefined — it must escalate
or carry a caveat.** Build it under a throwaway dir (`troubleshoot testing/`), import only the clean
crawler module, and **never write to the canonical data** — inject faults into in-memory deep-copies.
Four layers, each a loop:

- **A — golden snapshot / regression guard.** Pin each demonstration case's outcome + decisive path +
  caveats + escalation; diff on every change. Honest about its limit: it guards against *regression*,
  not against being *wrong-vs-expert* (that needs a human-validated corpus).
- **B — property/fuzz sweeps.** Generated inputs, asserted invariants: every declared decision-table
  edge **escalates with a ledger ref** and clear interiors resolve; authority/threshold inclusivity
  (`<=`) holds at limit / limit±1; a **missing-fact matrix** (delete each fact) escalates gracefully,
  never crashes, and off-path facts are *not* demanded (short-circuit); determinism + fact-order
  independence; type-fuzz → escalation, never a crash, never a confident outcome.
- **C — mutation testing (the part that makes "green" mean something).** A passing checker is
  worthless until you prove it *catches* the faults it claims to. Inject each feared fault into an
  in-memory clone — flip a band inclusivity, delete a `boundary_conflicts` entry, remove a
  `blocking`/`conflict` flag, switch `hit_policy: unique→first`, nudge a threshold, re-tier
  blocking→caveat, drop a `source_quote` — and assert **some** check goes red. **Every surviving
  fault is a blind spot to close.** This is how you discover a check that was vacuously green.
- **D — conflict-ledger ↔ runtime cross-audit.** For **every** OPEN ruling, establish *either* a real
  input that surfaces it (caveat/escalate/block) *or* an explicit justification (reference-only
  contract text / latent table not yet wired / document-level metadata). The completeness analog of
  section-coverage, for conflicts. This is what catches **the most insidious class: a conflict
  represented in the data but never read by the executor.** (In the run: a document-level version
  conflict was attached via `_doc_conflicts` to 14 places but the crawler only read node-level
  `conflict` — so it surfaced on *zero* outcomes. Fix = surface it once as result metadata
  (`document_provenance`), and add a validator check so it can't recur. Decide *how* to surface a
  document-level conflict — once-as-metadata vs per-outcome caveat — but never leave it invisible.)

**Triage every finding** as *checker-bug* (false positive — fix the test, never degrade correct data),
*by-design* (e.g. a conflict declared in a table no node consumes yet — say so, don't fail), or
*real-issue* (fix the crawler/validator, re-run A–D + the static validator + coverage, log it). Apply
real fixes **only after** the trials, and confirm they are outcome-preserving (the snapshot stays
stable) unless a changed outcome is the intended fix.

---

## 8. Pitfalls and lessons (paid for in the run)

- **A reference-captured rule can hide *executable* logic.** "Not a branch → capture as reference" is
  right for contract text, but a prose rule can still state an enforceable prohibition/threshold (in the
  run: R-097's licitaciones "no pueden ser suscritas" list — alcoholemia > 0,70, Valor Admitido, licencia
  vencida > 90d). Filed as reference, the crawler never enforces it and a violating case routes to
  *eligible* silently. When you node-ify such a list: copy each `source_quote` from the captured rule
  (don't paraphrase), use the outcome the source's own words imply (process-scoped `decline` for "cannot
  be subscribed"; `refer_authority` where the source names an authorizer), leave non-exclusion items
  (handling/reimbursement rules) in reference, flag any granularity the source doesn't state
  (decline-the-quote vs strip-the-condition) in a `_derived_note`, and move the rule
  reference→node_converted in the bucket partition + regenerate so coverage stays exact. A node-level
  `conflict` on the new gate makes any cross-doc tension (the 0,50-vs-0,70 alcoholemia numbers) surface
  at runtime. *A fresh-context reviewer reading the source — not the build — is what catches these
  (here, the Layer-E tier review flagged R-097).*
- **Quote-fidelity drift is the #1 trap.** Values are easy to get right; verbatim quotes are easy to
  paraphrase, truncate, import from a neighbour, or fabricate from a related rule. Mechanical checks
  miss it — it is exactly what the fresh-context semantic pass is for. Treat `source_quote` as
  copy-only.
- **Derived readings shipped as settled logic.** If a representation field contains an inference not
  in the bare verbatim and you compile it into hard logic, **disclose the provenance** on the node.
  Faithful-to-the-representation ≠ faithful-to-the-bare-bullet; say which.
- **Verify the reconciliation engine.** A namespacing mismatch made the first coverage run report
  converted elements as deferred. Test it on a known slice.
- **Model ambiguous band edges as gaps, not as a picked side.** Exclusive-bound the rows around a
  flagged edge so the exact value escalates; don't silently assign it to one band.
- **A band-partition check is only as good as its edge math.** *Mandating* "flag every gap/overlap"
  is not the same as *detecting* them. A naive overlap test (strict `<`) silently misses two cases:
  an undeclared **gap** between rows, and a **point-overlap** where two rows share an *inclusive*
  endpoint. Enforce both — inclusivity-aware overlap (closed-interval intersection, not `<`) **plus**
  a sorted-row gap scan. Add a per-table **`granularity`** (e.g. money = 0.01) so rows that
  legitimately abut by one unit don't read as a gap, and a **float epsilon** so `10500.01 - 10500 >
  0.01` doesn't false-positive. Keep the declared edge values **numeric** (not `"50-51"`): the scan
  compares against them, and a string edge defeats the check. Prove the net by feeding it a
  deliberately broken table and watching it go red, then restore green.
- **Short-circuit your evaluator's `and`/`or`** so a missing fact in an un-reached operand never
  triggers a spurious "ask for this fact."
- **Reachability must root from every entry point** (the router *and* every process/flow entry — a
  crawl may enter renewal/temporal flows directly) and follow `refer_process`→process-entry edges,
  or legitimate nodes look orphaned.
- **Audit completeness:** a plain-fired node that emits a terminal outcome must still append an
  audit step, or the nodes-fired trail silently omits the deciding node.
- **Handoff vs continuation:** only the router continues into a process; other `refer_process` are
  handoffs that terminate with context.
- **Derived indexes drift; regenerate them** (`‹e.g.›` a fact→node `required_by` index — make it
  generated, warn only on stale pointers).
- **Mechanical before model:** generate tables/reference/clause captures by parsing the
  representation; never retype values. Re-runnable when the source changes.
- **Output encoding is a portability trap.** Scripts that print Unicode (em-dashes, check marks,
  arrows, accented source text) crash with `UnicodeEncodeError` under a non-UTF-8 stdout (ascii /
  POSIX locale / some CI pipes). Force UTF-8 at the top of every printing script
  (`sys.stdout.reconfigure(encoding="utf-8")`) - it passes on the dev terminal but bites elsewhere.
- **Bad input should escalate, not crash.** A wrong-typed fact (a string where a number is
  expected) must route to an escalation with context, not a hard exception: guard numeric
  comparisons/lookups and turn DATA errors into escalations, while letting genuine code bugs surface.
- **A conflict tagged in data the executor never reads is silently omitted.** Representing a conflict
  is necessary but not sufficient — the *consumer* must surface it. Document-level conflicts
  (`_doc_conflicts`) and any side-channel the crawler doesn't read will be invisible at runtime. Add a
  **conflict-coverage check** (every OPEN ruling is referenced by a construct the executor reads, or
  explicitly justified) and an attribution check (a multi-edge table must cite the edge actually hit,
  not `boundary_conflicts[0]`).
- **A green checker proves nothing until you've shown it catches faults.** Mutation-test the checks
  themselves (§7b Layer C): inject the feared fault into an in-memory clone and confirm a check goes
  red; a survivor is a vacuous check. This is the difference between "the validator passed" and "the
  validator would catch the mistake we fear."
- **An executable graph is often only partially wired — measure the dead zones.** If lift/branch
  terminal outcomes don't re-enter later stages, conflict/authority nodes ordered after a lift are
  unreachable for those cases; and tables consumed by no node yet (deferred rating) can't surface
  their conflicts. Neither is a bug, but **report the dead zones explicitly** (`log()` them), because
  silence reads as "covered" when it isn't.

---

## 9. The mechanical validator contract (extends "matches source" to "executes deterministically")

A batch is not done until the validator is green: (1) every node has id (unique), type, process,
source, **source_quote**, _origin; (2) every fact referenced (needs_facts / conditions / exceptions
/ authority constraints) is defined; (3) every parameter/`@tables.*`/matrix reference resolves to a
table of the right role; (4) every referral/branch target resolves (node id | process | line |
committee | external); (5) every outcome ∈ the enum; (6) router/gate (and multi-branch nodes) have
hit_policy + on_no_match; (7) no order collision; no unreachable node (reachability from every
process entry); (8) every decision-table row carries explicit inclusivity, and the partition check is
**inclusivity-aware** — closed-interval overlap + a sorted-row gap scan, with a per-table
granularity and a float epsilon — so every undeclared gap **and** inclusive point-overlap is caught
(not just the easy overlaps); each flagged edge → ledger, with edge values numeric so the scan can
compare them; (9) every conflict / boundary / cross-table `ledger_ref` exists; (10) conditions
use only the chosen language's closed operator set with pinned operand types; (11) every captured
reference record carries `_origin` (+ source_quote where applicable); (12) **conflict-coverage** —
every OPEN ledger entry is referenced by a construct the executor actually reads (node `conflict` /
consumed-table boundary or cross-table conflict / a surfaced `_doc_conflicts`) **or** is explicitly
listed as ledger-only-by-design with a reason, so a represented conflict can never be silently
unsurfaced. (Prove this and every other check is load-bearing by mutation-testing it — §7b/C.)

**⚠ Per-business hardcoding — check before reuse.** The reference `validate.py` hardcodes the
business vocabulary as enums — `PROCESSES`, `LINES`, `COMMITTEES` (the process taxonomy, downstream
lines, committees). The check *logic* is manual-agnostic, but these enums are **not yet externalized
to a profile**, so **reusing the validator on another manual requires reviewing and swapping them per
business** (§11). `OUTCOMES` / `NODE_TYPES` and the operator set are generic schema and normally
stand. The same per-business review applies to `crawl.py`'s `PROCESSES_NOT_BUILT` set and its Spanish
escalation strings. Until these are lifted into the profile, treat "swap a handful of enum constants"
as a required first step for a new manual, not "untouched engine."

---

## 10. The per-batch operating loop

```
scope a domain
  └─ convert (mechanical-before-model; one node per source element; S1 on every node; S2 for bands;
     non-branch content -> reference capture; partition every element in the buckets file)
       └─ build_* generators + sync_facts (regenerate tables/reference/clauses/indexes)
            └─ validate.py  ───────────►  GREEN (the §9 contract)
                 └─ coverage.py  ───────►  reconcile per-artifact; deferred shrinks; manifest + NOT_CONVERTED updated
                      └─ fresh-context verifier (dimension B, §6)  ──►  DRIFT COUNT
                           └─ if DRIFT > 0: fix against verbatim source, RE-VERIFY, repeat
                                └─ roll into COVERAGE_REPORT.md (A table + B verdicts + backlog)
                                     └─ next batch
```
`COVERAGE_REPORT.md` + `coverage_manifest.json` are the cross-session memory.

---

## 11. The per-manual profile — what actually changes between manuals

Almost everything above is manual-agnostic. The per-manual variation is small and belongs in a
profile/config: the **vocabulary** (process taxonomy, clause/code prefix, routing keywords,
segment/term glossary, `normalize_id()` rules, committee/line names); the **condition-shape
inventory** (drives the §4 language choice — usually the default); the **role-typing of tables**
(brackets vs matrices vs scalars vs reference) and the parse rules for the source's number formats
(`build_tables.py` params); the **element→bucket partition** (the buckets file) and which content is
`reference` vs node; the **conflict set** (seed the ledger); the **`on_missing` policy** per fact
class and the entry point (router vs per-process); the **stage pipeline** (which stages, expressed
as `order` ranges). A new manual: extract with `Manual Prompt.md` → author its profile → run this
engine's per-batch loop. No engine code changes; the A+B proof discipline is identical.

---

## 12. Done-definition

- `COVERAGE_REPORT.md` shows **100% of source ids accounted**, `deferred = 0`, the equation holding
  for every artifact.
- **Residual semantic drift 0** — every converted element had an independent fresh-context pass;
  every caught drift was fixed and re-verified.
- Validator **green** on the full §9 contract.
- Every source conflict is an OPEN (or ruled) ledger entry; none silently resolved.
- The crawler resolves the regression corpus (clean accept/decline, liftable both ways, one case
  per contested ruling, a cross-process referral/handoff, an escalation-with-context, a band-edge
  escalation) against human-validated answers.
- A second manual runs end-to-end on the **untouched engine** via its profile alone.

---

## 13. Lessons from building *upward* (the platform layer)

A platform was later built *on top* of a finished representation+graph (a backend/engine/UI/deploy
stack that **consumes** the graph at runtime). Building upward didn't change the extraction method, but
it paid for several manual-agnostic **Part-2** lessons worth carrying forward:

- **A policy is usually TWO crawlable domains, not one.** The underwriting/decision side
  (eligible/decline/refer) and the **coverage-adjudication** side (covered/not-covered/refer) are
  *different engines* — different node types, outcome enums, and fact registries — that should share
  **one** `rulings/` ledger. Model them as **siblings**, not one merged graph (forcing a single schema
  over both is the mistake). Each gets its own validator/reconciler mirroring §5/§9.
- **One runtime, many domains: keep the runtime, swap the data.** The reusable shape is a single
  runtime (short-circuit JSONLogic + missing-fact escalation + conflict escalation + audit trail +
  terminal shape) plus a per-domain **EngineSpec** (artifact root, facts path, validator path, section
  discriminator, outcome labels). This is exactly the §11 per-manual profile *made executable* — and the
  concrete down-payment on standardization. New domain/manual = new artifacts + spec, **no new evaluator**.
- **Multiple engines + one ledger ⇒ the conflict-coverage check must be ENGINE-AWARE.** §9's "every OPEN
  ruling is anchored by some runtime construct" check must scan **all** engines' anchors. A per-engine
  checker that sees only its own graph will falsely report another engine's (legitimately-anchored)
  ruling as orphaned — a false RED, not a real hole. Harvest anchors **read-only** across engines; do
  **not** merge the validators (the schemas differ).
- **An AI/NL supply side is allowed — behind a never-fabricate wall.** §0's "an adapter may map and
  flag-missing, never fabricate" survives an LLM extractor *iff* its output is **advisory**: extracted
  facts stay `confirmed:false`, a human confirms, and the engine **refuses** unconfirmed facts at a hard
  gate. The wall — not the absence of AI — is what preserves the fidelity mandate.
- **Isolate any non-source-anchored stage (e.g. reverse-engineered rating).** If a number isn't in the
  source (rates lifted from observed behaviour), it must live in a **separate compartment** the audited
  decision path *calls* (only after a decision) but never mixes into `representation/` or the graph —
  and it must be labelled a fidelity exception. Likewise, mark each engine's outputs by **authority
  level** (e.g. coverage results as *orientation*, not a final determination).

These are downstream lessons; the **extraction** method (`Manual Prompt.md`) is unchanged.
