# Doc-Sync Roadmap for Santi

**Why this exists.** Your `santi` branch (the insurance platform — `platform/`, `deploy/`, and the
`crawlable/` coverage layer) was merged into `main` alongside nico's verification layer. The merge was
clean — **zero file overlap, nothing lost** — but the repo's *front-door / orientation* docs predate
your platform and were never updated to mention it, and a few now assert stale counts/status. This is
the exact list of what to fix, in priority order.

**Use your own chat context.** Items tagged **[needs your platform context]** are best written by you,
pulling from your platform-build chats — you know the backend API surface, the engine
(`UWEngine` / `ArtifactGraphEngine`), the React frontend, the Postgres schema, the deploy story, and the
coverage-slice modeling. Describe *what exists and how it consumes the crawlable graph* (the engine
executes `graph/*.json` + `facts.json` at runtime via JSONLogic — it does **not** reimplement them).

**Ownership legend:** `[Santi]` you own it · `[Joint]` needs the validator/ledger decision settled first
(see "Sequencing") · paths are repo-relative.

---

## Priority 1 — the map/onboarding docs are blind to the platform

### 1. `README.md` — the project map / front door  `[Santi]` + `[Joint]`
- **Add the missing components** to §D's file map and the "Start here" table: `platform/` (backend +
  engine + frontend + db), `deploy/` (Docker/Caddy/VPS), and the coverage layer
  (`crawlable/graph_coverage/`, `coverage_reconcile.py`, `coverage_validate.py`, `facts_coverage.json`,
  `coverage_slice_manifest.json`, `COVERAGE_SLICE_REPORT.md`). **[needs your platform context]**
- Fix the ledger count **16 → 18** (the `crawlable/rulings/` row, ~line 104). `[Joint]`
- Reconcile the "two parts — both complete and verified" framing — there is now a third layer (platform)
  and open core work. Align the `troubleshoot testing/` description "Layers A–D" → **A–E**.

### 2. `PROJECT_CONTEXT.md` — the fresh-chat onboarding briefing  `[Santi]` + `[Joint]`
- §2 "Status" and §3 "Artifacts": add the platform + coverage layer. **[needs your platform context]**
- Line 28 / line 54: "**16**-entry conflict ledger … Validator **GREEN**" → 18 + the real current
  validator state. `[Joint]`
- **Do NOT change** the working-dir path `/Users/nicolasdegrandchant/Desktop/Fable_Approach` — that is
  nico's real local directory and is correct (it is not the temp clone name).

---

## Priority 2 — `crawlable/` docs carry a stale ledger count (16 → 18)  `[Joint — now unblocked]`

Your coverage slice added 2 OPEN rulings (→ **18**). The validator gap that briefly made `validate.py`
RED is **fixed** (D-P9: `validate.py [11]` + the stress-harness Layer D are now engine-aware; the
validator is **GREEN at 18 rulings**, both validators kept as separate files). So the "Validator GREEN"
claims below are **accurate again** — the only stale bits are the **count (16 → 18)** and the coverage
layer missing from file lists. Per-doc:

| Doc | What's stale | Fix |
|---|---|---|
| `crawlable/README.md` | "## Status: COMPLETE … Validator GREEN"; Layout/Run omit the coverage layer | GREEN→current; add coverage-layer files + a `coverage_validate.py` run line |
| `crawlable/COVERAGE_REPORT.md` | L20/22/85–91 enumerate **16** OPEN + "Validator GREEN — 0 errors" | →18; add your 2 rulings to the enumeration; point to `COVERAGE_SLICE_REPORT.md` |
| `crawlable/CONVERSION_RECORD.md` | "State at writing: Validator GREEN; 16 entries" | add a dated note: coverage layer added 2 rulings (→18); current validator state |
| `crawlable/decisions.md` | line ~183 "validate.py GREEN" now contradicts D-P6 (unanchored OPEN ruling ⇒ RED) | update the parenthetical to RED-until-anchored |

---

## Priority 3 — redundancy / hygiene  `[Santi]`

### 3. `AGENTS.md`
It is a **byte-for-byte copy of `CLAUDE.md`** (only the title line differs) and still says "Working
guidelines for the insurance-manual extraction" — it mentions nothing about the platform it shipped
with. Either **delete it** and rely on `CLAUDE.md`, or **repurpose it** for platform/agent-specific
guidance. Your call — you added it and have the context.

---

## Sequencing — the validator decision is now RESOLVED (D-P9)

The `[Joint]` items are **unblocked**. nico resolved the shared-ledger gap (D-P9): `validate.py [11]`
and the stress-harness `layer_d_crossaudit.py` now harvest the coverage layer's conflict anchors, so the
two coverage-anchored rulings are recognized, **both validators stay separate files**, and `validate.py`
is **GREEN at 18 rulings**. Every `[Joint]` doc fix is therefore mechanical now: **16 → 18**, and keep
"Validator GREEN" (it's true). The `[Santi]` / platform-awareness edits (README/PROJECT_CONTEXT map
additions, AGENTS.md) only ever needed your context — do them anytime.
