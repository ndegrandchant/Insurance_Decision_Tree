# Transfer prompt — start Part 2 (representation → crawlable decision tree)

> Paste the block below into a fresh chat. Everything it needs is inside the working directory; you don't have to attach files. If your setup requires attachments, attach `CLAUDE.md` and `PROJECT_CONTEXT.md` and it will read the rest from disk.

---

Working directory: `/Users/nicolasdegrandchant/Desktop/Fable_Approach`

**Your job.** Convert the already-extracted, already-verified *representation* of two LBC insurance documents (in `representation/`) into an executable, **crawlable decision graph** — Part 2 of this project. You are giving verified data an execution spine. You are **not** re-extracting from the PDFs and **not** editing `representation/`.

**Read these first, in order, before doing anything:**
1. `CLAUDE.md` — behavioral guardrails; they override your defaults. **Accuracy is the single hard priority.**
2. `PROJECT_CONTEXT.md` — full project state. Read all of it, then re-read **§9** (entry point, canonical schema, output layout) and **§5b** (the known source conflicts you must NOT resolve).
3. `Crawlable_Roadmap.md` — the plan. You are doing **Phase 0 → Phase 1**, including Tasks **S1** and **S2**.
4. `Crawlable_Migration_Notes.md` — what to borrow ("their skeleton, our data") and what not to.
5. `reference_approach1/` — the canonical node schema to copy: `schema.py`, `graph/3.1.2.json` (the hand-validated few-shot exemplar), `router.json`, `graph/4.1.json`, `tables.json`, `NEEDS-FACTS-TEMPLATE.md`.

**Non-negotiable rules (violating any of these fails the task):**
- **Accuracy first.** Never invent, infer, smooth over, or "improve" logic that isn't in the source.
- **Their skeleton, our data.** Adopt Approach-1's node schema *as-is* (types `router|gate|condition|authority|referral|accumulator|terminal`; enumerated outcomes; `needs_facts`; `evaluate`/`branches`; `exception`; `@tables.*`). Do **not** design a new schema. Extend it only with **Task S1** (`source_quote` + `source.version` + a first-class `conflict` object on every node) and **Task S2** (bracket/band logic as DMN-style decision tables with explicit `lower_inclusive`/`upper_inclusive` + `hit_policy`).
- **Conflicts are data, never resolved.** Every flag/conflict in the representation (PROJECT_CONTEXT §5b — clause 2023's two texts, the v3.0/4.0 identity, the renovación overlap, the band boundaries, the flota thresholds, alcoholemia, 2133-vs-2140, etc.) must survive as a first-class `conflict` object pointing to a `crawlable/rulings/` entry. You do **not** pick a winner.
- **`representation/` is READ-ONLY.** Write all Part-2 output under `crawlable/` (layout in PROJECT_CONTEXT §9.4). `crawlable/` is *generated* from `representation/` + `crawlable/rulings/`; never hand-patch a resolution into the graph, never edit `representation/`.
- **Verbatim survives.** Every executable node carries the exact `source_quote` it was compiled from — copied from `rules.json` / `clause_texts/`, never paraphrased.

**THE DATA-LOSS MANDATE — this is the point of the task. Prove you lost nothing, in two dimensions:**

- **(A) Structural — nothing silently dropped.** Build and maintain a persistent coverage manifest. **Every** rule id (`rules.json`, 84), every tree node (`decision_trees.json`, 4 trees), every table (`tables.json`, 24), every clause code (`clause_registry.json`, 152), every base_policy element, every conflict/flag, and every cross-reference must map to EITHER (a) a node/table/fact/edge in `crawlable/`, OR (b) an explicit line in `crawlable/NOT_CONVERTED.md` with a reason (e.g. "supplementary example — not decision logic"). Nothing may vanish without a recorded reason. Then a **mechanical reconciliation**: `count_in == count_converted + count_explicitly_excluded`, printed as a table per source artifact.
- **(B) Semantic — no compiled expression drifts from its source.** For every converted node, check the `evaluate`/`branches`/`exception` back against that node's verbatim `source_quote` for any **added scope, dropped qualifier, wrong actor, or inverted logic**. Run this as an independent verification pass — ideally fresh-context sub-checks, the way the original extraction was verified (see `verification_report.md`) — and log a verdict per node.
- **Deliverable:** `crawlable/COVERAGE_REPORT.md` = the reconciliation table (A) + the per-node semantic verdicts (B) + the `NOT_CONVERTED` list. **The task is not done until this report shows 100% of source data accounted for and zero unexplained semantic drift.** If the work spans multiple sessions, this report and the manifest are files that persist and accumulate.

**Start here — prove the shape before scaling:**
1. **Lock the schema.** Read `reference_approach1/`; write `crawlable/node_schema.md` = Approach-1 fields + S1 + S2.
2. **Phase 0 proof slice.** Hand-convert ONE eligibility path end-to-end (gate → an exclusion with a liftable exception → a `refer_process` → an outcome, plus one `@tables`-referencing branch). Build a **minimal crawler** that returns an outcome **with its audit path** (nodes fired, the `source_quote`s, the facts used) and does **escalation-with-context** (refer *this one question* + the missing fact + which node). Resolve 3 cases (clean accept, clean decline, liftable exception both ways). **Show me this works before converting the rest.**
3. **Then convert systematically**, in domain-sized batches (eligibility → authority → rating → renovación/retroactividad → clause links), each batch fully reconciled (A) and semantically verified (B) before the next, all rolling up into the one persistent `COVERAGE_REPORT.md`.

**Ask me — do NOT guess on these; surface them as questions early:**
- **Expression language** for `evaluate`: keep Approach-1's custom DSL, or adopt a standard (JSONLogic / CEL / DMN FEEL)? (I lean toward DMN for the bracket/band tables — confirm.)
- **Conflict handling:** should you attempt any resolutions yourself, or leave 100% to the rulings ledger for me / an underwriter? (Default: leave ALL to the ledger.)
- **Crawler runtime** language/format, and whether you may write validator/crawler scripts now.
- **Anything ambiguous for conversion** — ask before interpreting, never invent a reading.

**Verify continuously.** Extend the existing discipline: a mechanical validator (every `fact` defined in the registry, every `@tables.x` resolves, every `referral_target` exists, every `outcome` in the enum, every router/gate has `hit_policy` + `on_no_match`, no unreachable leaf, no band boundary ambiguous unless flagged to a ruling, every node has a `source_quote`) **plus** the semantic-fidelity pass (B). Report status at each checkpoint.

You have standing permission to ask me clarifying questions at any time. **Begin by reading the files, then ask me the open decisions above before building.**

---
