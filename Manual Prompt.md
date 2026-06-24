# Manual Prompt — A Reusable Playbook for Extracting Machine-Usable Logic from Insurance Manuals

> **What this is.** A heavily-instructed, transferable guide for turning insurance source documents (underwriting manuals, registered policy-clause bundles, condicionados, tariff books) into an accurate, machine-consumable representation. It encodes the method that produced the `representation/` deliverable in this project, generalized so it can be pointed at a *different* manual tomorrow.
>
> **How to use it.** Read §0 and §1 before touching the document. §1 is the part that matters most: it is not a list of facts about one manual, it is a way of *looking* at any manual. The remaining sections are the execution and verification machinery. The Appendices are copy-pasteable command kits and subagent prompt templates.
>
> **Scope — read this.** This playbook is **Part 1 only: faithful *extraction* into a representation.** Turning that representation into an executable / crawlable decision graph (nodes, a crawler, conflict tiers, DMN tables) is a *separate* method with its own playbook — `Crawlable_Conversions.md`. Every lesson here is about **extraction fidelity**, not execution. Where execution matters to the extractor, it appears only as a forward pointer to the Part-2 doc, never as conversion instructions.
>
> **The one hard rule, above all others:** accuracy of the extracted logic. Never invent, infer, smooth over, or "improve" logic that is not in the source. When the source is ambiguous, incomplete, or self-contradictory, **represent the ambiguity explicitly — do not resolve it silently.** Every other instruction here is downstream of this one.

---

## §0. Operating principles (non-negotiable; everything else serves these)

These are invariants. If a later instruction ever seems to conflict with one of these, the principle wins.

1. **Adopt the document's own organizing logic; never impose a schema.** The shape of the representation is *discovered*, not decided in advance. The document almost always tells you how it wants to be modeled — through its identity system, its headings, its repetition, its numbering. Your job in recon (§1) is to find that and follow it.
2. **Verbatim is canonical; structured is derived and must be tagged as such.** Any field that is your *reading* of the source (a normalized condition, an effect summary, a category) is derived. Tag it (`_derived: true`, `material_class`, etc.) and keep it next to — never in place of — the verbatim text it came from. A consumer must always be able to fall back to the exact source words. **A derived *outcome* is as flag-worthy as a derived *condition*.** When one source sentence packs a trigger and an outcome the source never explicitly states — e.g. "vehicles over Bs X must validate their importer" read as "…→ *eligible*" — tag the *outcome* as derived, not just the condition split. Otherwise a downstream consumer (or a later executor) ships an accept/decline the source never granted, with nothing flagging it. (In this project the high-value "validated-importer → eligible" reading was exactly such a derived accept.)
3. **Anchor every element to its source location.** Section, clause, page, and/or the quoted trigger text. An extraction you cannot point back to the page is not auditable and therefore not trustworthy. Distinguish *physical* page (the PDF page a reader opens) from any *printed* page number the document uses internally — and record both if the document cross-references its own printed numbers.
4. **Represent conflicts and ambiguity; never resolve them.** Same code with two different texts, version numbers that disagree, thresholds that differ by context, a value that contradicts another — all of these are *source facts*. Capture every side with its anchor and flag the tension. Resolving it is a business decision that belongs to the document owner, not the extractor. **A self-inconsistency can be more than metadata — check whether it poisons your extracted *values*.** When a document disagrees on its own version *and* carries a change log, cross-check whether the change log's listed changes touch values you extracted: a version conflict can mean the body's *numbers* (authority limits, capacities, tariffs) are a stale prior version, not just an identity discrepancy. Flag the *affected values* as possibly-stale, not only the version string. (Here the cover said v4.0 while every page said v3.0, and the v4.0 change log listed changes to the very authority/capacity/franquicia numbers extracted off v3.0 pages.)
5. **Mechanical before model.** Anything a deterministic script can do (segment text by a repeating anchor, hash-compare duplicates, extract a grid, check a number appears on a page) must be done by a script, not by a language model. Scripts are cheap, exhaustive, and re-runnable; model passes are expensive and non-deterministic. Reserve the model for genuine interpretation. This single discipline is what makes the work both affordable and trustworthy.
6. **The bulkiest, most fidelity-critical content must be extracted mechanically, not retyped.** Hand-transcription of long contract text by a model introduces silent drift. Slice it with a parser over the text layer instead, and keep the slices verbatim.
7. **Keep every intermediate.** Page-anchored text dumps, parser outputs, table dumps, rendered page images, recovered subagent transcripts. They make verification reproducible and let you re-derive any step without re-running everything.
8. **Preserve enumerated structure — never collapse a list into prose.** When a normative unit contains an enumerated list (prohibited conditions, exclusions, sub-cases, a "the following may not be…" list), extract **each item as a discrete element** carrying its own verbatim text and anchor — not a one-line summary like "lists several prohibited conditions." A prose summary silently drops the items a downstream consumer (or a later executor) must act on individually; the list *is* the logic. (Here, capturing R-097's prohibition list as structured items — rather than its header sentence — is what later let each item be acted on faithfully; had only the header been extracted, the items would have been lost.)

---

## §1. Reconnaissance — *observe before you structure* (the most important section)

**The mistake to avoid:** opening the document and immediately starting to build "a decision tree" (or any other preconceived artifact) because that is what was asked for in the abstract. That imposes a shape. Instead, spend the first effort answering *what kind of thing each document is*, because the answer dictates the representation. **What you observe matters less than the categories you think to observe in** — those categories are what transfer to the next manual. Below is the taxonomy to run through, each with the question it answers and what its answer changes downstream.

### 1.1 The observation taxonomy (run through every category, cheaply, before modeling)

For each: *what to look for · why it matters · how to detect it in minutes · what it changes.*

1. **Document nature — is this normative or descriptive?**
  - *Look for:* Does the text *decide* things (eligibility, thresholds, authority, who-may-do-what) or *describe* things (contract terms, definitions, coverage wording)? A manual that says "vehicles older than 20 years are excluded *unless*…" is decision-shaped. A clause that says "the Insurer shall indemnify…" is contract text.
  - *Why it matters:* this is the single biggest driver of representation shape (§2). Decision-shaped → rules/tables/trees. Contract-text-shaped → registry + verbatim + structured skeleton, **not** a tree.
  - *Detect:* read the table of contents and skim 3–4 representative pages of each document.
  - *Changes:* the entire artifact set for that document.
  - *(This project: one document was underwriting guidelines = normative; the other was a registered-clause bundle = contract text. They got deliberately different structures. This was the core judgment — see decisions.md D1.)*
2. **Extractability of the text layer.**
  - *Look for:* Is there a real text layer or is it scanned images? Are there garbled regions (formulas, tables, ligatures, multi-column flows that interleave)?
  - *Why:* determines whether you can parse mechanically at all, and flags spots needing an image-render fallback (§3.5).
  - *Detect:* extract the text per page and scan for an explicit "no extractable text" sentinel; eyeball a page known to contain a formula or a complex table.
  - *Changes:* whether you need OCR, and which specific pages need visual transcription rather than text-layer transcription.
  - *(This project: clean text layer, 0 scanned pages — but the loss-ratio formula on one page came out as scrambled character soup and had to be transcribed from a render.)*
3. **The document's own identity system.**
  - *Look for:* Does the document assign IDs to its units? Registration codes, clause numbers, article numbers, section codes? Is there a numbering scheme with a discernible structure?
  - *Why:* **if the document has an identity system, that system defines your unit of extraction and your primary key.** Do not invent your own keys when the document already has authoritative ones. Gaps in the numbering are themselves facts to record.
  - *Detect:* grep for repeating label patterns (`Código Asignado`, `Artículo \d+`, `Cláusula \d+`, `Sección [IVX]+`). Count distinct values; look for ranges and gaps.
  - *Changes:* the registry key, the dedup strategy, what "one entry" means.
  - *(This project: every registered text carried a "Código Asignado" APS line. That code — not the title, not page order — became the clause's identity. 152 distinct codes; gaps at 2025/2131/2146 recorded as facts.)*
4. **Structural regularity & segmentation anchors.**
  - *Look for:* Is there a line that repeats at the start of every unit (a code line, a heading keyword, a horizontal rule)? Consistent? Or irregular (mixed casing, wrapped titles, stacked headings)?
  - *Why:* a reliable repeating anchor lets you segment the whole document with one parser. Irregularity tells you how much parser iteration to budget.
  - *Detect:* grep the candidate anchor; check whether its count matches your expected unit count; sample the messy cases.
  - *Changes:* the parser design and how many iterations it will take to get clean.
  - *(This project: the code line was the anchor — but it appeared in three casings, sometimes with the title wrapped across lines or stacked above it. The parser took ~4 iterations and a case-insensitive fix that revealed 4 additional codes initially missed.)*
5. **Redundancy & reprints.**
  - *Look for:* Is the same unit printed more than once? Are the reprints identical, or do they differ (whitespace, signature casing, form-field blanks, or — critically — *substantive wording*)?
  - *Why:* redundancy must be collapsed *without hiding it*. Identical reprints → one entry, all locations listed. Differing reprints → classify the difference; if substantive, **keep both texts** and flag a conflict.
  - *Detect:* hash the normalized text of each occurrence of a repeated key; diff the ones whose hashes differ.
  - *Changes:* registry cardinality, the conflict list.
  - *(This project: 57 codes printed >1×; 44 identical, 13 differing → 10 "presentational", 2 "form-template", and 1 genuinely substantive (clause 2023, two incompatible conditions under one code) preserved as both texts + a flagged conflict.)*
6. **Self-inconsistency signals.**
  - *Look for:* version numbers that disagree across cover/header/info-table; a table of contents whose numbering diverges from the body; values that contradict each other; deadlines or thresholds that differ by context; a sentence that promises "three things" and lists two.
  - *Why:* these are exactly the facts a faithful extraction must surface and a careless one will average away. They are gold for the consumer because they flag where the source itself is unreliable.
  - *Detect:* note every number that looks like it should match another and check; read the TOC against the body numbering; watch for "N items" claims.
  - *Changes:* a dedicated `structural_inconsistencies` / `conflicts` section; how rules cite numbering.
  - *(This project: cover said "VERSIÓN 4.0", every page header said "Versión 3.0"; TOC numbering ≠ body numbering; §6 announced "tres extensiones" and described two. All recorded, none resolved.)*
7. **Cross-reference density (pointers out).**
  - *Look for:* references to *other* documents, annexes, systems, forms, and laws (other manuals, registries, software platforms, statute articles).
  - *Why:* these are required deliverables in their own right (the consumer needs the map of external dependencies) and must be tagged distinctly from operative logic. Some targets are inside the bundle; most are not.
  - *Detect:* grep for law citations (`Código de Comercio`, `Ley \d+`, `Decreto`, article numbers), system names, "Manual de…", "Anexo …", "Formulario …".
  - *Changes:* a `cross_references` artifact per document; an availability tag (in-bundle vs external).
8. **Supplementary / non-operative content worth keeping.**
  - *Look for:* definitions, worked examples and illustrative cases (even ones that will never appear in a decision path), change logs / version history, effective dates, glossaries.
  - *Why:* these are valuable to downstream features and are an *explicit, required* exception to "keep it minimal." Capture them in full — but tag them so they are unmistakably distinct from core decision logic.
  - *Detect:* the change-history table, "por ejemplo" / example callouts, a definitions section.
  - *Changes:* a `supplementary` artifact + `material_class` tags throughout.
9. **Language & translation-fidelity risk.**
  - *Look for:* the working language; terms of art whose meaning would shift if translated (`franquicia deducible`, `plaza de circulación`, `prima ganada`).
  - *Why:* translating normative terms can change meaning. Keep original-language terms verbatim in the operative fields; translate only in human-facing prose, never in the canonical value.
  - *Changes:* a project-wide rule that operative text stays in the source language.
10. **Authorship & production artifacts.**
  - *Look for:* embedded editor comments (Word "Comentado […]"), tracked-change residue, format marks ("Con formato…"), form-field placeholders (`XX`, `XXXX`, blank underscores), personal data (names in authority tables).
    - *Why:* these are real bytes in the source. Don't silently delete them (that's editing the source) and don't promote them into operative content (that's inventing). Strip from the operative field, preserve in an artifacts field, note them.
    - *Changes:* a `source_artifacts` section; a `word_comments` field; how you treat form blanks.

### 1.2 The triage questions the recon pass must answer (write the answers down)

Before building anything, produce a short scoping note answering these. They are the same for any manual:

- **Q1.** What *kind* of document is each one — normative/decisional, contract-text, reference/tariff, or a hybrid? *(Drives §2.)*
- **Q2.** Is the text layer usable, and which specific regions need a visual fallback?
- **Q3.** Does the document carry its own identity system? If so, what is the unit and the primary key, and where are the gaps?
- **Q4.** What is the reliable segmentation anchor, and how irregular is it?
- **Q5.** Is anything printed more than once, and do reprints agree?
- **Q6.** Where does the document contradict itself or other documents?
- **Q7.** What does it point to outside itself?
- **Q8.** What non-operative material (definitions, examples, change log, dates) must be captured and tagged?
- **Q9.** Which terms must stay in the original language?
- **Q10.** What production artifacts are present that must be neither deleted nor promoted?
- **Q11.** *Decisive:* for each document, **is a decision tree actually the right shape, or would building one require inventing logic the source doesn't state?** If the latter, do not build a tree (see §2).

Record assumptions and proceed; only stop for genuinely blocking input (source you cannot access, or a contradiction you cannot even represent). Everything else is decidable and should be decided and logged.

### 1.3 Output of reconnaissance

A written `decisions.md` (start it now, grow it as you go) stating, per document: its nature, the shape you'll build and **why**, the unit/key, the anchoring convention, and any blocking ambiguities. This file is where reasoning lives — not in chat, not in code comments.

---

## §2. The shape decision — choosing the representation per document

Run this decision for each document independently. **Different documents in the same project will usually get different shapes; resist the urge to make them uniform.**

- **Is the content decision-shaped (conditions → outcomes, thresholds, authority, branching)?**
→ Build a **rule registry** (atomic, quote-anchored condition→outcome units) + **parameter tables** (verbatim grids and bracket tables) + **decision trees** *only where the source itself branches*.
- **Is the content contract text / wording whose authority is the exact language?**
→ Build a **registry keyed by the document's own IDs** + **mechanically-extracted verbatim text files** (canonical) + a **structured decomposition of the base/common terms** (definitions, dispositions, obligations, exclusions, coverage sections) with each element anchored. **Do not build a decision tree** — its "logic" is the wording, and a tree would require inventing evaluation order the source never states.
- **Is it a tariff/reference table?**
→ Verbatim tables with provenance, plus selector conditions exactly as stated.

**When NOT to build a decision tree (critical):**

- Build a tree node *only* where the source presents a genuine branch (an explicit gate, an "unless…" exception with stated lift-conditions, outcome bands over a variable). Mirror the source's own branch structure.
- Keep as a **table**, not a tree, anything that is a pure lookup (authority matrices) — there is no branching beyond the lookup.
- **Never invent a "master router."** If the document describes several procedures/segments but never defines a global precedence or routing algorithm over them, do not synthesize one. Provide the per-branch logic the source supports and stop. Inventing the connective tissue is the most tempting and most damaging accuracy violation.
- Where a value is genuinely under-determined by the source (overlapping bands, an open interval left unassigned), encode what's written and **flag the gap** rather than closing it.

*(This project: the manual got rules + 24 tables + 4 trees (eligibility ×2, renewal bands, retroactivity) — and explicitly **no** master "which procedure does this risk follow" router, because the source never defines one. The clause bundle got a registry + 168 verbatim files + a structured base policy, and **no tree at all**. See decisions.md D1–D2.)*

---

## §3. Mechanical extraction pipeline (deterministic, model-free, re-runnable)

Do all of this with scripts. No model in the loop yet.

### 3.1 Tooling bootstrap

- Establish a PDF text+table+render stack (this project used `pdfplumber` for text/tables, `pypdf` for page counts/metadata, `pypdfium2` for page rendering; install on demand). Confirm the interpreter and that imports work before relying on them.
- Watch for hostile filenames (this project's PDFs contained a colon: `AUTOMOTORES.:underwriter_manual.pdf`). Always quote paths.

### 3.2 Page-anchored text extraction (the foundation everything else checks against)

- Extract text **per page**, writing an explicit page marker between pages (e.g. `===== PAGE n =====`). This page-anchored dump is the artifact every later check verifies against — it is the bridge between the binary PDF and every anchor you emit.
- Scan the output for a "no extractable text" sentinel to detect scanned/image pages up front.
- Keep these dumps (`source_text/*.txt`); they are your auditable intermediate.

### 3.3 Segment by the document's own anchor; iterate against invariants

- Write a parser that splits on the identity/anchor line found in recon. Collect each unit's title (walk upward over the lines above the anchor; handle uppercase headings, Title-Case keyword lines, parentheticals, and *wrapped* and *stacked* titles).
- Strip **only** page furniture (your own page markers, the repeated page-top boilerplate header) and record that boilerplate once. **Keep** everything that is part of the unit (including signature blocks, form blanks).
- **Iterate the parser against invariants, not vibes.** After each run, check: Does the distinct-key count match expectation? Are there empty titles? Did any unit body swallow the next unit's heading (contamination)? Are the ID gaps the same ones you expected? Re-run until these are clean. Make the anchor match **case-insensitive** and tolerant of punctuation variants — casing/dash differences silently hide units. *(This project: the case-insensitive fix alone surfaced 4 codes the first parser missed, moving 148→152.)*

### 3.4 Detect and classify redundancy mechanically

- For every key that occurs more than once, hash the whitespace-normalized body; group by hash. Identical hashes → one canonical text (first print), all locations recorded. Differing hashes → run a real diff and **classify** the difference: presentational (casing/spacing/signature), form-template (same operative wording, different fill-in fields), or **substantive** (operative wording differs → keep all texts, flag conflict).

### 3.5 Tables and garbled regions

- Extract tabular data with a table extractor **and** cross-check it against the raw text layer (the two disagree often enough that one catches the other's errors).
- For any region the text layer mangles (formulas, dense grids), **render the page to an image and transcribe visually**, and record that you did so (with the image kept as an intermediate). Never ship a garbled text-layer value when a render is legible.

### 3.6 Keep the intermediates

- Anchors file, segmented-records file, table dumps, render PNGs. These prove the pipeline and make §5 reproducible.

---

## §4. Derived layer — using subagents for the interpretation a parser can't do

The parser gives you verbatim, segmented, anchored text. The *derived* layer (categories, effect summaries, normalized parameters, what-each-unit-modifies) needs judgment. Use subagents — but under strict discipline.

### 4.1 Reader-subagent doctrine (for *producing* derived data)

- **Context-free and parallel.** Each reader gets only the slice it needs (a batch of units' verbatim texts) and a rigid output schema. They run concurrently.
- **Schema-constrained, no-inference.** The prompt must demand: copy numbers exactly as written; take usage restrictions only from explicit text; never infer scope the text doesn't state; record anomalies (typos that change meaning, blanks, embedded comments) rather than fixing them. Provide the exact JSON object shape and insist the final message be *only* that JSON.
- **Batch sizing.** ~30–36 units per reader is a good balance (enough to amortize, small enough to stay accurate and to fit output limits).
- **The verbatim text remains canonical.** The reader's output is enrichment that travels *next to* the text, tagged derived — it never replaces it.

### 4.2 Output handling (these *will* bite you)

- Subagent final messages can arrive **truncated** through the orchestration channel. Recover the full output from the agent's transcript file (parse the JSONL, take the last assistant text block(s); if the answer was split across messages, concatenate them; scan for the largest *valid* JSON array via incremental decoding).
- **Protect at-risk intermediates.** If there's any chance a later agent or step overwrites a freshly-recovered file, copy it to a `_GOOD` sidecar and hash-compare before trusting the original.
- Merge derived data into the registry **keyed by the document's ID**, not by array position — positions drift, keys don't.

---

## §5. Verification — the core of trustworthiness (three layers)

Verification here means *confirming each element matches the source and carries its anchor* — **not** writing unit tests. Build the cheap exhaustive layer first; spend model budget only on what it can't reach.

### 5.1 Layer 1 — Mechanical harness (deterministic, in-session, ~100% coverage, near-zero cost)

A single script that, against the page-anchored text dumps, checks:

- **JSON validity & structural invariants:** every artifact parses; entry counts, print counts, file counts match expectation; every internal cross-reference (`table_ref`, `tree_ref`, text-file pointer) resolves; no duplicate IDs; no dangling references.
- **The verbatim layer, exhaustively:** every `quote` of every rule; every exclusion text and lift-condition in every tree; every cell of each *verbatim* table and every numeric/value token of each *digest* table; every definition, disposition block, obligation, and section parameter; every registry title at its first-print page; the head of every verbatim text file at its recorded pages; every cross-reference quote. Each must be found on (or within ±1 page of) its cited page.
- **Segmentation forensics:** re-derive the ID inventory and gaps; re-run the duplicate hash+diff classification.

**False-positive discipline (essential):** when the harness flags a mismatch, first ask whether the *checker* is wrong before "fixing" the data. Common checker bugs: not stripping page-furniture/boilerplate before matching; treating an *editorial* digest-row label as if it were verbatim source; over-tight whitespace/accent/quote normalization. **Fix the checker when the checker is wrong; fix the data when the data is wrong. Never "fix" correct data to silence a bad check.** *(This project: an initial 41 "failures" were almost all checker artifacts; the one real issue was a table value sourced from a different page than cited — fixed by adding a per-row source anchor, plus a genuine refinement: splitting tables into `verbatim_table` vs `parameter_digest` provenance classes because digest labels are editorial while their values are verbatim.)*

### 5.2 Layer 2 — Semantic subagents (fresh-context, adversarial, judgment-only)

- **Fresh context, no build memory.** A verifier that helped build the artifact will subconsciously confirm it. Spawn verifiers that have *never seen* the construction. Tell them so.
- **Tell them what's already verified** so they don't waste effort: "quotes/anchors/numbers are machine-verified; your only job is meaning-distortion." Focus them on: added scope, dropped conditions/qualifiers, wrong actor (e.g. an insurer's discretionary *right* mislabeled as a *condition on the insured*), inverted logic, and normative content present in the cited section but omitted from the structured reading.
- **Judge derived-against-canonical.** Give each verifier the derived field and the canonical verbatim text and ask only whether the former faithfully renders the latter.
- **Structured verdicts.** Demand a machine-parseable result (e.g. a JSON array of `{code, verdict, issues[]}`), one entry per unit, so you can apply fixes systematically.
- **Full vs sampled, then close the gap.** A full pass over the smaller/normative artifact (every rule, every tree); at minimum a sample over the bulk derived layer — **then extend to 100% if the deliverable is a foundation others will build on.** The sample exists to tell you the error *rate*; if it's non-zero, the rest very likely hides more of the same, so finish the sweep. *(This project: the 12-unit clause sample found 1 mislabel; extending to all 132 remaining found 13 more of exactly that family — insurer-rights-as-conditions and dropped qualifiers — none of which a mechanical check could ever catch.)*

### 5.3 Layer 3 — Coverage

- **Section coverage:** every body section/unit of the source is claimed by at least one artifact element. Find the orphans mechanically (set-difference of source sections vs cited sections) and either extract them or justify the omission.
- **Completeness sweep:** a verifier whose only job is to find normative statements in the source with *no* counterpart in the representation.

### 5.4 The fix-then-reverify loop

- Collect all verifier findings, apply them in one consolidated pass (so the registry/base policy get a single coherent edit), then **re-run the mechanical harness on the changed content** — especially re-confirming that any newly-restored qualifier is itself verbatim-present in the source. Log every finding and its disposition in `verification_report.md`, and state plainly what remains unverified and why.

### 5.5 Two principles that make verification trustworthy (transferable to any harness)

- **Prove your checker is load-bearing — don't trust a green you haven't tried to break.** A check that passes proves nothing until you've shown it *fails* on the fault it claims to guard. **Mutation-test the harness itself:** inject the exact mistake you fear into an *in-memory copy* of the data (flip an inclusivity, drop a qualifier, delete a flag, nudge a threshold) and confirm a check goes red; any surviving mutation is a vacuous check — a blind spot to close. Always test against a **copy**; never mutate the canonical artifacts to run a test, and keep a **golden snapshot** of current results as a regression guard.
- **If the representation will be *executed*, "matches the source" is not the finish line.** A faithful extraction can still be mis-served by its consumer: a conflict can be *represented in the data but never read by the executor*, so it surfaces on zero outputs (a silent omission). When the artifact is compiled into anything runnable (a decision graph, a rules engine), add an **execution-fidelity layer**: prove the consumer never silently resolves a represented conflict — every conflict must reach the output as an escalation or a loud caveat, or be explicitly justified as non-executable. The full dynamic method (snapshot · property/fuzz sweeps · mutation testing · conflict-coverage cross-audit) is in `Crawlable_Conversions.md` §7b; the worked run is `troubleshoot testing/STRESS_REPORT.md` + `verification_report.md` §4c.
- **A *classification* is a verification target, not just the presence of a flag — re-judge tags with multi-vote, perspective-diverse review.** When you tag something (a conflict's handling tier, a provenance class, a material class), the *tag itself* can be wrong even when the thing is correctly captured. Re-judge tags with a fresh-context **multi-vote** pass using **diverse adversarial lenses** — one reviewer hunts under-classification (a caveat that should block/escalate), one over-classification, one mis-filing (executable logic filed as "reference"). Identical reviewers mostly agree; diverse lenses catch errors in opposite directions. Then **represent any dissent rather than auto-applying it**: flipping a tag on a minority opinion silently resolves a call the document owner should make. (In the run, three lensed verifiers confirmed 9/11 conflict tiers and surfaced two a single agreeable pass would have rubber-stamped — one caveat possibly shipping an unsupported accept, one "reference" item that was actually executable underwriting logic.)

---

## §6. Agent & subagent doctrine (consolidated)

- **Two distinct roles, never blurred:** *reader/producer* subagents (build the derived layer; context-free; schema-bound) and *verifier* subagents (check; fresh-context; adversarial; told what's already proven). A unit's producer must never be its verifier.
- **Context-free by default.** Hand each agent exactly the slice it needs and a precise contract. Less context = less drift = more parallelism = cheaper.
- **The orchestrator does the deterministic work in-session.** Don't spend an agent on anything a script can check. The mechanical harness is the orchestrator's job; agents are for judgment only.
- **Parallelize independent work** in one batch of tool calls; keep batches sized to fit output limits and to keep each agent's task crisp.
- **Single-vote caveat.** Each item here got one verifier pass. For the highest-stakes findings (a flagged conflict, a value that drives money), consider *multi-vote adjudication* — N independent verifiers, majority rules — to catch the verifier's own errors. Recorded as a known residual.
- **Recover, don't re-run.** When an agent's channel output is truncated or it dies, reconstruct from its transcript before spending tokens redoing the work.

---

## §7. Resilience — failure modes and recovery

These happened (or were guarded against) in this project; expect them.

- **Mid-run interruption (budget/credit/session freeze).** Two freezes hit here — one mid-file-write, one with parallel agents running. **Before resuming anything, run a forensic diagnostic:** (a) re-validate every JSON in the workspace (parse + non-empty); (b) confirm in-flight outputs are complete (expected object counts, last object closes cleanly); (c) hash-compare any protected copy against its original; (d) reconstruct the write timeline from file mtimes; (e) scan for unexpected or post-checkpoint writes. Only after confirming integrity do you continue. *(Result here: writes were atomic `json.dump` calls — nothing was half-written; the killed verifiers were read-only and touched nothing. Confirmed, not assumed.)*
- **Atomic writes by construction.** Write whole files in one operation (`json.dump` of a fully-built object), so an interruption leaves either the old file or the new one — never a half-file. This is *why* the freeze caused no corruption.
- **Truncated/garbled agent channel output.** Recover from the transcript (§4.2).
- **Stray/mis-targeted agent.** Protect freshly-built files with `_GOOD` sidecars; verify by hash.
- **Parser drift across iterations.** Guard with invariant re-checks after every parser change (counts, contamination, gaps), not eyeballing.
- **Checker false positives.** §5.1 — distinguish a wrong check from wrong data; never silence a correct check by degrading data.

---

## §8. Deliverable structure & self-audit checklist

**Structure that worked (adapt names to the domain):**

```
representation/
  <normative_doc>/
    document.json        identity, version/change log, structural inconsistencies, source artifacts
    rules.json           atomic, quote-anchored condition→outcome units (+ table_ref/tree_ref)
    tables.json          verbatim grids + digests, each provenance-tagged and anchored
    decision_trees.json  trees ONLY where the source branches
    cross_references.json pointers out (tagged availability)
    supplementary.json   products, examples, glossary, dates (material_class-tagged)
  <contract_text_doc>/
    document.json        bundle map, code system, reprint/conflict analysis
    <unit>_registry.json one entry per source ID; prints[], variant class, derived (tagged) fields
    <unit>_texts/        verbatim text per ID (canonical); split per print where prints differ
    base_policy.json     structured common terms (definitions, dispositions, obligations, exclusions, sections)
    cross_references.json
  linkage.json           map between documents (with match-confidence + tensions)
decisions.md             every design choice + rationale (+ what was rejected)
verification_report.md   method, findings, dispositions, and the honest residual-risk boundary
README.md                what each artifact is and how to consume it
```

**Self-audit before declaring a draft done:**

- [ ] Every artifact parses; every internal reference resolves; counts match.
- [ ] Every derived field is tagged derived and sits beside its verbatim source.
- [ ] Every element is anchored (section/clause/page + quote where applicable).
- [ ] Every conflict/ambiguity/self-inconsistency is represented and flagged, none silently resolved.
- [ ] No invented connective logic (no master router, no closed band where the source left it open).
- [ ] Mechanical harness: 0 real failures.
- [ ] Semantic pass: complete (or sampled with the residual stated and the error-rate known).
- [ ] Section coverage: every source section claimed or its omission justified.
- [ ] `decisions.md`, `verification_report.md`, `README.md` present; residual risk stated plainly.
- [ ] Original-language terms preserved in operative fields; production artifacts neither deleted nor promoted.

---

## §9. Generalization notes — what transfers vs what was specific

**Transfers to any manual (the method):** the recon taxonomy (§1) and triage questions; mechanical-before-model; verbatim-canonical/derived-tagged; anchor-everything; represent-don't-resolve; the three-layer verification with false-positive discipline; reader-vs-verifier agent split; atomic writes + forensic-resume.

**Was specific to *this* project (re-derive for a new one — don't assume):** the "Código Asignado" key and its 2001–2147 range; the −7 PDF-to-printed page offset; the particular reprint triples; the specific conflicts (clause 2023, v3.0/v4.0, the four "flota" thresholds); the exact section numbers; the Spanish terms of art. A new manual will have *its own* identity system, *its own* inconsistencies, *its own* shape — **run §1 fresh on it.** The wrong move is to carry this project's *answers* forward; the right move is to carry its *questions* forward.

**First moves on a new manual:** (1) extract page-anchored text and check extractability; (2) find the identity system and the segmentation anchor; (3) answer the §1.2 triage questions in a new `decisions.md`; (4) decide each document's shape per §2 *before* building; (5) only then start the mechanical pipeline.

---

## Appendix A — Reconnaissance command kit (concrete, language-agnostic patterns)

- **Page counts / metadata:** load with a PDF lib, print page count and any embedded metadata.
- **Page-anchored extraction:** iterate pages, write `===== PAGE n =====` + `page.extract_text()`; flag pages whose text is empty/whitespace as candidate scans.
- **Identity-system hunt:** `grep -niE '^(código asignado|artículo|cláusula|sección|anexo)\b'` — count distinct values, find min/max and gaps.
- **Anchor-count sanity:** count anchor lines vs your expected unit count; investigate any delta (often a casing/punctuation variant hiding units).
- **Reprint detection:** per repeated key, SHA-1 the whitespace-normalized body; group; diff the hash-differing groups with a sequence matcher.
- **Self-inconsistency probes:** grep version strings across cover/header/info-table; diff TOC numbering against body headings; list every "N " claim and check the count.
- **Cross-ref harvest:** `grep -niE 'ley [0-9]|código de comercio|decreto|artículo [0-9]|manual de|anexo |formulario '`.
- **Garbled-region triage:** render a suspected page to PNG at ≥2× scale and read it visually; compare to its text-layer slice.

## Appendix B — Subagent prompt templates

**Reader (producer), context-free:**

> You are a careful  reader. Work ONLY from the files given; never infer beyond the literal text. Language: ; keep terms verbatim. For each unit in , read its text file and emit one JSON object: {id, category, effect_type[], modifies_target|null, modifies_quote|null, usage_restriction_verbatim|null, named_parties[], summary, parameters[{name,value_verbatim,context_quote}], conditions_precedent[], references[], anomalies[]}. Rules: copy numbers EXACTLY; usage_restriction only if explicitly present; never add scope; record (don't fix) typos/blanks/embedded comments in anomalies. Output ONLY the JSON array.

**Verifier (checker), fresh-context, adversarial:**

> You are a fresh-context verifier with NO knowledge of how these artifacts were built. Quotes, anchors, and numbers are ALREADY machine-verified — do NOT re-check them. Your ONLY job: does the derived classification faithfully render its canonical verbatim text? Flag added scope, dropped conditions/qualifiers, wrong actor (e.g. an insurer right mislabeled as a condition on the insured), inverted logic, or omitted normative content. Judge each unit against its text file only. Output ONLY a JSON array: [{id, verdict:"ok"|"issue", issues:[precise, text-citing descriptions]}], one entry per unit.

**Completeness auditor:**

> Read the source pages and list every normative statement (rule, threshold, prohibition, authority, deadline, tariff) that has NO counterpart in the representation. Coverage only — do not check correctness of what exists. Quote each gap with its page.

## Appendix C — Mechanical-harness checklist (what the deterministic script must assert)

1. All JSON parses; no empty/zero-byte artifacts.
2. Entry/print/file counts equal expected; ID inventory and gaps as expected.
3. Every `*_ref` and text-file pointer resolves; no duplicate IDs; no dangling links.
4. Every rule/tree quote present on its cited page (±1).
5. Every verbatim-table cell present on its page; every digest-table value-token present on its page.
6. Every definition / disposition / obligation / section parameter present at its anchor.
7. Every registry title present at its first-print page; every text-file head present at its recorded pages.
8. Every reprint group re-hashed and re-classified identically to the registry's claim.
9. Boilerplate/page-furniture stripped *in the checker's normalization*, not just the data, before matching (false-positive guard).
10. Re-run after every correction; a fix that doesn't re-pass isn't done.

