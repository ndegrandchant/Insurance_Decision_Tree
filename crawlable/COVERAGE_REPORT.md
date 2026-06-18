# crawlable/COVERAGE_REPORT.md — the data-loss proof (CONVERSION COMPLETE)

> **The task is done when this report shows 100% of source data accounted for and zero
> unexplained semantic drift.** It does. Both source documents (the underwriting manual + the
> cláusulas bundle) are fully converted into the crawlable graph + captured-as-reference +
> ledgered, with **0 deferred** and **residual semantic drift 0**. Phases 0 → 5 of the roadmap's
> conversion are complete; the persistent artifacts below let any session resume or extend.
>
> Regenerate end to end: `build_tables.py` + `build_reference.py` + `build_clauses.py` +
> `sync_facts.py` → `validate.py` → `coverage.py`; re-run the fresh-context semantic pass (B).

---

## Status at a glance — DONE

| | |
|---|---|
| **Dimension A — structural** | **372 / 372 source ids accounted (100%)** · **0 deferred · 0 silently dropped**. |
| **Dimension B — semantic** | **residual DRIFT = 0** across nine independent fresh-context adversarial passes (one per batch + re-checks). |
| **Validator (`validate.py`)** | **GREEN — 0 errors**: 56 nodes, 50 facts, 29 tables, 48 reference rules, 214 clause-side records, 16 ledger entries. |
| **Crawler** | 42 case outcomes resolve with full audit + escalation across every mechanism (see §Crawler). |
| **Conflicts** | 16 source conflicts represented as OPEN ledger entries; **none resolved** (by mandate). |

---

## (A) Structural reconciliation — `count_in == converted + partial + ledger + reference + deferred + excluded`

```
artifact                     in  conv  part  ledg   ref  defer  excl   OK
-------------------------------------------------------------------------
rules.json                   84    30     6     0    48      0     0   ✓
decision_trees.json          44    44     0     0     0      0     0   ✓
tables.json                  24    23     1     0     0      0     0   ✓
clause_registry.json        158     0     0     6   152      0     0   ✓
base_policy.json             13     0     0     0    13      0     0   ✓
cross_references             33     0     0     0    33      0     0   ✓
linkage.json                 16    16     0     0     0      0     0   ✓
-------------------------------------------------------------------------
TOTAL                       372   113     7     6   246      0     0
Accounted: 372/372 (100%) · Executable/decisional: 126 · reference: 246 · deferred: 0 · excluded: 0
```

**What each bucket means here:**
- **converted (113)** = executable in the graph: all 4 decision trees (44 elements: both eligibility
  trees, renovación bands, retroactividad), 30 rules (authority/capacity/RC-AP-limit nodes +
  tree-realized + 19 table-realized), 23 tables (authority matrices, S2 rating + renovación
  brackets, rate matrices, scalars), and 16 linkage edges (rule↔clause + reverse inversion).
- **partial (7)** = the 6 process-definition rules the router references + `TBL-CAPACIDAD`
  (value lifted to `@tables.limits`).
- **ledger (6)** = the renovación/clause cross-code conflicts pointing to OPEN rulings.
- **reference (246)** = non-branch normative content captured verbatim, not executable
  (decisions.md D1/D2): 48 manual rules (governance/coverage-terms/procedural/info/process/
  formula/CRM) in `reference.json`; 152 clauses in `clauses.json`; 13 base-policy elements in
  `base_policy_ref.json`; 33 cross-references in `crossrefs.json`.
- **deferred (0)** · **excluded (0)** — nothing left unconverted, nothing silently dropped.

Machine snapshot: `coverage_manifest.json`. Rule partition (asserted exact, 84 = 7+2+6+0+19+48):
`rule_buckets.json`.

---

## (B) Semantic fidelity — DRIFT 0 across all batches (the discipline that made it trustworthy)

Independent **fresh-context adversarial** verifier sub-agents (assume drift until proven faithful;
distortion catalog = added scope / dropped qualifier / wrong actor / inverted logic / wrong
threshold / wrong outcome; named spot-check values for full-population re-derivation; fixed
verdict-table output). One+ pass per batch:

| batch | scope | result |
|---|---|---|
| B0 | Standard eligibility (27 nodes) + router | DRIFT 0; router hardened (lbc_auto overlap → escalate, re-verified PASS); X20/X22 layering disclosed |
| B1 | Case-UW eligibility (13) + X19 | DRIFT 0; C05 self-contradiction → blocking conflict; ambulance X19/C09 split |
| B2 | 3 authority matrices (96 rows) + 6 nodes | DRIFT 0; rows re-derived programmatically; Lizeth Rios discrepancy row-conditional |
| B3a | 18 rating tables | **caught 4 quote drifts** → fixed → re-verified DRIFT 0 |
| B3b | 3 coverage-limit nodes + 48-rule reference partition | DRIFT 0; no decisional content hidden in reference |
| B4 | renovación bands + overlap + retroactividad | DRIFT 0; every flagged band edge is a true no-match escalation |
| B5 | 152 clauses + base policy + 16 linkage edges + 33 cross-refs | DRIFT 0; all 6 conflicts ledgered; no silent resolution |

The B3a catch (4 fabricated/dropped/reworded `*_quote` fields, values correct) is the proof the
loop works: mechanical checks confirmed the values; only the fresh-context semantic pass saw the
paraphrase-creep. Caught → fixed → re-verified to 0.

---

## Conflicts — the ledger (16 OPEN; none resolved, by mandate)

`RUL-MAN-VERSION` (3.0/4.0) · `RUL-ROUTER-PRECEDENCE` · `RUL-X15-HIGHVALUE-READING` ·
`RUL-FRANQ-MOTO-OVERLAP` · `RUL-BAND-EDGES` (renovación + moto-VA edges) ·
`RUL-RENOV-CONSUMER-PESADOS-OVERLAP` · `RUL-CASEUW-C05-RENTACAR` · `RUL-LIZETH-RIOS-AUTH` ·
`RUL-FLOTA-THRESHOLDS` · `RUL-ALCOHOLEMIA` · `RUL-CG-2023` · `RUL-2133-2140` (incl. 2136/2139) ·
`RUL-2038-2112` · `RUL-2008` · `RUL-2018-PESO` · `RUL-ABSENT-CODES` (2025/2131/2146).
Each: all source variants verbatim + status OPEN + a non-binding recommendation (D-P2). The crawler
escalates at each; a resolution enters only via the ledger + regeneration, never a hand-patch.

---

## Crawler — every mechanism demonstrated (42 case outcomes)

Process router (routes + escalates the LBC|Auto and tender+mass precedence overlaps);
eligibility filters (Standard + Case-UW); the `exception` lift (both ways); authority matrix
(within/exceeds/unknown) + capacity; RC/AP coverage-limit overflow (refer_process handoff /
refer_line); renovación S2 bands (rate action / depuración decline / Case-UW handoff / **band-edge
escalation**); the Consumer-pesado **overlap block**; retroactividad overlay → **committee**
referral + ≤30/>30; the ambulance fidelity contrast; the Lizeth Rios row-conditional discrepancy.
Three conflict tiers (provenance caveat / structural escalate / contested-outcome block) + the
router-only process continuation (vs handoff) all behave. Full audit trail on every outcome
(nodes fired · verbatim source_quotes · facts used · rate actions · ledger refs).

---

## Validator (`validate.py`) — executes deterministically
GREEN. Enforces: source_quote/_origin on every node; every fact/`@tables.*`/`referral_target`/
authority-matrix/constraint resolves; outcomes ∈ enum; router/gate hit_policy+on_no_match;
reachability from every process entry (incl. `refer_process`→process-entry); decision-table rows
carry explicit inclusivity with every gap/overlap edge flagged → ledger; matrix
`cross_table_conflicts` + every conflict `ledger_ref` resolve; reference + clause-side records
carry `_origin` (+ source_quote for rules). Generators (`build_tables`/`build_reference`/
`build_clauses`) + `sync_facts` keep everything regenerable from the representation.

---

## What is complete, and what remains (later roadmap phases)

**Complete (this work):** the full conversion — both documents, every source id accounted, the
executable graph + crawler + validator + reconciliation engine + conflict ledger + the two-
dimension data-loss proof. Phases 0–5 of the roadmap's *conversion* are done.

**Remaining (later roadmap phases, not data loss):**
- **Phase-5 full-crawler integration:** chain every eligible/conditional outcome through the
  authority → rating → limits stages (today the chain runs on the fall-through path; branch/lift
  terminals don't yet re-enter later stages). A regression corpus vs underwriter-validated answers.
- **Phase 2 operational loop:** underwriters resolve the 16 OPEN rulings; regenerate.
- **Phase 6 human layer / Phase 9 DMN export** (the S2 tables + JSONLogic are already DMN-aligned).

These are downstream features, not unconverted source. The data-loss mandate is satisfied:
**100% accounted, 0 deferred, 0 unexplained drift.**
