# reference_approach1/ — frozen schema reference (snapshot)

These are **read-only snapshots** of the 7 files a Part-2 (crawlable) chat needs from the *other* project, "Approach 1," copied here so this workspace is self-contained — no cross-directory access required. **Do not edit them; they are a reference, not a working copy.**

| File here | Original (source of truth) | Use |
|---|---|---|
| `schema.py` | `…/Approach1/lbc_extraction1/lbc-extractor/src/schema.py` | the typed node contract (NODE_TYPES, OUTCOMES, REFERRAL_KINDS, required fields) |
| `graph/3.1.2.json` | `…/output/graph/3.1.2.json` | **the hand-validated few-shot exemplar** — best template for an eligibility section |
| `graph/router.json` | `…/output/graph/router.json` | the process-router shape |
| `graph/4.1.json` | `…/output/graph/4.1.json` | rating/bands node shapes (`accumulator`, etc.) |
| `tables.json` | `…/output/tables.json` | role-typed table buckets referenced as `@tables.*` |
| `NEEDS-FACTS-TEMPLATE.md` | `…/Approach1/NEEDS-FACTS-TEMPLATE.md` | the fact-registry template |
| `A-PROJECT-TODO-SEQUENCE.md` | `…/Approach1/A-PROJECT-TODO-SEQUENCE.md` | the original 10-phase roadmap (our `Crawlable_Roadmap.md` is its adaptation) |

Full original base path:
`/Users/nicolasdegrandchant/Desktop/Manual_Processor/lbc_decision_trees/manual_processor/Approach1/`

**Caveat — this is a snapshot.** If Approach 1 evolves, re-copy these 7 files. They were frozen at the close of Part 1 of this project. Reuse the *schema shape*, not any LBC-specific values (those come from this project's `representation/`, which is the higher-fidelity data — see `../Crawlable_Migration_Notes.md`, "their skeleton, our data").
